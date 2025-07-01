#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../dist/code.js');

console.log('🔧 Fixing string escaping issues...');

try {
  let code = fs.readFileSync(filePath, 'utf-8');
  let fixCount = 0;
  
  // Fix embedded code strings that might contain unescaped quotes
  // This is a common issue when minified code contains embedded source code as strings
  
  // First, let's identify problematic patterns
  console.log('Analyzing string patterns...');
  
  // Fix newlines in strings (should be \n not actual newlines)
  code = code.replace(/("(?:[^"\\]|\\.)*)\n([^"]*")/g, '$1\\n$2');
  fixCount++;
  
  // Fix carriage returns in strings
  code = code.replace(/("(?:[^"\\]|\\.)*)\r([^"]*")/g, '$1\\r$2');
  fixCount++;
  
  // Fix tabs in strings
  code = code.replace(/("(?:[^"\\]|\\.)*)\t([^"]*")/g, '$1\\t$2');
  fixCount++;
  
  // Remove any null bytes or other control characters
  code = code.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  fixCount++;
  
  // Fix any remaining Unicode issues more aggressively
  // Replace any character above ASCII 127 with Unicode escape
  code = code.replace(/[^\x00-\x7F]/g, function(char) {
    return '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
  });
  fixCount++;
  
  // Ensure all backslashes in strings are properly escaped
  // This is tricky because we need to distinguish between escape sequences and literal backslashes
  const fixBackslashes = (str) => {
    // Skip if it's already a valid escape sequence
    if (/^\\[\\/"bfnrt]/.test(str)) return str;
    if (/^\\u[0-9a-fA-F]{4}/.test(str)) return str;
    if (/^\\x[0-9a-fA-F]{2}/.test(str)) return str;
    // Otherwise, escape the backslash
    return '\\\\' + str.slice(1);
  };
  
  // Apply more targeted fixes for specific patterns found in Figma errors
  // Fix patterns like function({ that might be in strings
  code = code.replace(/"([^"]*function\s*\([^"]*\{[^"]*")"/g, (match, content) => {
    // Double-escape any backslashes in embedded code strings
    const fixed = content.replace(/\\/g, '\\\\');
    return '"' + fixed + '"';
  });
  
  // Fix patterns that might contain regex literals in strings
  code = code.replace(/"([^"]*\/[^"\/]+\/[gimuy]*[^"]*")"/g, (match, content) => {
    // Escape forward slashes in regex patterns within strings
    const fixed = content.replace(/(?<!\\)\//g, '\\/');
    return '"' + fixed + '"';
  });
  
  // Write the fixed code
  fs.writeFileSync(filePath, code);
  console.log(`✅ Applied ${fixCount} string escaping fixes`);
  
  // Final validation
  const fixedCode = fs.readFileSync(filePath, 'utf-8');
  
  // Check for any remaining non-ASCII characters
  const nonAscii = fixedCode.match(/[^\x00-\x7F]/g);
  if (nonAscii) {
    console.log(`⚠️  Warning: ${nonAscii.length} non-ASCII characters remaining`);
  }
  
  // Check for control characters
  const controlChars = fixedCode.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g);
  if (controlChars) {
    console.log(`⚠️  Warning: ${controlChars.length} control characters remaining`);
  }
  
} catch (error) {
  console.error('❌ String escaping fix failed:', error.message);
  process.exit(1);
}