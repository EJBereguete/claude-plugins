'use strict';

/**
 * Lee stdin completo de forma sincrona y lo devuelve como string.
 * Usado por todos los hooks de AgTeamOS: Claude Code entrega el payload
 * JSON del evento por stdin, exactamente igual que los hooks bash que
 * reemplaza este script (antes: `input=$(cat)`).
 */
function readStdinSync() {
  const fs = require('fs');
  try {
    return fs.readFileSync(0, 'utf-8');
  } catch (err) {
    // stdin vacio o no disponible (ej. TTY interactivo) -> tratar como string vacio
    return '';
  }
}

module.exports = { readStdinSync };
