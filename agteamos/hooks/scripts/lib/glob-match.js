'use strict';

/**
 * Glob minimo (sin dependencias) para matchear globs estilo
 * "**\/test_*.py" contra un path relativo. Soporta `**` (cualquier
 * profundidad, incluido cero), `*` (cualquier caracter salvo `/`), y `?`.
 */
function globToRegex(glob) {
  let out = '';
  const normalized = glob.replace(/\\/g, '/');
  for (let i = 0; i < normalized.length; i += 1) {
    const c = normalized[i];
    if (c === '*') {
      if (normalized[i + 1] === '*') {
        // "**" -- opcionalmente seguido de "/"
        let j = i + 2;
        if (normalized[j] === '/') j += 1;
        out += '(?:.*/)?';
        i = j - 1;
      } else {
        out += '[^/]*';
      }
    } else if (c === '?') {
      out += '[^/]';
    } else if ('.+^${}()|[]\\'.includes(c)) {
      out += `\\${c}`;
    } else {
      out += c;
    }
  }
  return new RegExp(`^${out}$`);
}

function matchAny(filePath, globs) {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.?\//, '');
  return globs.some((glob) => globToRegex(glob).test(normalized));
}

module.exports = { globToRegex, matchAny };
