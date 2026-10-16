/*
 * cabezaService.js
 *
 * Recibe desde el display la solicitud de movimiento
 * y ejecuta test_movimientos.py.
 */

const path = require("path");
const { spawn } = require("child_process");

let movimientoEjecutandose = false;

function configurarMovimientoCabeza(io) {
  io.on("connection", (socket) => {
    socket.on("probarMovimientoCabeza", () => {
      if (movimientoEjecutandose) {
        console.log(
          "[Cabeza] El movimiento ya está ejecutándose."
        );
        return;
      }

      movimientoEjecutandose = true;

      const pythonScript = path.join(
        __dirname,
        "test_movimientos.py"
      );

      const pythonCommand =
        process.platform === "win32"
          ? "python"
          : "python3";

      console.log(
        "[Cabeza] Ejecutando movimiento."
      );

      const procesoPython = spawn(
        pythonCommand,
        [pythonScript],
        {
          cwd: __dirname
        }
      );

      procesoPython.stdout.on("data", (data) => {
        const mensaje = data.toString().trim();

        if (mensaje) {
          console.log(
            "[Cabeza Python]",
            mensaje
          );
        }
      });

      procesoPython.stderr.on("data", (data) => {
        const error = data.toString().trim();

        if (error) {
          console.error(
            "[Cabeza Python Error]",
            error
          );
        }
      });

      procesoPython.on("error", (error) => {
        console.error(
          "[Cabeza] No se pudo iniciar Python:",
          error.message
        );

        movimientoEjecutandose = false;
      });

      procesoPython.on("close", (codigo) => {
        movimientoEjecutandose = false;

        console.log(
          "[Cabeza] Movimiento terminado. Código:",
          codigo
        );
      });
    });
  });
}

module.exports = {
  configurarMovimientoCabeza
};