#!/usr/bin/env node
'use strict';

// security-scanner.mjs — scanner regex zero-dependency para vulnerabilidades
// comunes (SQLi, XSS, secrets hardcodeados, eval, path traversal, command
// injection). Pensado como primer paso barato (sin tokens de LLM) antes de
// la Dimension 1 (Security) de agteamos-review, y como gate de CI.
//
// Uso:
//   node security-scanner.mjs scan [--format text|json] [--fail-on any|high|medium|low|none] <file...>
//
// Exit codes: 0 = limpio o debajo del umbral, 1 = hallazgos al umbral o por
// encima, 2 = error de uso (sin archivos, flag invalido, archivo no legible).

import { readFileSync } from 'node:fs';

const SEVERITY_ORDER = { low: 0, medium: 1, high: 2 };

const RULES = [
  {
    id: 'sql-injection',
    severity: 'high',
    languages: ['py', 'ts', 'tsx', 'js', 'jsx', 'cs'],
    pattern: /(?:f["']|["']\s*\+\s*|`)\s*(?:SELECT|INSERT|UPDATE|DELETE)\b[\s\S]{0,80}?(?:\{[\w.]+\}|["']\s*\+|\$\{)/i,
    message: 'Posible SQL injection: interpolacion de variables directamente en un string de query.',
  },
  {
    id: 'xss-innerhtml',
    severity: 'high',
    languages: ['ts', 'tsx', 'js', 'jsx'],
    pattern: /(innerHTML|dangerouslySetInnerHTML)\s*[=:]\s*(?!['"`]\s*['"`])/,
    message: 'Posible XSS: contenido dinamico asignado a innerHTML/dangerouslySetInnerHTML sin sanitizar.',
  },
  {
    id: 'hardcoded-secret',
    severity: 'high',
    languages: ['py', 'ts', 'tsx', 'js', 'jsx', 'cs', 'json', 'yml', 'yaml'],
    pattern: /(password|secret|api[_-]?key|private[_-]?key|token)\s*[=:]\s*["'][A-Za-z0-9_\-./+=]{8,}["']/i,
    message: 'Posible credencial hardcodeada. Usa variables de entorno o un secret manager.',
  },
  {
    id: 'eval-usage',
    severity: 'high',
    languages: ['ts', 'tsx', 'js', 'jsx', 'py'],
    pattern: /\beval\s*\(|\bnew Function\s*\(|\bexec\s*\(\s*["'`]/,
    message: 'Uso de eval()/Function()/exec() con input potencialmente no confiable.',
  },
  {
    id: 'path-traversal',
    severity: 'medium',
    languages: ['py', 'ts', 'tsx', 'js', 'jsx', 'cs'],
    pattern: /(?:open|readFile|readFileSync|File\.Read|fs\.readFile)\s*\([^)]*(?:req\.|request\.|params\.|query\.)[^)]*\)/i,
    message: 'Posible path traversal: ruta de archivo construida a partir de input del request sin validar.',
  },
  {
    id: 'command-injection',
    severity: 'high',
    languages: ['py', 'ts', 'tsx', 'js', 'jsx', 'cs'],
    pattern: /(?:exec|execSync|spawn|os\.system|subprocess\.(?:call|run|Popen))\s*\([^)]*(?:req\.|request\.|params\.|query\.|\+\s*\w)/i,
    message: 'Posible command injection: comando de shell construido con input externo o concatenacion.',
  },
];

function parseArgs(argv) {
  const opts = { format: 'text', failOn: 'any', files: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--format') {
      opts.format = argv[++i];
    } else if (arg === '--fail-on') {
      opts.failOn = argv[++i];
    } else if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (!arg.startsWith('--')) {
      opts.files.push(arg);
    }
  }
  return opts;
}

function extOf(filePath) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filePath);
  return match ? match[1].toLowerCase() : '';
}

function scanFile(filePath) {
  const ext = extOf(filePath);
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (err) {
    return { error: `No se pudo leer ${filePath}: ${err.message}` };
  }

  const lines = content.split('\n');
  const findings = [];

  for (const rule of RULES) {
    if (!rule.languages.includes(ext)) continue;
    lines.forEach((line, idx) => {
      if (/agteamos-scanner-allow/.test(line)) return;
      if (rule.pattern.test(line)) {
        findings.push({
          file: filePath,
          line: idx + 1,
          rule: rule.id,
          severity: rule.severity,
          message: rule.message,
          snippet: line.trim().slice(0, 160),
        });
      }
    });
  }

  return { findings };
}

function printText(allFindings) {
  if (allFindings.length === 0) {
    process.stdout.write('security-scanner: sin hallazgos.\n');
    return;
  }
  for (const f of allFindings) {
    process.stdout.write(`[${f.severity.toUpperCase()}] ${f.file}:${f.line} (${f.rule}) — ${f.message}\n`);
    process.stdout.write(`  ${f.snippet}\n`);
  }
  process.stdout.write(`\nTotal: ${allFindings.length} hallazgo(s).\n`);
}

function printJson(allFindings) {
  process.stdout.write(JSON.stringify({ findings: allFindings }, null, 2));
  process.stdout.write('\n');
}

function main() {
  const [, , command, ...rest] = process.argv;

  if (command !== 'scan') {
    process.stderr.write('Uso: node security-scanner.mjs scan [--format text|json] [--fail-on any|high|medium|low|none] <file...>\n');
    process.exit(2);
  }

  const opts = parseArgs(rest);

  if (opts.help || opts.files.length === 0) {
    process.stderr.write('Uso: node security-scanner.mjs scan [--format text|json] [--fail-on any|high|medium|low|none] <file...>\n');
    process.exit(opts.files.length === 0 ? 2 : 0);
  }

  if (!['any', 'high', 'medium', 'low', 'none'].includes(opts.failOn)) {
    process.stderr.write(`--fail-on invalido: ${opts.failOn}\n`);
    process.exit(2);
  }

  const allFindings = [];
  for (const file of opts.files) {
    const result = scanFile(file);
    if (result.error) {
      process.stderr.write(`${result.error}\n`);
      process.exit(2);
    }
    allFindings.push(...result.findings);
  }

  if (opts.format === 'json') {
    printJson(allFindings);
  } else {
    printText(allFindings);
  }

  if (opts.failOn === 'none') process.exit(0);

  const threshold = opts.failOn === 'any' ? 0 : SEVERITY_ORDER[opts.failOn];
  const hasQualifying = allFindings.some((f) => SEVERITY_ORDER[f.severity] >= threshold);
  process.exit(hasQualifying ? 1 : 0);
}

main();
