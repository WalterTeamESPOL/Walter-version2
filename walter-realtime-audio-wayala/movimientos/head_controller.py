"""
Control persistente de la cabeza de Walter.

Electron inicia este proceso una sola vez y Python
mantiene abierto el puerto serial durante toda la
ejecución de Walter.

Estados:

    IDLE
        usa test_all.txt

    SPEAKING
        usa hablando.txt

Comandos recibidos desde Electron:

    MODE IDLE
    MODE SPEAKING
    CENTER
    STATUS
    EXIT
"""

from __future__ import annotations

import os
import sys
import threading
import time

from pathlib import Path
from typing import Dict, List

import serial


# =====================================================
# CONFIGURACIÓN
# =====================================================

BASE_DIR = Path(__file__).resolve().parent

DEFAULT_PORT = (
    "COM3"
    if os.name == "nt"
    else "/dev/ttyUSB0"
)

PORT = os.getenv(
    "WALTER_HEAD_PORT",
    DEFAULT_PORT
)

BAUDRATE = int(
    os.getenv(
        "WALTER_HEAD_BAUDRATE",
        "1000000"
    )
)


# =====================================================
# MOVIMIENTOS DISPONIBLES
# =====================================================

MODE_CONFIG = {
    "IDLE": {
        # Movimiento que ya probaste.
        "file": BASE_DIR / "hablando.txt",
        # Tiempo entre posiciones.
        "frame_delay": 0.8,
        # Espera antes de repetir.
        "loop_delay": 7.0,
    },

    "SPEAKING": {
        # Movimiento pequeño mientras habla.
        "file": BASE_DIR / "test_all.txt",

        "frame_delay": 0.35,

        "loop_delay": 0.45,
    },
}


# =====================================================
# ESTADO GLOBAL
# =====================================================

serial_port: serial.Serial | None = None

running = True

current_mode = "IDLE"

mode_changed = threading.Event()

state_lock = threading.Lock()


# =====================================================
# LOG
# =====================================================

def log(message: str) -> None:

    print(
        message,
        flush=True
    )


# =====================================================
# LEER ARCHIVOS DE MOVIMIENTO
# =====================================================

def load_frames(
    file_path: Path
) -> List[bytes]:

    frames: List[bytes] = []

    with file_path.open(
        "r",
        encoding="utf-8"
    ) as file:

        for (
            line_number,
            raw_line
        ) in enumerate(
            file,
            start=1
        ):

            line = raw_line.strip()

            if not line:
                continue

            values = [
                value.strip()
                for value
                in line.split(";")
            ]

            if len(values) != 10:

                raise ValueError(
                    f"{file_path.name}, "
                    f"línea {line_number}: "
                    "se esperaban 10 valores "
                    f"y llegaron {len(values)}."
                )

            operation_id = int(
                values[0],
                16
            )

            positions = [
                int(value)
                for value
                in values[1:]
            ]

            frame_values = [
                operation_id,
                *positions
            ]

            if any(
                value < 0 or value > 255
                for value
                in frame_values
            ):

                raise ValueError(
                    f"{file_path.name}, "
                    f"línea {line_number}: "
                    "los valores deben estar "
                    "entre 0 y 255."
                )

            frames.append(
                bytes(frame_values)
            )

    if not frames:

        raise ValueError(
            f"{file_path.name} "
            "no contiene movimientos válidos."
        )

    return frames


# =====================================================
# CARGAR MOVIMIENTOS
# =====================================================

MOVEMENTS: Dict[
    str,
    List[bytes]
] = {

    mode: load_frames(
        config["file"]
    )

    for mode, config
    in MODE_CONFIG.items()
}


# Primera posición del movimiento idle = centro.
CENTER_FRAME = MOVEMENTS["IDLE"][0]


# =====================================================
# PUERTO SERIAL
# =====================================================

def open_serial() -> None:

    global serial_port

    serial_port = serial.Serial(

        port=PORT,

        baudrate=BAUDRATE,

        bytesize=8,

        timeout=1,

        stopbits=serial.STOPBITS_ONE,
    )

    log(
        "WALTER_HEAD_READY "
        f"port={PORT} "
        f"baudrate={BAUDRATE}"
    )


# =====================================================
# ENVIAR TRAMA
# =====================================================

def send_frame(
    frame: bytes
) -> None:

    if (
        serial_port is None
        or not serial_port.is_open
    ):

        raise RuntimeError(
            "El puerto serial de la "
            "cabeza no está abierto."
        )

    serial_port.write(frame)

    serial_port.flush()


# =====================================================
# CENTRAR
# =====================================================

def center_head() -> None:
    send_frame(
        CENTER_FRAME
    )
    log(
        "WALTER_HEAD_CENTERED"
    )


# =====================================================
# ESTADO
# =====================================================

def get_mode() -> str:
    with state_lock:
        return current_mode

def set_mode(
    mode: str
) -> None:

    global current_mode
    normalized = (
        mode
        .strip()
        .upper()
    )

    if normalized not in MODE_CONFIG:
        log(
            "WALTER_HEAD_ERROR "
            f"invalid_mode={normalized}"
        )

        return

    with state_lock:
        if current_mode == normalized:
            return
        current_mode = normalized

    # Despierta inmediatamente al worker.
    # De esta forma no tiene que esperar
    # a que termine todo el movimiento.
    mode_changed.set()

    log(
        f"WALTER_HEAD_MODE {normalized}"
    )


# =====================================================
# ESPERA INTERRUMPIBLE
# =====================================================

def wait_for_change(
    seconds: float,
    expected_mode: str
) -> bool:

    changed = mode_changed.wait(
        timeout=max(
            0.0,
            seconds
        )
    )

    if changed:

        mode_changed.clear()

    return (
        changed
        or get_mode() != expected_mode
    )


# =====================================================
# WORKER DE MOVIMIENTO
# =====================================================

def movement_worker() -> None:
    while running:
        mode = get_mode()
        config = MODE_CONFIG[mode]
        frames = MOVEMENTS[mode]
        log(
            f"WALTER_HEAD_SEQUENCE {mode}"
        )

        try:
            for frame in frames:
                if not running:
                    return

                # Si Walter cambió de estado
                # dejamos esta secuencia.
                if get_mode() != mode:
                    break

                send_frame(
                    frame
                )

                # Espera entre posiciones,
                # pero puede ser interrumpida.
                if wait_for_change(
                    config["frame_delay"],
                    mode
                ):
                    break

            else:
                # Solo ocurre si terminó
                # todo el movimiento.
                if wait_for_change(
                    config["loop_delay"],
                    mode
                ):
                    continue

        except Exception as error:
            log(
                "WALTER_HEAD_ERROR "
                f"movement={error}"
            )
            time.sleep(
                0.5
            )


# =====================================================
# STATUS
# =====================================================

def command_status() -> None:
    connected = bool(
        serial_port
        and serial_port.is_open
    )
    log(
        "WALTER_HEAD_STATUS "
        f"port={PORT} "
        f"connected={connected} "
        f"mode={get_mode()}"
    )


# =====================================================
# CERRAR
# =====================================================

def shutdown() -> None:
    global running
    global serial_port
    running = False
    mode_changed.set()
    if (
        serial_port is not None
        and serial_port.is_open
    ):
        try:
            center_head()
        except Exception:
            pass
        serial_port.close()

    log(
        "WALTER_HEAD_EXIT"
    )

# =====================================================
# MAIN
# =====================================================

def main() -> int:
    try:
        open_serial()

    except Exception as error:
        log(
            "WALTER_HEAD_FATAL "
            f"serial={error}"
        )
        return 2

    worker = threading.Thread(
        target=movement_worker,
        name="WalterHeadMovement",
        daemon=True,
    )
    worker.start()


    # Walter empieza automáticamente
    # moviendo la cabeza en IDLE.
    log(
        "WALTER_HEAD_MODE IDLE"
    )

    try:
        for raw_command in sys.stdin:
            command = (
                raw_command
                .strip()
            )
            if not command:
                continue

            upper_command = (
                command.upper()
            )

            if upper_command.startswith(
                "MODE "
            ):
                set_mode(
                    upper_command.split(
                        maxsplit=1
                    )[1]
                )

            elif upper_command == "CENTER":
                center_head()

            elif upper_command == "STATUS":
                command_status()

            elif upper_command == "EXIT":
                break

            else:
                log(
                    "WALTER_HEAD_ERROR "
                    f"unknown_command="
                    f"{upper_command}"
                )


    except KeyboardInterrupt:
        pass


    finally:
        shutdown()
        worker.join(
            timeout=2.0
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(
        main()
    )