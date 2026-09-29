'use strict';

const readline = require('node:readline');

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const c = {
  bold: paint(1),
  dim: paint(2),
  red: paint(31),
  green: paint(32),
  yellow: paint(33),
  cyan: paint(36),
};

function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/**
 * Keyboard-driven list. items: [{ label, hint, checked }]
 * multi=true  → space toggles, a toggles all, enter confirms; returns array of indexes.
 * multi=false → enter picks the highlighted item; returns its index.
 * Esc / Ctrl+C / q → null.
 */
function select(title, items, { multi = false } = {}) {
  return new Promise((resolve) => {
    const state = items.map((i) => Boolean(i.checked));
    let cursor = 0;
    let lines = 0;
    const out = process.stdout;
    const help = multi
      ? c.dim('↑/↓ move · space toggle · a all/none · enter confirm · esc cancel')
      : c.dim('↑/↓ move · enter select · esc cancel');

    const render = () => {
      if (lines) {
        readline.moveCursor(out, 0, -lines);
        readline.clearScreenDown(out);
      }
      const rows = [c.bold(title), help];
      items.forEach((item, i) => {
        const pointer = i === cursor ? c.cyan('❯') : ' ';
        const box = multi ? (state[i] ? c.green('◉') : '◯') : '';
        const label = i === cursor ? c.bold(item.label) : item.label;
        rows.push(`${pointer} ${box}${multi ? ' ' : ''}${label}${item.hint ? '  ' + c.dim(item.hint) : ''}`);
      });
      out.write(rows.join('\n') + '\n');
      lines = rows.length;
    };

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    out.write('\x1b[?25l');

    const done = (value) => {
      process.stdin.removeListener('keypress', onKey);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      out.write('\x1b[?25h');
      resolve(value);
    };

    const onKey = (_str, key = {}) => {
      if ((key.ctrl && key.name === 'c') || key.name === 'escape' || key.name === 'q') return done(null);
      if (key.name === 'up' || key.name === 'k') cursor = (cursor - 1 + items.length) % items.length;
      else if (key.name === 'down' || key.name === 'j') cursor = (cursor + 1) % items.length;
      else if (multi && key.name === 'space') state[cursor] = !state[cursor];
      else if (multi && key.name === 'a') {
        const all = state.every(Boolean);
        state.fill(!all);
      } else if (key.name === 'return' || key.name === 'enter') {
        return done(multi ? state.map((v, i) => (v ? i : -1)).filter((i) => i >= 0) : cursor);
      }
      render();
    };

    process.stdin.on('keypress', onKey);
    render();
  });
}

function confirm(question, def = true) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${question} ${c.dim(def ? '[Y/n]' : '[y/N]')} `, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      resolve(a === '' ? def : ['y', 'yes', 'o', 'oui', 's', 'si', 'sí', 'j', 'ja'].includes(a));
    });
  });
}

module.exports = { c, select, confirm, isInteractive };
