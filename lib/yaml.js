// A small YAML reader for client.yaml, so the repo needs no dependencies.
//
// It reads the subset client.example.yaml uses, and refuses anything else with a line number:
//   key: value            maps, nested by indentation (spaces only, no tabs)
//   - item                lists of scalars, and lists of maps ("- key: value" then more keys)
//   [a, b, "c"]  []  {}   one-line lists of scalars, and empty list / empty map
//   'single' "double"     quoted strings
//   true false null ~     booleans and null; 12 and 1.5 are numbers; everything else is a string
//   key: |                a block of text (the indented lines below it, joined with newlines)
//   # comment             whole-line and end-of-line comments
'use strict';

class YamlError extends Error {}

function stripComment(text) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"') i++;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '#' && (i === 0 || /\s/.test(text[i - 1]))) return text.slice(0, i).trimEnd();
  }
  return text.trimEnd();
}

function splitFlow(inner, lineNo) {
  const parts = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"') { cur += inner[++i] || ''; }
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === '[' || ch === '{') throw new YamlError(`line ${lineNo}: nested [ ] or { } is not supported`);
    if (ch === ',') { parts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (quote) throw new YamlError(`line ${lineNo}: unclosed quote`);
  if (cur.trim() !== '') parts.push(cur.trim());
  else if (parts.length) throw new YamlError(`line ${lineNo}: empty item in [ ]`);
  return parts;
}

function scalar(raw, lineNo) {
  const s = raw.trim();
  if (s === '' || s === '~' || s === 'null') return null;
  if (s.startsWith('"')) {
    if (!s.endsWith('"') || s.length < 2) throw new YamlError(`line ${lineNo}: unclosed "`);
    try { return JSON.parse(s); } catch { throw new YamlError(`line ${lineNo}: bad "quoted" string`); }
  }
  if (s.startsWith("'")) {
    if (!s.endsWith("'") || s.length < 2) throw new YamlError(`line ${lineNo}: unclosed '`);
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s.startsWith('[')) {
    if (!s.endsWith(']')) throw new YamlError(`line ${lineNo}: unclosed [`);
    return splitFlow(s.slice(1, -1), lineNo).map((p) => scalar(p, lineNo));
  }
  if (s.startsWith('{')) {
    if (s.replace(/\s/g, '') === '{}') return {};
    throw new YamlError(`line ${lineNo}: { } maps are not supported; write the keys on their own lines`);
  }
  if (s === '|' || s === '>' || s.startsWith('&') || s.startsWith('*') || s.startsWith('!')) {
    throw new YamlError(`line ${lineNo}: "${s}" is not supported here`);
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d+\.\d+$/.test(s)) return Number(s);
  return s;
}

// "key: rest" -> [key, rest], or null when the text is not a map entry.
function mapEntry(text) {
  const m = text.match(/^("(?:[^"\\]|\\.)*"|'[^']*'|[^\s"'[\]{}#,&*!|>-][^:]*?|-[^\s:][^:]*?)\s*:(?:\s+(.*))?$/);
  if (!m) return null;
  let key = m[1];
  if (key.startsWith('"')) key = JSON.parse(key);
  else if (key.startsWith("'")) key = key.slice(1, -1);
  return [key, m[2] === undefined ? '' : m[2]];
}

function parseYaml(src) {
  const raw = String(src).replace(/^﻿/, '').split(/\r?\n/);
  const lines = [];
  raw.forEach((text, i) => {
    const n = i + 1;
    if (/^\s*$/.test(text)) { lines.push({ blank: true, n, raw: text }); return; }
    const lead = text.match(/^[ \t]*/)[0];
    if (lead.includes('\t')) throw new YamlError(`line ${n}: use spaces, not tabs, for indentation`);
    const body = stripComment(text.slice(lead.length));
    if (body === '') { lines.push({ blank: true, n, raw: text }); return; }
    lines.push({ indent: lead.length, text: body, n, raw: text });
  });

  let i = 0;
  const skipBlank = () => { while (i < lines.length && lines[i].blank) i++; };
  const peek = () => { skipBlank(); return lines[i]; };
  const isItem = (l) => l.text === '-' || l.text.startsWith('- ');

  function block(indent) {
    const l = peek();
    if (!l) return null;
    return isItem(l) ? list(l.indent) : map(l.indent);
  }

  function literal(parentIndent) {
    const out = [];
    let base = null;
    while (i < lines.length) {
      const l = lines[i];
      if (l.blank) { out.push(''); i++; continue; }
      if (l.indent <= parentIndent) break;
      if (base === null) base = l.indent;
      out.push(l.raw.slice(Math.min(base, l.indent)).trimEnd());
      i++;
    }
    while (out.length && out[out.length - 1] === '') out.pop();
    return out.join('\n');
  }

  function value(rest, indent, lineNo) {
    if (rest === '|') return literal(indent);
    if (rest !== '') return scalar(rest, lineNo);
    const next = peek();
    if (!next) return null;
    if (next.indent > indent) return block(next.indent);
    if (next.indent === indent && isItem(next)) return list(indent);
    return null;
  }

  function map(indent) {
    const out = {};
    for (;;) {
      const l = peek();
      if (!l || l.indent < indent) return out;
      if (l.indent > indent) throw new YamlError(`line ${l.n}: unexpected indentation`);
      if (isItem(l)) return out;
      const e = mapEntry(l.text);
      if (!e) throw new YamlError(`line ${l.n}: expected "key: value", got "${l.text}"`);
      const [key, rest] = e;
      if (Object.prototype.hasOwnProperty.call(out, key)) throw new YamlError(`line ${l.n}: "${key}" appears twice`);
      i++;
      out[key] = value(rest, indent, l.n);
    }
  }

  function list(indent) {
    const out = [];
    for (;;) {
      const l = peek();
      if (!l || l.indent < indent) return out;
      if (l.indent > indent) throw new YamlError(`line ${l.n}: unexpected indentation`);
      if (!isItem(l)) return out;
      const itemText = l.text === '-' ? '' : l.text.slice(1).trimStart();
      if (itemText === '') {
        i++;
        const next = peek();
        out.push(next && next.indent > indent ? block(next.indent) : null);
        continue;
      }
      if (mapEntry(itemText) && !/^["'[]/.test(itemText)) {
        // "- key: value": the item is a map whose keys sit at the column of "key".
        const col = indent + (l.text.length - itemText.length);
        lines[i] = { indent: col, text: itemText, n: l.n, raw: l.raw };
        out.push(map(col));
        continue;
      }
      i++;
      out.push(scalar(itemText, l.n));
    }
  }

  const first = peek();
  if (!first) return {};
  if (first.indent !== 0) throw new YamlError(`line ${first.n}: the file must start at column 0`);
  const result = block(0);
  const left = peek();
  if (left) throw new YamlError(`line ${left.n}: could not read this line`);
  return result;
}

module.exports = { parseYaml, YamlError };
