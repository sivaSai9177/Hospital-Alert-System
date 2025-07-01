#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 Fixing function syntax issues...\n');

let code = fs.readFileSync('dist/code.js', 'utf8');
let fixCount = 0;

// Fix patterns like: map(function(token return { 
// Should be: map(function(token) { return {
const regex1 = /\.map\(function\((\w+) return \{/g;
code = code.replace(regex1, function(match, param) {
  fixCount++;
  return `.map(function(${param}) { return {`;
});

// Fix patterns like: map(function((child return {
// Should be: map(function(child) { return {
const regex2 = /\.map\(function\(\((\w+) return \{/g;
code = code.replace(regex2, function(match, param) {
  fixCount++;
  return `.map(function(${param}) { return {`;
});

// Fix patterns like: forEach(function((item
const regex3 = /\.forEach\(function\(\((\w+)/g;
code = code.replace(regex3, function(match, param) {
  fixCount++;
  return `.forEach(function(${param}`;
});

// Fix patterns like: filter(function((item
const regex4 = /\.filter\(function\(\((\w+)/g;
code = code.replace(regex4, function(match, param) {
  fixCount++;
  return `.filter(function(${param}`;
});

// Additional fixes for findAll and other patterns
const additionalPatterns = [
  // Fix findAll(function((node)
  { regex: /\.findAll\(function\(\((\w+)\)/g, replace: '.findAll(function($1)' },
  // Fix sort(function(([a], [b])
  { regex: /\.sort\(function\(\(\[(\w+)\], \[(\w+)\]\)/g, replace: '.sort(function(arr1, arr2) { var $1 = arr1[0], $2 = arr2[0];' },
  // Fix general function((param)
  { regex: /function\(\((\w+)\)/g, replace: 'function($1)' },
];

additionalPatterns.forEach(({ regex, replace }) => {
  const matches = code.match(regex) || [];
  if (matches.length > 0) {
    code = code.replace(regex, replace);
    fixCount += matches.length;
  }
});

// Write the fixed code
fs.writeFileSync('dist/code.js', code);

console.log(`✅ Fixed ${fixCount} function syntax issues!`);

// Check for remaining issues
const remainingIssues = [];
if (code.match(/function\(\(/)) remainingIssues.push('function((');
if (code.match(/function\(\w+ return/)) remainingIssues.push('missing parentheses');

if (remainingIssues.length > 0) {
  console.log(`\n⚠️  Remaining issues: ${remainingIssues.join(', ')}`);
} else {
  console.log('\n✅ No remaining function syntax issues!');
}