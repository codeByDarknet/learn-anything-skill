'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function tmpdir(prefix = 'learn-skill-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function write(file, content = '') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

module.exports = { tmpdir, write };
