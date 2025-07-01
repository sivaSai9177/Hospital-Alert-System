#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const filePath = path.resolve(__dirname, '../dist/code.js');

console.log('🔧 Ensuring complete ES5 compatibility...');

try {
  let code = fs.readFileSync(filePath, 'utf-8');
  console.log(`📖 Input: ${(code.length / 1024).toFixed(2)}KB`);
  
  // Step 1: Use Babel to ensure ES5
  console.log('🔄 Running Babel transformation...');
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
    ],
    sourceMaps: false,
    compact: true,
    comments: false,
  });
  
  code = babelResult.code;
  
  // Step 2: Manual cleanup for anything Babel missed
  console.log('🧹 Manual ES5 cleanup...');
  
  // Remove all module syntax
  code = code.replace(/\bimport\s+[^;]+;/g, '');
  code = code.replace(/\bimport\s*\{[^}]*\}\s*from\s*["'][^"']+["'];?/g, '');
  code = code.replace(/\bimport\s+\*\s+as\s+\w+\s+from\s*["'][^"']+["'];?/g, '');
  code = code.replace(/\bimport\s+["'][^"']+["'];?/g, '');
  code = code.replace(/\bexport\s+default\s+/g, '');
  code = code.replace(/\bexport\s*\{[^}]*\};?/g, '');
  code = code.replace(/\bexport\s+(const|let|var|function|class)\s+/g, '$1 ');
  
  // Fix any remaining arrow functions
  let arrowFixed = 0;
  code = code.replace(/(\w+)\s*=>\s*\{/g, (match, param) => {
    arrowFixed++;
    return `function(${param}){`;
  });
  code = code.replace(/\(([^)]*)\)\s*=>\s*\{/g, (match, params) => {
    arrowFixed++;
    return `function(${params}){`;
  });
  code = code.replace(/(\w+)\s*=>\s*([^{;,\)]+)/g, (match, param, body) => {
    arrowFixed++;
    return `function(${param}){return ${body}}`;
  });
  code = code.replace(/\(([^)]*)\)\s*=>\s*([^{;,\)]+)/g, (match, params, body) => {
    arrowFixed++;
    return `function(${params}){return ${body}}`;
  });
  console.log(`  Fixed ${arrowFixed} arrow functions`);
  
  // Fix template literals
  let templateFixed = 0;
  code = code.replace(/`([^`]*)`/g, (match, content) => {
    templateFixed++;
    if (!content.includes('${')) {
      return '"' + content.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';
    }
    // Handle templates with expressions
    let result = content;
    result = result.replace(/\$\{([^}]+)\}/g, '"+($1)+"');
    result = '"' + result.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';
    result = result.replace(/"\+""/, '');
    result = result.replace(/""\+/, '');
    return '(' + result + ')';
  });
  console.log(`  Fixed ${templateFixed} template literals`);
  
  // Convert const/let to var
  code = code.replace(/\b(const|let)\b/g, 'var');
  
  // Fix classes
  code = code.replace(/\bclass\s+(\w+)(\s+extends\s+\w+)?\s*\{/g, 'function $1(){');
  
  // Fix async/await
  code = code.replace(/\basync\s+function/g, 'function');
  code = code.replace(/\basync\s*\(/g, 'function(');
  code = code.replace(/\bawait\s+/g, '');
  
  // Fix for...of loops
  code = code.replace(/for\s*\(\s*(var|let|const)\s+(\w+)\s+of\s+([^)]+)\)\s*\{/g, 
    'for(var _i=0,_a=$3;_i<_a.length;_i++){var $2=_a[_i];');
  
  // Fix object method shorthand
  code = code.replace(/(\w+)\s*\(([^)]*)\)\s*\{/g, (match, name, params, offset, str) => {
    const before = str.substring(Math.max(0, offset - 20), offset);
    if (before.match(/function\s*$/) || before.match(/=\s*$/) || before.match(/return\s+$/)) {
      return match;
    }
    if (before.match(/[,:{]\s*$/)) {
      return `${name}:function(${params}){`;
    }
    return match;
  });
  
  // Fix spread operator
  code = code.replace(/\.\.\.(\w+)/g, 'Array.prototype.slice.call($1)');
  
  // Remove ES6+ keywords
  code = code.replace(/\bstatic\s+/g, '');
  code = code.replace(/\bsuper\s*\(/g, 'this.constructor.prototype.');
  code = code.replace(/\byield\s+/g, '');
  code = code.replace(/\bextends\s+/g, '');
  
  // Fix destructuring assignments that might remain
  code = code.replace(/var\s*\{([^}]+)\}\s*=/g, (match, props) => {
    const varName = '_temp' + Math.random().toString(36).substr(2, 9);
    const assignments = props.split(',').map(p => {
      const prop = p.trim();
      if (prop.includes(':')) {
        const [key, alias] = prop.split(':').map(s => s.trim());
        return `var ${alias}=${varName}["${key}"];`;
      }
      return `var ${prop}=${varName}["${prop}"];`;
    }).join('');
    return `var ${varName}=` + match.substring(match.indexOf('=') + 1) + ';' + assignments;
  });
  
  // Step 3: Add comprehensive polyfills
  console.log('➕ Adding polyfills...');
  const polyfills = fs.readFileSync(path.join(__dirname, '../src/polyfills.js'), 'utf-8') || `
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
  
  code = polyfills + '\n' + code;
  
  // Step 4: Final Unicode cleanup
  console.log('🔤 Unicode cleanup...');
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
  
  // Quick validation
  console.log('🔍 Quick validation...');
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
    { regex: /\.\.\./g, name: 'spread operator' }
  ];
  
  patterns.forEach(({ regex, name }) => {
    const matches = code.match(regex);
    if (matches) {
      issues.push(`${matches.length} ${name}`);
    }
  });
  
  if (issues.length > 0) {
    console.log(`⚠️  Found ES6+ features: ${issues.join(', ')}`);
  } else {
    console.log('✅ No ES6+ features detected!');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}