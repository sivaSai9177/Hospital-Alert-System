#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing remaining template literal issues...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix the specific pattern where template literal conversion went wrong
// Pattern: '${gap > 0 ? '-gap-${ gap: gap }' : ""}'
console.log('Fixing malformed template literal conversions...');

// Fix the specific line with the flexMap.set issue
code = code.replace(
  /name: 'flex-' \+ \(direction\) \+ '\$\{gap > 0 \? '-gap-\$\{ gap: gap \}' : ""\}'/g,
  "name: 'flex-' + direction + (gap > 0 ? '-gap-' + gap : '')"
);

// Fix any remaining ${...} patterns that weren't properly converted
code = code.replace(/'\$\{([^}]+)\}'/g, function(match, expr) {
  // Convert the expression
  return "' + (" + expr + ") + '";
});

// Fix patterns where we have '...' + (...) + '...' with empty strings
code = code.replace(/'' \+ \(/g, '(');
code = code.replace(/\) \+ ''/g, ')');
code = code.replace(/' \+ '' \+ '/g, "' + '");

// Fix any remaining template literal syntax
// Pattern like: `text ${expr} more text` should become 'text ' + (expr) + ' more text'
const templateLiteralRegex = /`([^`]*\$\{[^`]+\}[^`]*)`/g;
let match;
while ((match = templateLiteralRegex.exec(code)) !== null) {
  let template = match[1];
  let converted = template.replace(/\$\{([^}]+)\}/g, "' + ($1) + '");
  converted = "'" + converted + "'";
  converted = converted.replace(/^'' \+ /, '').replace(/ \+ ''$/, '');
  code = code.replace(match[0], converted);
}

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Template literal fixes complete!');

// Check the specific area around line 185
const lines = code.split('\n');
console.log('\nChecking around line 185:');
for (let i = 183; i < 188 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i].substring(0, 150)}${lines[i].length > 150 ? '...' : ''}`);
}