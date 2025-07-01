#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Aggressive semicolon fix...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix all patterns where semicolon appears at the beginning of a line followed by });
console.log('Replacing all ; }); patterns...');
code = code.replace(/^\s*;\s*\}\);/gm, '    });');

// Fix patterns where semicolon appears at the beginning followed by }
code = code.replace(/^\s*;\s*\}/gm, '    }');

// Fix patterns where we have }); followed by ; });
code = code.replace(/\}\);\s*;\s*\}\);/g, '});');

// Fix patterns in object literals where we have property: value\n  ; });
// This should be property: value\n  });
code = code.replace(/\n(\s*);\s*\}\);/g, '\n$1});');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Aggressive semicolon fixes complete!');

// Count remaining semicolons at start of lines
const lines = code.split('\n');
let count = 0;
let examples = [];

lines.forEach((line, i) => {
  if (line.trim().startsWith(';')) {
    count++;
    if (examples.length < 5) {
      examples.push({ num: i + 1, content: line.trim() });
    }
  }
});

if (count > 0) {
  console.log(`\n⚠️  ${count} lines still start with semicolon:`);
  examples.forEach(({ num, content }) => {
    console.log(`  Line ${num}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
  });
} else {
  console.log('\n✅ No more lines starting with semicolon!');
}