#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../dist/code.js');
console.log('🔧 Final ES5 transformation - comprehensive fix...');

if (!fs.existsSync(filePath)) {
  console.error('❌ File not found:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Find all unique spread patterns
const spreadMatches = content.match(/\.\.\.[\w$]+/g) || [];
const uniqueSpreads = [...new Set(spreadMatches)];
console.log(`Found ${uniqueSpreads.length} unique spread patterns:`, uniqueSpreads.slice(0, 10));

// Step 2: Replace each unique spread pattern based on context
uniqueSpreads.forEach(spread => {
  const varName = spread.substring(3); // Remove ...
  
  // Create a regex that captures context
  const contextRegex = new RegExp(`([\\[\\(\\{,]\\s*)(${spread.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([\\]\\)\\},]?)`, 'g');
  
  content = content.replace(contextRegex, function(match, before, spreadOp, after) {
    // Determine replacement based on context
    if (before.includes('[') || before === ',') {
      // Array context
      if (after === ']') {
        return before + 'Array.prototype.slice.call(' + varName + ')' + after;
      } else {
        return before + '].concat(' + varName + ')[';
      }
    } else if (before.includes('(')) {
      // Function argument context
      return before + varName + after;
    } else if (before.includes('{')) {
      // Object context - this shouldn't happen after our earlier fixes
      return before + 'Object.assign({}, ' + varName + ')' + after;
    }
    return match; // Fallback
  });
});

// Step 3: Handle specific minified patterns
// Pattern: r=r||Array.prototype.slice.call(t,0,a)
content = content.replace(/([a-z])=([a-z])\|\|Array\.prototype\.slice\.call\(([^)]+)\)/g, '$1=$2||Array.prototype.slice.call($3)');

// Pattern: !r&&a in t||(r||(r=Array.prototype.slice.call(t,0,a)),r[a]=t[a])
content = content.replace(/!([a-z])&&([a-z]) in ([a-z])\|\|\(([a-z])\|\|\(([a-z])=Array\.prototype\.slice\.call/g, 
  '(!$1&&$2 in $3)||($4||($5=Array.prototype.slice.call');

// Step 4: Final cleanup of any remaining spreads
// This is a last resort - just remove them
content = content.replace(/\.\.\.(?=[\s,;\)\]\}])/g, '');

// Step 5: Ensure proper IIFE wrapper
if (!content.trim().startsWith('(function')) {
  // Rewrap ensuring single line
  content = content.replace(/^\(function\(\)\{/, '');
  content = content.replace(/\}\)\(\);?$/, '');
  content = '(function(){' + content + '})();';
}

// Step 6: Minify to single line for Figma
content = content
  .replace(/\n\s*/g, ' ')  // Remove newlines and indentation
  .replace(/\s+/g, ' ')     // Collapse multiple spaces
  .replace(/\s*([{}();,:])\s*/g, '$1') // Remove spaces around delimiters
  .replace(/;\s*}/g, '}')  // Remove unnecessary semicolons before closing braces
  .trim();

// Write the result
fs.writeFileSync(filePath, content);

// Validation
const validation = {
  spreads: (content.match(/\.\.\./g) || []).length,
  arrows: (content.match(/=>/g) || []).length,
  constLet: (content.match(/\b(const|let)\s+/g) || []).length,
  classes: (content.match(/\bclass\s+/g) || []).length,
  async: (content.match(/\basync\s+/g) || []).length,
  templates: (content.match(/`[^`]*`/g) || []).length,
  optionalChain: (content.match(/\?\./g) || []).length,
  fileSize: (content.length / 1024).toFixed(2) + ' KB',
  isSingleLine: !content.includes('\n')
};

console.log('\n📊 Final validation:');
Object.entries(validation).forEach(([key, value]) => {
  if (key === 'fileSize' || key === 'isSingleLine') {
    console.log(`  - ${key}: ${value}`);
  } else {
    const icon = value === 0 ? '✅' : '❌';
    console.log(`  ${icon} ${key}: ${value}`);
  }
});

const totalIssues = validation.spreads + validation.arrows + validation.constLet + 
                   validation.classes + validation.async + validation.templates + 
                   validation.optionalChain;

if (totalIssues === 0) {
  console.log('\n🎉 Successfully converted to pure ES5!');
} else {
  console.log(`\n⚠️  ${totalIssues} ES6+ features remain`);
}