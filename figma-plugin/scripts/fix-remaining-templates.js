#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing remaining template literals...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');
let fixCount = 0;

// Fix specific patterns found in the grep results
const fixes = [
  // Fix map function template literals
  {
    pattern: /\$\{analysis\.spacing\.issues\.map\(function\(issue\) \{ return '- \$\{ issue: issue \}' \}\)\.join\(' '\)\}/g,
    replacement: "' + analysis.spacing.issues.map(function(issue) { return '- ' + issue; }).join(' ') + '"
  },
  // Fix suggestions map
  {
    pattern: /\$\{suggestions\.map\(function\(s\) \{ return '\*\*\$\{s\.node\}\*\* \(\$\{s\.type\} \}\) - \$\{s\.suggestion\}'\)\.join\('/g,
    replacement: "' + suggestions.map(function(s) { return '**' + s.node + '** (' + s.type + ') - ' + s.suggestion; }).join('"
  },
  // Fix issues map
  {
    pattern: /\$\{issues\.map\(function\(i\) \{ return '\*\*\$\{i\.node\}\*\* - \$\{i\.severity\.toUpperCase\( \}\)\} - \$\{i\.message\}'\)\.join\('/g,
    replacement: "' + issues.map(function(i) { return '**' + i.node + '** - ' + i.severity.toUpperCase() + ' - ' + i.message; }).join('"
  },
  // Fix TypeScript conditionals
  {
    pattern: /\$\{isTypeScript \? ': React\.FC<\$\{ name: name \}Props>' : '"\}/g,
    replacement: "' + (isTypeScript ? ': React.FC<' + name + 'Props>' : '') + '"
  },
  // Fix prop default values
  {
    pattern: /\$\{prop\.defaultValue \? ' = \$\{JSON\.stringify\(prop\.defaultValue\)\}' : '"\}/g,
    replacement: "' + (prop.defaultValue ? ' = ' + JSON.stringify(prop.defaultValue) : '') + '"
  }
];

// Apply fixes
fixes.forEach(({ pattern, replacement }) => {
  const matches = code.match(pattern) || [];
  if (matches.length > 0) {
    console.log(`Found ${matches.length} instances of pattern: ${pattern.source.substring(0, 50)}...`);
    code = code.replace(pattern, replacement);
    fixCount += matches.length;
  }
});

// Generic template literal fix for remaining cases
const genericRegex = /\$\{([^}]+)\}/g;
let genericMatches = code.match(genericRegex) || [];
if (genericMatches.length > 0) {
  console.log(`\nFound ${genericMatches.length} remaining template literal expressions`);
  
  // Show first few examples
  genericMatches.slice(0, 5).forEach(match => {
    console.log(`  - ${match}`);
  });
  
  // Fix them
  code = code.replace(genericRegex, function(match, expression) {
    fixCount++;
    // Simple replacement - wrap in string concatenation
    return "' + (" + expression + ") + '";
  });
}

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log(`\n✅ Fixed ${fixCount} template literal issues!`);

// Verify the specific line that had the error
console.log('\nChecking around line 167:');
const lines = code.split('\n');
for (let i = 165; i < 170 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i].substring(0, 100)}${lines[i].length > 100 ? '...' : ''}`);
}