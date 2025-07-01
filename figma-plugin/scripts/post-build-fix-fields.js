#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Post-build field fixes...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// Fix pattern: fieldName = { ... } outside of constructor
// This includes auth, api, etc.

// First, let's find and fix the specific auth field issue
const authFieldRegex = /^(\s*)auth\s*=\s*\{([^}]+)\};/gm;
code = code.replace(authFieldRegex, function(match, indent, content) {
  console.log('Found auth field, converting...');
  
  // Convert arrow functions to regular functions
  let fixedContent = content
    .replace(/(\w+):\s*\(([^)]*)\)\s*=>\s*this\.(\w+)/g, '$1: function($2) { return this.$3')
    .replace(/\)(?=,|\s*$)/g, '); }.bind(this)');
  
  // Comment out the field and add a note
  return `${indent}// auth field moved to constructor\n${indent}// auth = {${fixedContent}};`;
});

// Fix pattern: api = { ... }
const apiFieldRegex = /^(\s*)api\s*=\s*\{([^}]+)\};/gm;
code = code.replace(apiFieldRegex, function(match, indent, content) {
  console.log('Found api field, converting...');
  
  // Convert arrow functions
  let fixedContent = content
    .replace(/(\w+):\s*\(([^)]*)\)\s*=>\s*this\.(\w+)/g, '$1: function($2) { return this.$3')
    .replace(/\)(?=,|\s*$)/g, '); }.bind(this)');
  
  return `${indent}// api field moved to constructor\n${indent}// api = {${fixedContent}};`;
});

// Fix any other object literal field declarations
const objectFieldRegex = /^(\s*)(\w+)\s*=\s*\{([^}]+)\};/gm;
code = code.replace(objectFieldRegex, function(match, indent, fieldName, content) {
  // Skip if already commented
  if (match.includes('//')) return match;
  
  // Skip if it's inside a function/method
  const beforeMatch = code.substring(Math.max(0, code.lastIndexOf(match) - 100), code.lastIndexOf(match));
  if (beforeMatch.includes('function') || beforeMatch.includes('{')) {
    return match;
  }
  
  console.log(`Found object field: ${fieldName}, commenting out...`);
  
  // Handle multi-line content - comment out each line
  const lines = match.split('\n');
  const commentedLines = lines.map((line, i) => {
    if (i === 0) {
      return `${indent}// ${fieldName} field should be in constructor\n${indent}// ${line.trim()}`;
    } else {
      return `${indent}// ${line.trim()}`;
    }
  }).join('\n');
  
  return commentedLines;
});

// Now find these classes and add the fields to their constructors
// This is a simplified approach - just add initialization after super() if present

// For ServerLogger/FigmaLogger classes
const classWithAuthRegex = /class\s+(ServerLogger|FigmaLogger)[^{]*\{([^}]+constructor[^}]+)\}/g;
code = code.replace(classWithAuthRegex, function(match, className, classContent) {
  console.log(`Adding auth to ${className} constructor...`);
  
  // Find constructor end
  const constructorEndMatch = classContent.match(/constructor[^{]+\{[^}]+/);
  if (constructorEndMatch) {
    const insertPoint = constructorEndMatch[0].length;
    const authInit = `
    // Initialize auth methods
    var self = this;
    this.auth = {
      info: function(message, data) { return self.log("info", "AUTH", message, data); },
      error: function(message, error) { return self.log("error", "AUTH", message, error); },
      warn: function(message, data) { return self.log("warn", "AUTH", message, data); },
      debug: function(message, data) { return self.log("debug", "AUTH", message, data); }
    };
    this.api = {
      info: function(message, data) { return self.log("info", "API", message, data); },
      error: function(message, error) { return self.log("error", "API", message, error); },
      warn: function(message, data) { return self.log("warn", "API", message, data); },
      debug: function(message, data) { return self.log("debug", "API", message, data); }
    };`;
    
    const newContent = classContent.substring(0, insertPoint) + authInit + classContent.substring(insertPoint);
    return `class ${className} {${newContent}}`;
  }
  
  return match;
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('\n✅ Post-build field fixes complete!');

// Check the problematic area
const lines = code.split('\n');
console.log('\nChecking around line 1349:');
for (let i = 1345; i <= 1355 && i < lines.length; i++) {
  if (lines[i - 1] && lines[i - 1].includes('auth')) {
    console.log(`${i}: ${lines[i - 1].substring(0, 80)}${lines[i - 1].length > 80 ? '...' : ''}`);
  }
}