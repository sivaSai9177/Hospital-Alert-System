#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing commented declarations in code.js...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix 1: Uncomment and properly format ANIMATION_TIMING_FUNCTIONS
console.log('1. Fixing ANIMATION_TIMING_FUNCTIONS...');
code = code.replace(
  /\/\/ ANIMATION_TIMING_FUNCTIONS field should be in constructor\n\s*\/\/ ANIMATION_TIMING_FUNCTIONS = \{([^}]+)\}\s*;?\n\s*\/\/ \};/g,
  function(match, content) {
    // Extract the content and fix formatting
    const fixedContent = content
      .replace(/,\s*'/g, ",\n    '")
      .replace(/bounce:/, "\n    bounce:")
      .replace(/smooth:/, "\n    smooth:")
      .replace(/snappy:/, "\n    snappy:");
    
    return `ANIMATION_TIMING_FUNCTIONS = {${fixedContent}\n  };`;
  }
);

// Fix 2: Uncomment and properly format ANIMATION_DELAYS
console.log('2. Fixing ANIMATION_DELAYS...');
code = code.replace(
  /\/\/ ANIMATION_DELAYS field should be in constructor\n\s*\/\/ ANIMATION_DELAYS = \{([^}]+)\}\s*;?\n\s*\/\/ \};/g,
  function(match, content) {
    // Extract the content and fix formatting
    const fixedContent = content
      .replace(/,\s*'/g, ",\n    '")
      .replace(/'stagger-1':/, "\n    'stagger-1':");
    
    return `ANIMATION_DELAYS = {${fixedContent}\n  };`;
  }
);

// Fix 3: Fix any other commented object declarations
console.log('3. Fixing other commented declarations...');
code = code.replace(/\/\/ (\w+) = \{([^}]+)\};/g, function(match, varName, content) {
  console.log(`   Found commented declaration: ${varName}`);
  return `${varName} = {${content}};`;
});

// Fix 4: Fix broken object syntax on single lines
console.log('4. Fixing broken object syntax...');
// Fix patterns like: { title: 'Durations', tokens: tokens.durations },     { title: 'Timing Functions'
code = code.replace(/\},\s*{/g, '},\n    {');

// Fix 5: Fix specific known issues
console.log('5. Fixing specific known patterns...');

// Fix const declarations that should be var
code = code.replace(/\bconst\s+/g, 'var ');
code = code.replace(/\blet\s+/g, 'var ');

// Fix arrow functions that might remain
code = code.replace(/(\w+)\s*=>\s*\{/g, 'function($1) {');
code = code.replace(/(\w+)\s*=>\s*([^{])/g, 'function($1) { return $2');

// Fix template literals that might remain
code = code.replace(/`([^`]*)`/g, function(match, content) {
  if (!content.includes('${')) {
    return "'" + content.replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
  }
  // Handle template literals with interpolation
  let result = content;
  result = result.replace(/\$\{([^}]+)\}/g, "' + ($1) + '");
  return "'" + result + "'";
});

// Fix 6: Ensure all module patterns are ES5 compatible
console.log('6. Fixing module patterns...');
code = code.replace(/export\s+\{([^}]+)\};/g, '// Export removed for ES5: {$1}');
code = code.replace(/import\s+.+\s+from\s+['"][^'"]+['"]/g, function(match) {
  return '// ' + match;
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Fixed commented declarations!');

// Validate the fixes
const issues = [];
if (code.includes('// ANIMATION_TIMING_FUNCTIONS')) {
  issues.push('ANIMATION_TIMING_FUNCTIONS still commented');
}
if (code.includes('// ANIMATION_DELAYS')) {
  issues.push('ANIMATION_DELAYS still commented');
}
if (code.match(/const\s+\w+/)) {
  issues.push('const declarations found');
}
if (code.match(/let\s+\w+/)) {
  issues.push('let declarations found');
}

if (issues.length > 0) {
  console.log('\n⚠️  Remaining issues:');
  issues.forEach(issue => console.log('  - ' + issue));
} else {
  console.log('\n✅ All checks passed!');
}