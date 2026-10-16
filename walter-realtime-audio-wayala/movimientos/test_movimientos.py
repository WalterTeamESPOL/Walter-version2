# test_movimientos.py
#
# Repite el movimiento:
# centro -> izquierda -> derecha -> centro
# Espera 7 segundos y vuelve a comenzar.

import time
from pathlib import Path

import serial


# =====================================
# CONFIGURACIÓN
# =====================================

PUERTO_ROBOTIS = "COM3"
BAUDRATE = 1_000_000

TIEMPO_ENTRE_POSICIONES = 0.8
TIEMPO_ENTRE_MOVIMIENTOS = 7

ARCHIVO_MOVIMIENTOS = Path(__file__).with_name(
    "test_all.txt"
)


# =====================================
# LEER MOVIMIENTOS DEL TXT
# =====================================

with open(
    ARCHIVO_MOVIMIENTOS,
    "r",
    encoding="utf-8"
) as archivo:

    lineas = [
        linea.strip()
        for linea in archivo
        if linea.strip()
    ]


# =====================================
# ABRIR PUERTO SERIAL
# =====================================

serial_port = serial.Serial(
    port=PUERTO_ROBOTIS,
    baudrate=BAUDRATE,
    bytesize=8,
    timeout=1,
    stopbits=serial.STOPBITS_ONE
)


try:
    while True:
        print("\nIniciando movimiento de cabeza...")

        for numero_linea, linea in enumerate(
            lineas,
            start=1
        ):
            valores = linea.split(";")

            if len(valores) != 10:
                print(
                    f"Línea {numero_linea} inválida: "
                    "debe contener 10 valores."
                )
                continue

            id_operacion = int(
                valores[0],
                16
            )

            posiciones = [
                int(valor)
                for valor in valores[1:]
            ]

            trama = bytearray([
                id_operacion,
                *posiciones
            ])

            print(
                "Enviando:",
                list(trama)
            )

            serial_port.write(trama)
            serial_port.flush()

            time.sleep(
                TIEMPO_ENTRE_POSICIONES
            )

        print(
            "Movimiento terminado. "
            "Esperando 7 segundos..."
        )

        time.sleep(
            TIEMPO_ENTRE_MOVIMIENTOS
        )


except KeyboardInterrupt:
    print(
        "\nPrueba detenida por el usuario."
    )


finally:
    serial_port.close()

    print(
        "Puerto serial cerrado."
    )