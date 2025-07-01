#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing single parameter arrow functions...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');

// First fix any broken method calls like .mapfunction(
console.log('Fixing broken method calls...');
const brokenMethods = ['map', 'forEach', 'filter', 'reduce', 'find', 'some', 'every', 'sort', 'findIndex', 'push', 'findAll', 'findOne', 'findChildren'];
brokenMethods.forEach(method => {
  const regex = new RegExp(`\\.${method}function\\(`, 'g');
  code = code.replace(regex, `.${method}(function(`);
});

// Fix single parameter arrow functions in array methods
const methods = ['map', 'forEach', 'filter', 'reduce', 'find', 'some', 'every', 'sort', 'findIndex'];

methods.forEach(method => {
  // Pattern: .method((param) { 
  // Should be: .method(function(param) {
  const regex1 = new RegExp(`\\.${method}\\(\\((\\w+)\\)\\s*\\{`, 'g');
  code = code.replace(regex1, `.${method}(function($1) {`);
  
  // Pattern: .method(param => {
  // Should be: .method(function(param) {
  const regex2 = new RegExp(`\\.${method}\\((\\w+)\\s*=>\\s*\\{`, 'g');
  code = code.replace(regex2, `.${method}(function($1) {`);
  
  // Pattern: .method((param) => {
  // Should be: .method(function(param) {
  const regex3 = new RegExp(`\\.${method}\\(\\((\\w+)\\)\\s*=>\\s*\\{`, 'g');
  code = code.replace(regex3, `.${method}(function($1) {`);
  
  // Pattern: .method(param => expression)
  // Should be: .method(function(param) { return expression; })
  const regex4 = new RegExp(`\\.${method}\\((\\w+)\\s*=>\\s*([^{][^)]+)\\)`, 'g');
  code = code.replace(regex4, `.${method}(function($1) { return $2; })`);
});

// Fix any remaining arrow functions outside of array methods
// Pattern: (param) => {
code = code.replace(/\(([\w\s,]+)\)\s*=>\s*\{/g, 'function($1) {');

// Pattern: param => {
code = code.replace(/(\w+)\s*=>\s*\{/g, 'function($1) {');

// Pattern: () => {
code = code.replace(/\(\)\s*=>\s*\{/g, 'function() {');

// Pattern: => expression (single expression arrows)
code = code.replace(/=>\s*([^{][^;]+);/g, 'function() { return $1; };');

// Fix any push/call patterns that might have function syntax issues
code = code.replace(/\.push\(\(function\(/g, '.push(function(');
code = code.replace(/\.call\(\(function\(/g, '.call(function(');

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log('✅ Single parameter arrow functions fixed!');

// Verify the fix
const lines = code.split('\n');
let foundArrows = 0;
let foundIssues = [];

lines.forEach((line, i) => {
  if (line.includes('=>')) {
    foundArrows++;
    if (foundIssues.length < 3) {
      foundIssues.push({ line: i + 1, content: line.trim().substring(0, 80) });
    }
  }
  
  // Check for the specific pattern mentioned in the error
  if (line.includes('.map((token) {')) {
    console.log(`\n⚠️  Found problematic pattern at line ${i + 1}`);
  }
});

if (foundArrows > 0) {
  console.log(`\n⚠️  Found ${foundArrows} remaining arrow functions`);
  foundIssues.forEach(issue => {
    console.log(`  Line ${issue.line}: ${issue.content}...`);
  });
} else {
  console.log('\n✅ No arrow functions found!');
}

// Check around line 30
console.log('\nChecking around line 30:');
for (let i = 27; i < 33 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i].substring(0, 100)}${lines[i].length > 100 ? '...' : ''}`);
}