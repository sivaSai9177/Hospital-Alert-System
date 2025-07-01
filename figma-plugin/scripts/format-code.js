#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const codePath = path.join(__dirname, '../dist/code.js');
const formattedPath = path.join(__dirname, '../dist/code.formatted.js');

if (!fs.existsSync(codePath)) {
  console.error('❌ dist/code.js not found');
  process.exit(1);
}

let code = fs.readFileSync(codePath, 'utf-8');

console.log('🔧 Formatting code for debugging...');

// Basic formatting - add newlines after semicolons and braces
code = code.replace(/;/g, ';\n');
code = code.replace(/\{/g, '{\n');
code = code.replace(/\}/g, '\n}\n');

// Write formatted version
fs.writeFileSync(formattedPath, code);

console.log('✅ Formatted code written to dist/code.formatted.js');

// Now try to find the error in the formatted version
try {
  new Function('var figma = {}; var __html__ = ""; ' + code);
  console.log('✅ No syntax errors after formatting');
} catch (e) {
  console.error('\n❌ Syntax error:', e.message);
  
  // Try to find the line number
  const match = e.stack.match(/<anonymous>:(\d+):(\d+)/);
  if (match) {
    const lineNum = parseInt(match[1]) - 2; // Subtract 2 for the added prefix
    const lines = code.split('\n');
    
    console.log(`\n📍 Error around line ${lineNum}`);
    console.log('\nContext:');
    for (let i = Math.max(0, lineNum - 5); i < Math.min(lines.length, lineNum + 5); i++) {
      const marker = i === lineNum ? '>>> ' : '    ';
      const line = lines[i].trim();
      if (line) {
        console.log(`${marker}${i + 1}: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
      }
    }
  }
}