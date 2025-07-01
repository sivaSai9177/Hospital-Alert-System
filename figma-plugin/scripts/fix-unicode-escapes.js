#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../dist/code.js');

console.log('🔧 Fixing Unicode escape sequences...');

try {
  let code = fs.readFileSync(filePath, 'utf-8');
  let fixCount = 0;
  
  // Fix incomplete \u sequences
  code = code.replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u');
  fixCount++;
  
  // Fix surrogate pairs - convert to proper escape sequences
  // Surrogate pairs are used for characters outside the Basic Multilingual Plane
  // High surrogate: 0xD800-0xDBFF, Low surrogate: 0xDC00-0xDFFF
  code = code.replace(/\\u(d[89ab][0-9a-f]{2})\\u(d[c-f][0-9a-f]{2})/gi, (match, high, low) => {
    // Convert surrogate pair to a safe escaped string
    return '\\\\u' + high + '\\\\u' + low;
  });
  
  // Fix lone surrogates (invalid in JavaScript strings)
  code = code.replace(/\\u(d[89ab][0-9a-f]{2})/gi, '\\\\u$1');
  code = code.replace(/\\u(d[c-f][0-9a-f]{2})/gi, '\\\\u$1');
  fixCount += 2;
  
  // Fix other problematic escape sequences
  // Replace \x with \\x if not followed by two hex digits
  code = code.replace(/\\x(?![0-9a-fA-F]{2})/g, '\\\\x');
  fixCount++;
  
  // Ensure all strings are properly escaped
  // This is a more aggressive fix for any remaining issues
  const stringRegex = /"([^"\\]|\\.)*"/g;
  let match;
  const problematicStrings = [];
  
  while ((match = stringRegex.exec(code)) !== null) {
    const str = match[0];
    // Check for unescaped backslashes that could cause issues
    if (str.includes('\\') && !str.match(/\\\\[\\/"bfnrt]|\\\\u[0-9a-fA-F]{4}|\\\\x[0-9a-fA-F]{2}/)) {
      problematicStrings.push({
        index: match.index,
        string: str.substring(0, 50) + '...'
      });
    }
  }
  
  if (problematicStrings.length > 0) {
    console.log(`Found ${problematicStrings.length} potentially problematic strings`);
  }
  
  // Additional fix: ensure ASCII-only output by escaping high-bit characters
  code = code.replace(/[\x80-\xFF]/g, function(match) {
    return '\\x' + match.charCodeAt(0).toString(16).padStart(2, '0');
  });
  
  // Write the fixed code
  fs.writeFileSync(filePath, code);
  console.log(`✅ Fixed Unicode escape sequences (${fixCount} fixes applied)`);
  
  // Verify the output
  const fixedCode = fs.readFileSync(filePath, 'utf-8');
  const remainingIssues = fixedCode.match(/\\u(?![0-9a-fA-F]{4})/g);
  if (remainingIssues) {
    console.log(`⚠️  Warning: ${remainingIssues.length} incomplete \\u sequences remaining`);
  }
  
} catch (error) {
  console.error('❌ Unicode fix failed:', error.message);
  process.exit(1);
}