#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building plugin with proper transpilation...');

// First, build with Bun
execSync('bun build src/code.ts --outfile=dist/code.temp.js --target=browser --bundle', {
  stdio: 'inherit'
});

// Read the output
let code = fs.readFileSync('dist/code.temp.js', 'utf8');

// Fix class field declarations by converting them to constructor assignments
console.log('Transpiling class fields...');

// Pattern to match class definitions with fields
const classPattern = /class\s+(\w+)(?:\s+extends\s+[^{]+)?\s*{([^}]+(?:{[^}]*}[^}]*)*[^}]+)}/g;

code = code.replace(classPattern, (match, className, classBody) => {
  // Find all field declarations
  const fieldPattern = /^\s*(\w+)\s*=\s*([^;]+);/gm;
  const fields = [];
  let modifiedBody = classBody;
  
  // Extract fields
  let fieldMatch;
  while ((fieldMatch = fieldPattern.exec(classBody)) !== null) {
    fields.push({
      name: fieldMatch[1],
      value: fieldMatch[2].trim()
    });
  }
  
  if (fields.length === 0) {
    return match; // No fields to transform
  }
  
  // Remove field declarations from class body
  modifiedBody = modifiedBody.replace(fieldPattern, '');
  
  // Check if constructor exists
  const constructorMatch = modifiedBody.match(/constructor\s*\([^)]*\)\s*{/);
  
  if (constructorMatch) {
    // Add field assignments to existing constructor
    const constructorIndex = modifiedBody.indexOf(constructorMatch[0]);
    const afterConstructor = constructorIndex + constructorMatch[0].length;
    
    let fieldAssignments = '\n';
    fields.forEach(field => {
      fieldAssignments += `    this.${field.name} = ${field.value};\n`;
    });
    
    modifiedBody = 
      modifiedBody.slice(0, afterConstructor) + 
      fieldAssignments + 
      modifiedBody.slice(afterConstructor);
  } else {
    // Create new constructor
    let fieldAssignments = '  constructor() {\n';
    
    // Check if class extends something
    if (match.includes('extends')) {
      fieldAssignments += '    super();\n';
    }
    
    fields.forEach(field => {
      fieldAssignments += `    this.${field.name} = ${field.value};\n`;
    });
    fieldAssignments += '  }\n';
    
    // Add constructor at the beginning of class body
    modifiedBody = '\n' + fieldAssignments + modifiedBody;
  }
  
  return `class ${className}${match.includes('extends') ? match.match(/extends\s+[^{]+/)[0] : ''} {${modifiedBody}}`;
});

// Also fix standalone field declarations that might be missed
code = code.replace(/^(\s*)(\w+)\s*=\s*([^;]+);/gm, (match, indent, name, value) => {
  // Only transform if it looks like a class field (has proper indentation and is not in a function)
  if (indent.length >= 2 && !match.includes('this.') && !match.includes('const ') && !match.includes('let ') && !match.includes('var ')) {
    return `${indent}this.${name} = ${value};`;
  }
  return match;
});

// Use the more robust transpiler
const { transpileModernJS } = require('./transpile-modern-js');
code = transpileModernJS(code);

// Write the transpiled code
fs.writeFileSync('dist/code.js', code);

// Clean up temp file
fs.unlinkSync('dist/code.temp.js');

console.log('Plugin built successfully!');