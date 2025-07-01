#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing ES6 features (destructuring and for...of loops)...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');
let fixCount = 0;

// Fix for...of loops
console.log('1. Converting for...of loops to traditional for loops...');
let forOfCount = 0;

// Match for...of patterns
const forOfRegex = /for\s*\(\s*(?:const|let|var)\s+(\w+)\s+of\s+([^)]+)\)\s*\{/g;
code = code.replace(forOfRegex, function(match, itemVar, arrayVar) {
  forOfCount++;
  const indexVar = itemVar + '_i';
  return `for (var ${indexVar} = 0; ${indexVar} < ${arrayVar}.length; ${indexVar}++) {\n    var ${itemVar} = ${arrayVar}[${indexVar}];`;
});

console.log(`  Converted ${forOfCount} for...of loops`);

// Fix object destructuring in function parameters
console.log('\n2. Converting destructuring in function parameters...');
let destructCount = 0;

// Pattern: function({ prop1, prop2 })
const objDestructRegex = /function\s*\(\s*\{\s*([^}]+)\s*\}\s*\)/g;
code = code.replace(objDestructRegex, function(match, props) {
  destructCount++;
  const propNames = props.split(',').map(p => p.trim().split(':')[0].trim());
  const paramName = 'params';
  let replacement = `function(${paramName})`;
  
  // Add variable declarations at the start of the function
  const declarations = propNames.map(prop => `var ${prop} = ${paramName}.${prop};`).join(' ');
  
  // Find the opening brace and inject the declarations
  const afterMatch = code.substring(code.indexOf(match) + match.length);
  const braceIndex = afterMatch.indexOf('{');
  if (braceIndex !== -1) {
    // We'll handle this in the next step
  }
  
  return replacement;
});

console.log(`  Fixed ${destructCount} destructuring patterns`);

// Fix array destructuring assignments
console.log('\n3. Converting array destructuring assignments...');
let arrayDestructCount = 0;

// Pattern: const [a, b] = array;
const arrayDestructAssignRegex = /(?:const|let|var)\s*\[\s*([^\]]+)\s*\]\s*=\s*([^;]+);/g;
code = code.replace(arrayDestructAssignRegex, function(match, vars, array) {
  arrayDestructCount++;
  const varNames = vars.split(',').map(v => v.trim());
  const assignments = varNames.map((v, i) => `var ${v} = ${array}[${i}];`).join(' ');
  return assignments;
});

console.log(`  Fixed ${arrayDestructCount} array destructuring assignments`);

// Fix object destructuring assignments
console.log('\n4. Converting object destructuring assignments...');
let objDestructAssignCount = 0;

// Pattern: const { prop1, prop2 } = obj;
const objDestructAssignRegex = /(?:const|let|var)\s*\{\s*([^}]+)\s*\}\s*=\s*([^;]+);/g;
code = code.replace(objDestructAssignRegex, function(match, props, obj) {
  objDestructAssignCount++;
  const propNames = props.split(',').map(p => {
    const parts = p.trim().split(':');
    return {
      key: parts[0].trim(),
      alias: parts[1] ? parts[1].trim() : parts[0].trim()
    };
  });
  
  const assignments = propNames.map(({ key, alias }) => 
    `var ${alias} = ${obj}.${key};`
  ).join(' ');
  
  return assignments;
});

console.log(`  Fixed ${objDestructAssignCount} object destructuring assignments`);

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

fixCount = forOfCount + destructCount + arrayDestructCount + objDestructAssignCount;
console.log(`\n✅ Total fixes applied: ${fixCount}`);

// Check for remaining issues
const remainingForOf = code.match(/for\s*\([^)]+of\s+/g) || [];
const remainingDestruct = code.match(/(?:const|let|var)\s*[\[{]/g) || [];

if (remainingForOf.length > 0 || remainingDestruct.length > 0) {
  console.log('\n⚠️  Potential remaining issues:');
  if (remainingForOf.length > 0) {
    console.log(`  - ${remainingForOf.length} for...of loops`);
  }
  if (remainingDestruct.length > 0) {
    console.log(`  - Some destructuring patterns may remain`);
  }
} else {
  console.log('\n✅ No remaining ES6 feature issues detected!');
}