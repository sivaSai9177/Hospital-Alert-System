#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const codePath = path.join(__dirname, '../dist/code.js');

if (!fs.existsSync(codePath)) {
  console.error('❌ dist/code.js not found');
  process.exit(1);
}

const code = fs.readFileSync(codePath, 'utf-8');

console.log('🔍 Finding syntax error location...\n');

// Try to run the code in a VM context to get better error information
try {
  const script = new vm.Script(code, {
    filename: 'code.js',
    displayErrors: true
  });
  
  const context = vm.createContext({
    figma: {
      ui: { postMessage: function() {} },
      showUI: function() {},
      closePlugin: function() {}
    },
    __html__: '',
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
  });
  
  script.runInContext(context);
  console.log('✅ No syntax errors found!');
} catch (error) {
  console.error('❌ Syntax Error:', error.message);
  
  // Try to extract line information
  if (error.stack) {
    const stackLines = error.stack.split('\n');
    const errorLine = stackLines.find(line => line.includes('code.js:'));
    if (errorLine) {
      const match = errorLine.match(/code\.js:(\d+):(\d+)/);
      if (match) {
        const lineNum = parseInt(match[1]);
        const colNum = parseInt(match[2]);
        
        console.log(`\n📍 Error at line ${lineNum}, column ${colNum}`);
        
        // Show context
        const lines = code.split('\n');
        console.log('\nContext:');
        for (let i = Math.max(0, lineNum - 3); i < Math.min(lines.length, lineNum + 2); i++) {
          const marker = i === lineNum - 1 ? '>>> ' : '    ';
          console.log(`${marker}${i + 1}: ${lines[i].substring(0, 100)}${lines[i].length > 100 ? '...' : ''}`);
        }
        
        if (lineNum <= lines.length) {
          const errorLine = lines[lineNum - 1];
          console.log('\nProblematic line:');
          console.log(errorLine);
          
          // Check for common issues
          if (errorLine.includes('|| (')) {
            console.log('\n⚠️  Found "|| (" pattern');
          }
          if (errorLine.includes('&& (')) {
            console.log('\n⚠️  Found "&& (" pattern');
          }
          
          // Count parentheses
          const openParens = (errorLine.match(/\(/g) || []).length;
          const closeParens = (errorLine.match(/\)/g) || []).length;
          if (openParens !== closeParens) {
            console.log(`\n⚠️  Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
          }
        }
      }
    }
  }
  
  // Additional analysis
  console.log('\n📊 Code Statistics:');
  console.log(`Total length: ${code.length} characters`);
  console.log(`Total lines: ${code.split('\n').length}`);
  
  // Check for minification issues
  const firstLine = code.split('\n')[0];
  if (firstLine.length > 10000) {
    console.log('\n⚠️  Code appears to be minified into a single line');
    console.log('This can make debugging difficult');
  }
}