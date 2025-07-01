#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('Building plugin with transpilation...');

// Use Bun with specific transpilation settings
execSync(`bun build src/code.ts --outfile=dist/code.js --target=browser --bundle`, {
  stdio: 'inherit'
});

// Read the output
let code = fs.readFileSync('dist/code.js', 'utf8');

// Post-process to fix remaining issues
console.log('Post-processing code...');

// Fix class fields - we need to move them into constructors
// This is more complex, so we'll do a simpler approach
// Convert class field initializers to old-style assignments
code = code.replace(/class\s+(\w+)\s*{([^}]+)}/g, (match, className, classBody) => {
  console.log(`Processing class: ${className}`);
  
  // Find all field initializers
  const fields = [];
  const processedBody = classBody.replace(/^\s*(?:this\.)?(\w+)\s*=\s*([^;]+);/gm, (fieldMatch, fieldName, fieldValue) => {
    // Skip if it's already inside a method/constructor
    if (fieldMatch.includes('(') || fieldMatch.includes(')')) {
      return fieldMatch;
    }
    
    console.log(`  Found field: ${fieldName}`);
    fields.push({ name: fieldName, value: fieldValue.trim() });
    return ''; // Remove the field initializer
  });
  
  // If we found fields, we need to add them to constructor
  if (fields.length > 0) {
    // Check if there's already a constructor
    const constructorMatch = processedBody.match(/constructor\s*\([^)]*\)\s*{/);
    
    if (constructorMatch) {
      // Add fields to existing constructor
      const constructorIndex = processedBody.indexOf(constructorMatch[0]);
      const insertIndex = constructorIndex + constructorMatch[0].length;
      
      const fieldAssignments = fields.map(f => `\n    this.${f.name} = ${f.value};`).join('');
      
      return `class ${className} {${
        processedBody.slice(0, insertIndex) + 
        fieldAssignments + 
        processedBody.slice(insertIndex)
      }}`;
    } else {
      // Create a new constructor
      const fieldAssignments = fields.map(f => `    this.${f.name} = ${f.value};`).join('\n');
      const newConstructor = `\n  constructor() {\n${fieldAssignments}\n  }\n`;
      
      return `class ${className} {${newConstructor}${processedBody}}`;
    }
  }
  
  return match;
});

// Alternative approach for standalone class fields (not inside class declarations)
code = code.replace(/^(\s*)(?:this\.)?(\w+)\s*=\s*([^;]+);$/gm, (match, indent, name, value) => {
  // Skip if it's inside a function or already has 'this.'
  if (match.includes('(') || match.includes(')') || match.includes('function') || match.startsWith(`${indent}this.`)) {
    return match;
  }
  
  // Check context - if it looks like a class field, comment it out
  const lines = code.split('\n');
  const lineIndex = lines.findIndex(line => line.includes(match.trim()));
  
  if (lineIndex > 0) {
    const prevLine = lines[lineIndex - 1];
    const nextLine = lines[lineIndex + 1] || '';
    
    // If it's likely inside a class (based on indentation and context)
    if (prevLine.includes('class') || prevLine.includes('{') || nextLine.includes('(')) {
      console.log(`Commenting out orphan field: ${name}`);
      return `${indent}// ${name} = ${value}; // Moved to constructor`;
    }
  }
  
  return match;
});

// Fix optional chaining
code = code.replace(/(\w+)\?\./g, '$1 && $1.');
code = code.replace(/\?\.\[/g, ' && [');
code = code.replace(/\?\.\(/g, ' && (');

// Fix specific problematic patterns
code = code.replace(/data\?\.stack/g, 'data && data.stack');
code = code.replace(/data\?\.error/g, 'data && data.error');
code = code.replace(/error\?\.message/g, 'error && error.message');
code = code.replace(/node\?\.type/g, 'node && node.type');

// Write the result
fs.writeFileSync('dist/code.js', code);

console.log('Plugin built successfully!');