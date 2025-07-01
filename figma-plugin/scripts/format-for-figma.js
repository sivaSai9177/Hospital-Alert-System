#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const codePath = path.join(__dirname, '../dist/code.js');
let code = fs.readFileSync(codePath, 'utf-8');

console.log('Formatting code for Figma...');

// Add line breaks after function definitions to make it more readable
code = code.replace(/\}\);/g, '});\n');
code = code.replace(/\},/g, '},\n');
code = code.replace(/\];/g, '];\n');

// Ensure the file ends with a newline
if (!code.endsWith('\n')) {
  code += '\n';
}

// Write back
fs.writeFileSync(codePath, code);

console.log('✅ Formatted for Figma');