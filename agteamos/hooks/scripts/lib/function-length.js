'use strict';

/**
 * Heuristica de longitud de funcion/metodo, por lenguaje -- NO es un parser
 * real, es deliberadamente simple (ver agteamos-project-docs/code-analysis para
 * el analisis estatico de verdad). Devuelve el span de lineas mas largo entre
 * las lineas indicadas en `touchedLineNumbers` (1-indexed) que pertenece a
 * una funcion nueva o crecida.
 */

const PY_DEF = /^(\s*)def\s+\w+\s*\(/;
const BRACE_FN = /(function\s+\w+\s*\(|=>\s*\{|:\s*\w[\w<>\[\],\s]*\s*\{|\)\s*\{|^\s*(public|private|protected|internal|static|async)?\s*[\w<>,\[\]?]+\s+\w+\s*\([^)]*\)\s*\{)/;
const RUBY_DEF = /^(\s*)def\s+\w/;

function countIndent(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].replace(/\t/g, '    ').length : 0;
}

function longestPythonFunction(lines) {
  let best = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const m = PY_DEF.exec(lines[i]);
    if (!m) continue;
    const baseIndent = m[1].replace(/\t/g, '    ').length;
    let end = i;
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j];
      if (!line.trim()) { end = j; continue; }
      if (countIndent(line) <= baseIndent) break;
      end = j;
    }
    best = Math.max(best, end - i + 1);
  }
  return best;
}

function longestRubyFunction(lines) {
  let best = 0;
  const stack = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (RUBY_DEF.test(lines[i])) stack.push(i);
    if (/^\s*end\b/.test(lines[i]) && stack.length) {
      const start = stack.pop();
      best = Math.max(best, i - start + 1);
    }
  }
  return best;
}

function longestBraceFunction(lines) {
  let best = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (!BRACE_FN.test(lines[i])) continue;
    let depth = 0;
    let started = false;
    let end = i;
    for (let j = i; j < lines.length && j < i + 400; j += 1) {
      for (const ch of lines[j]) {
        if (ch === '{') { depth += 1; started = true; }
        else if (ch === '}') depth -= 1;
      }
      end = j;
      if (started && depth <= 0) break;
    }
    best = Math.max(best, end - i + 1);
  }
  return best;
}

function longestFunctionSpan(filePath, content) {
  const lines = content.split(/\r?\n/);
  if (/\.py$/i.test(filePath)) return longestPythonFunction(lines);
  if (/\.rb$/i.test(filePath)) return longestRubyFunction(lines);
  if (/\.(ts|tsx|js|jsx|cs|go|java|razor)$/i.test(filePath)) return longestBraceFunction(lines);
  return 0;
}

module.exports = { longestFunctionSpan };
