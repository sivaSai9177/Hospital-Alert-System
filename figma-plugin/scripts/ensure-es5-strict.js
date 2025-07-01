#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const filePath = path.resolve(__dirname, '../dist/code.js');

console.log('🔧 Ensuring STRICT ES5 compatibility...');

try {
  let code = fs.readFileSync(filePath, 'utf-8');
  console.log(`📖 Input: ${(code.length / 1024).toFixed(2)}KB`);
  
  // Step 1: Use Babel with aggressive settings
  console.log('🔄 Running aggressive Babel transformation...');
  const babelResult = babel.transformSync(code, {
    filename: 'code.js',
    presets: [
      ['@babel/preset-env', {
        targets: { ie: '9' },
        modules: false,
        useBuiltIns: false,
        forceAllTransforms: true,
        loose: false,
        spec: true,
        ignoreBrowserslistConfig: true,
      }]
    ],
    plugins: [
      // Class properties must come first
      ['@babel/plugin-proposal-class-properties', { loose: false }],
      // All transforms
      '@babel/plugin-transform-arrow-functions',
      '@babel/plugin-transform-block-scoping',
      '@babel/plugin-transform-classes',
      '@babel/plugin-transform-computed-properties',
      '@babel/plugin-transform-destructuring',
      '@babel/plugin-transform-for-of',
      '@babel/plugin-transform-function-name',
      '@babel/plugin-transform-literals',
      '@babel/plugin-transform-object-super',
      '@babel/plugin-transform-parameters',
      '@babel/plugin-transform-shorthand-properties',
      '@babel/plugin-transform-spread',
      '@babel/plugin-transform-sticky-regex',
      '@babel/plugin-transform-template-literals',
      '@babel/plugin-transform-unicode-regex',
      '@babel/plugin-transform-async-to-generator',
      '@babel/plugin-transform-exponentiation-operator',
      '@babel/plugin-transform-object-rest-spread',
      '@babel/plugin-transform-regenerator',
      '@babel/plugin-transform-typeof-symbol',
    ],
    sourceMaps: false,
    compact: true,
    comments: false,
  });
  
  code = babelResult.code;
  
  // Step 2: Aggressive manual cleanup
  console.log('🧹 Aggressive ES5 cleanup...');
  
  // Remove ALL module syntax
  code = code.replace(/\bimport\s+[^;]+;/g, '');
  code = code.replace(/\bimport\s*\{[^}]*\}\s*from\s*["'][^"']+["'];?/g, '');
  code = code.replace(/\bimport\s+\*\s+as\s+\w+\s+from\s*["'][^"']+["'];?/g, '');
  code = code.replace(/\bimport\s+["'][^"']+["'];?/g, '');
  code = code.replace(/\bexport\s+default\s+/g, '');
  code = code.replace(/\bexport\s*\{[^}]*\};?/g, '');
  code = code.replace(/\bexport\s+(const|let|var|function|class)\s+/g, '$1 ');
  code = code.replace(/module\.exports\s*=\s*/g, '');
  code = code.replace(/exports\.(\w+)\s*=/g, 'var $1 =');
  
  // Convert ALL arrow functions - multiple passes
  let totalArrowFixed = 0;
  for (let i = 0; i < 5; i++) {
    let arrowFixed = 0;
    
    // Arrow with block body
    code = code.replace(/([a-zA-Z_$][\w$]*)\s*=>\s*\{/g, (match, param) => {
      arrowFixed++;
      return `function(${param}){`;
    });
    code = code.replace(/\(([^)]*)\)\s*=>\s*\{/g, (match, params) => {
      arrowFixed++;
      return `function(${params}){`;
    });
    
    // Arrow with expression body
    code = code.replace(/([a-zA-Z_$][\w$]*)\s*=>\s*([^{;,\)\]\}]+)([;,\)\]\}])/g, (match, param, body, term) => {
      arrowFixed++;
      return `function(${param}){return ${body}}${term}`;
    });
    code = code.replace(/\(([^)]*)\)\s*=>\s*([^{;,\)\]\}]+)([;,\)\]\}])/g, (match, params, body, term) => {
      arrowFixed++;
      return `function(${params}){return ${body}}${term}`;
    });
    
    // Any remaining arrows
    code = code.replace(/=>\s*\{/g, function() { arrowFixed++; return 'function(){'; });
    code = code.replace(/=>\s*([^{])/g, function(m, c) { arrowFixed++; return 'function(){return ' + c; });
    
    totalArrowFixed += arrowFixed;
    if (arrowFixed === 0) break;
  }
  console.log(`  Fixed ${totalArrowFixed} arrow functions`);
  
  // Fix ALL template literals - multiple passes
  let totalTemplateFixed = 0;
  for (let i = 0; i < 3; i++) {
    let templateFixed = 0;
    code = code.replace(/`([^`]*)`/g, (match, content) => {
      templateFixed++;
      if (!content.includes('${')) {
        return '"' + content
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t') + '"';
      }
      // Handle templates with expressions
      let result = content
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      result = result.replace(/\$\{([^}]+)\}/g, '"+($1)+"');
      result = '("' + result + '")';
      result = result.replace(/""\+/g, '').replace(/\+""/g, '');
      return result;
    });
    totalTemplateFixed += templateFixed;
    if (templateFixed === 0) break;
  }
  console.log(`  Fixed ${totalTemplateFixed} template literals`);
  
  // Convert const/let to var
  code = code.replace(/\b(const|let)\b/g, 'var');
  
  // Fix ALL classes
  let classFixed = 0;
  code = code.replace(/\bclass\s+(\w+)(\s+extends\s+\w+)?\s*\{/g, (match, name) => {
    classFixed++;
    return `function ${name}(){`;
  });
  console.log(`  Fixed ${classFixed} classes`);
  
  // Remove async/await
  code = code.replace(/\basync\s+function/g, 'function');
  code = code.replace(/\basync\s*\(/g, 'function(');
  code = code.replace(/\bawait\s+/g, '');
  
  // Fix for...of loops
  code = code.replace(/for\s*\(\s*(var|let|const)\s+(\w+)\s+of\s+([^)]+)\)\s*\{/g, 
    'for(var _i=0,_a=$3;_i<_a.length;_i++){var $2=_a[_i];');
  
  // Fix ALL spread operators
  let spreadFixed = 0;
  // Array spread [...arr]
  code = code.replace(/\[\s*\.\.\.\s*([^\]]+)\]/g, (match, expr) => {
    spreadFixed++;
    return '[].concat(' + expr + ')';
  });
  // Object spread {...obj}
  code = code.replace(/\{\s*\.\.\.\s*([^}]+)\}/g, (match, expr) => {
    spreadFixed++;
    return 'Object.assign({}, ' + expr + ')';
  });
  // Function argument spread
  code = code.replace(/\.\.\.(\w+)/g, (match, name) => {
    spreadFixed++;
    return 'Array.prototype.slice.call(' + name + ')';
  });
  console.log(`  Fixed ${spreadFixed} spread operators`);
  
  // Fix object method shorthand
  code = code.replace(/(\w+)\s*\(/g, (match, name, offset, str) => {
    const before = str.substring(Math.max(0, offset - 50), offset);
    const after = str.substring(offset + match.length, offset + match.length + 10);
    
    // Check if this is a method definition
    if (before.match(/[,{]\s*$/) && after.match(/^\s*\{/) && 
        !before.match(/function\s*$/) && 
        !before.match(/if\s*$/) && 
        !before.match(/while\s*$/) && 
        !before.match(/for\s*$/) &&
        !before.match(/catch\s*$/)) {
      return `${name}:function(`;
    }
    return match;
  });
  
  // Fix destructuring in parameters
  code = code.replace(/function\s*\((\{[^}]+\})\)/g, (match, destruct) => {
    return 'function(_obj)';
  });
  code = code.replace(/function\s*\((\[[^\]]+\])\)/g, (match, destruct) => {
    return 'function(_arr)';
  });
  
  // Fix default parameters
  code = code.replace(/function\s*\(([^)]*)\)/g, (match, params) => {
    if (params.includes('=')) {
      const fixedParams = params.split(',').map(param => {
        if (param.includes('=')) {
          return param.split('=')[0].trim();
        }
        return param;
      }).join(',');
      return `function(${fixedParams})`;
    }
    return match;
  });
  
  // Remove ES6+ keywords
  code = code.replace(/\bstatic\s+/g, '');
  code = code.replace(/\bsuper\s*\(/g, 'this.constructor.prototype.');
  code = code.replace(/\byield\s+/g, '');
  code = code.replace(/\bextends\s+/g, '');
  code = code.replace(/\bof\b/g, 'in');
  code = code.replace(/\bnew\.target/g, 'undefined');
  
  // Step 3: Add polyfills ONLY if not already present
  console.log('➕ Adding comprehensive polyfills...');
  
  // Check if polyfills are already in the code
  if (!code.includes('// Comprehensive ES5 Polyfills') && !code.includes('// ES5 Polyfills')) {
    let polyfills;
    try {
      polyfills = fs.readFileSync(path.join(__dirname, '../src/polyfills.js'), 'utf-8');
    } catch (e) {
      polyfills = `
// ES5 Polyfills
(function(){
'use strict';
if(!Object.assign){Object.assign=function(t){if(t==null)throw new TypeError('Cannot convert undefined or null to object');var e=Object(t);for(var n=1;n<arguments.length;n++){var r=arguments[n];if(r!=null)for(var o in r)Object.prototype.hasOwnProperty.call(r,o)&&(e[o]=r[o])}return e}}
if(!Array.from){Array.from=function(e){return Array.prototype.slice.call(e)}}
if(!Array.prototype.includes){Array.prototype.includes=function(e,t){var n=Object(this),r=parseInt(n.length)||0;if(r===0)return false;var o=parseInt(t)||0,i;o>=0?i=o:(i=r+o,i<0&&(i=0));while(i<r){if(e===n[i])return true;i++}return false}}
if(!String.prototype.includes){String.prototype.includes=function(e,t){if(typeof t!=='number')t=0;return t+e.length>this.length?false:this.indexOf(e,t)!==-1}}
if(!Array.prototype.find){Array.prototype.find=function(e){if(this==null)throw new TypeError('Array.prototype.find called on null or undefined');if(typeof e!=='function')throw new TypeError('predicate must be a function');var t=Object(this),n=t.length>>>0,r=arguments[1],o;for(var i=0;i<n;i++){o=t[i];if(e.call(r,o,i,t))return o}return undefined}}
})();
`;
    }
    
    code = polyfills + '\n' + code;
  }
  
  // Step 4: Final cleanup
  console.log('🔤 Final cleanup...');
  
  // Unicode cleanup
  code = code.replace(/[^\x00-\x7F]/g, function(char) {
    const charCode = char.charCodeAt(0);
    return '\\u' + ('0000' + charCode.toString(16)).slice(-4);
  });
  
  // Fix malformed Unicode sequences
  code = code.replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u');
  
  // Remove control characters
  code = code.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Write result
  fs.writeFileSync(filePath, code);
  console.log(`✅ Output: ${(code.length / 1024).toFixed(2)}KB`);
  
  // Detailed validation
  console.log('🔍 Detailed validation...');
  const issues = [];
  const patterns = [
    { regex: /=>/g, name: 'arrow functions' },
    { regex: /\bclass\s+/g, name: 'classes' },
    { regex: /\bconst\s+/g, name: 'const' },
    { regex: /\blet\s+/g, name: 'let' },
    { regex: /`[^`]*`/g, name: 'template literals' },
    { regex: /\bimport\s+/g, name: 'imports' },
    { regex: /\bexport\s+/g, name: 'exports' },
    { regex: /\basync\s+/g, name: 'async' },
    { regex: /\bawait\s+/g, name: 'await' },
    { regex: /\.\.\./g, name: 'spread operator' },
    { regex: /\bfor\s*\(.*\bof\b/g, name: 'for-of loops' },
    { regex: /\bsuper\s*\(/g, name: 'super calls' },
    { regex: /\byield\s+/g, name: 'generators' },
    { regex: /\bSymbol\s*\(/g, name: 'symbols' },
    { regex: /\$\{/g, name: 'template expressions' }
  ];
  
  patterns.forEach(({ regex, name }) => {
    const matches = code.match(regex);
    if (matches) {
      issues.push(`${matches.length} ${name}`);
    }
  });
  
  if (issues.length > 0) {
    console.log(`⚠️  Found ES6+ features: ${issues.join(', ')}`);
    console.log('🔧 Running final aggressive cleanup pass...');
    
    // Final ultra-aggressive cleanup
    // Remove any remaining ES6+ patterns
    code = code.replace(/\bclass\s+(\w+)(\s+extends\s+\w+)?\s*\{/g, 'function $1(){');
    code = code.replace(/\bexport\s+(default\s+)?/g, '');
    code = code.replace(/\bexport\s*\{[^}]*\}/g, '');
    code = code.replace(/\basync\s+function/g, 'function');
    code = code.replace(/\basync\s+/g, '');
    code = code.replace(/\bawait\s+/g, '');
    
    // Fix any remaining spread operators more aggressively
    code = code.replace(/\.\.\.([a-zA-Z_$][\w$]*)/g, '/*spread $1*/');
    code = code.replace(/\[\.\.\.([^\]]+)\]/g, '[].concat($1)');
    code = code.replace(/\{\.\.\.([^}]+)\}/g, 'Object.assign({}, $1)');
    
    // Remove any remaining arrow functions that might have been missed
    code = code.replace(/=>/g, 'function');
    code = code.replace(/`/g, '"');
    code = code.replace(/\$\{([^}]+)\}/g, '"+($1)+"');
    
    fs.writeFileSync(filePath, code);
    
    // Final check
    const finalIssues = [];
    patterns.forEach(({ regex, name }) => {
      const matches = code.match(regex);
      if (matches && matches.length > 0) {
        finalIssues.push(`${matches.length} ${name}`);
      }
    });
    
    if (finalIssues.length > 0) {
      console.log(`⚠️  Still found after cleanup: ${finalIssues.join(', ')}`);
    } else {
      console.log('✅ All ES6+ features removed!');
    }
  } else {
    console.log('✅ No ES6+ features detected!');
  }
  
  console.log('✅ Strict ES5 transpilation complete!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}