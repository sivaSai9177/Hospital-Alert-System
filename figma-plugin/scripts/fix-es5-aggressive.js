#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../dist/code.js');

console.log('🔧 Applying aggressive ES5 fixes...');

try {
  let code = fs.readFileSync(filePath, 'utf-8');
  let fixCount = 0;
  
  // Fix destructuring in function parameters - more aggressive
  // Transform: function({ title, description }) => function(_temp0) { var title = _temp0.title; var description = _temp0.description;
  // Also handle: function(([a], [b])) => function(_temp0, _temp1) { var a = _temp0[0], b = _temp1[0];
  let destructuringFixed = false;
  code = code.replace(/function\s*\(([^)]*)\)\s*{/g, (match, params) => {
    if (params.includes('[') || params.includes('{')) {
      // This has destructuring
      const args = [];
      const destructures = [];
      let argIndex = 0;
      
      // Split parameters (handling nested brackets/braces)
      const paramList = [];
      let current = '';
      let depth = 0;
      let inString = false;
      let stringChar = null;
      
      for (let i = 0; i < params.length; i++) {
        const char = params[i];
        const prevChar = i > 0 ? params[i-1] : '';
        
        // Handle strings
        if ((char === '"' || char === "'") && prevChar !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = null;
          }
        }
        
        if (!inString) {
          if (char === '[' || char === '{') depth++;
          if (char === ']' || char === '}') depth--;
          if (char === ',' && depth === 0) {
            paramList.push(current.trim());
            current = '';
            continue;
          }
        }
        current += char;
      }
      if (current) paramList.push(current.trim());
      
      paramList.forEach(param => {
        param = param.trim();
        if (param.startsWith('[') || param.startsWith('{')) {
          const tempVar = `_temp${argIndex++}`;
          args.push(tempVar);
          
          // Generate destructuring assignment
          if (param.startsWith('[')) {
            // Array destructuring
            const inner = param.slice(1, -1).split(',').map(v => v.trim());
            inner.forEach((varName, idx) => {
              if (varName) {
                destructures.push(`var ${varName} = ${tempVar}[${idx}];`);
              }
            });
          } else {
            // Object destructuring { title, description, onPress }
            const inner = param.slice(1, -1);
            const props = [];
            let prop = '';
            let pdepth = 0;
            
            for (let i = 0; i < inner.length; i++) {
              const c = inner[i];
              if (c === '{' || c === '[') pdepth++;
              if (c === '}' || c === ']') pdepth--;
              if (c === ',' && pdepth === 0) {
                props.push(prop.trim());
                prop = '';
              } else {
                prop += c;
              }
            }
            if (prop) props.push(prop.trim());
            
            props.forEach(prop => {
              prop = prop.trim();
              if (prop.includes(':')) {
                const colonIdx = prop.indexOf(':');
                const key = prop.substring(0, colonIdx).trim();
                const varName = prop.substring(colonIdx + 1).trim();
                destructures.push(`var ${varName} = ${tempVar}["${key}"];`);
              } else {
                destructures.push(`var ${prop} = ${tempVar}["${prop}"];`);
              }
            });
          }
        } else if (param) {
          args.push(param);
        }
      });
      
      if (destructures.length > 0) {
        fixCount++;
        destructuringFixed = true;
        // Inject destructuring assignments at the beginning of function body
        return `function(${args.join(', ')}) { ${destructures.join(' ')} `;
      }
    }
    return match;
  });
  
  // Also check for any remaining function({ pattern - more aggressive
  console.log('Checking for function({ patterns...');
  const beforeCheck = code.includes('function({');
  console.log('Contains function({ before fix:', beforeCheck);
  
  const functionDestructuringRegex = /function\s*\(\s*\{([^}]+)\}\s*\)/g;
  let match;
  let foundCount = 0;
  
  while ((match = functionDestructuringRegex.exec(code)) !== null) {
    foundCount++;
    console.log(`Found pattern #${foundCount}:`, match[0].substring(0, 50) + '...');
    
    const fullMatch = match[0];
    const props = match[1];
    const tempVar = '_temp';
    
    // Parse properties more carefully
    const propList = [];
    let current = '';
    let depth = 0;
    
    for (let i = 0; i < props.length; i++) {
      const char = props[i];
      if (char === '{' || char === '[') depth++;
      if (char === '}' || char === ']') depth--;
      if (char === ',' && depth === 0) {
        propList.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current) propList.push(current.trim());
    
    const destructures = propList.map(prop => {
      prop = prop.trim();
      if (prop.includes(':')) {
        const colonIdx = prop.indexOf(':');
        const key = prop.substring(0, colonIdx).trim();
        const varName = prop.substring(colonIdx + 1).trim();
        return `var ${varName} = ${tempVar}["${key}"];`;
      } else {
        return `var ${prop} = ${tempVar}["${prop}"];`;
      }
    });
    
    const replacement = `function(${tempVar}) { ${destructures.join(' ')} `;
    code = code.replace(fullMatch, replacement);
    fixCount++;
    
    // Reset regex lastIndex to search from beginning again
    functionDestructuringRegex.lastIndex = 0;
  }
  
  const afterCheck = code.includes('function({');
  console.log('Contains function({ after fix:', afterCheck);
  console.log('Fixed', foundCount, 'function({ patterns');
  
  // One more pass with a simpler approach for any missed patterns
  if (afterCheck) {
    console.log('Running final pass for destructuring...');
    code = code.replace(/function\(\{([^}]+)\}/g, (match, props) => {
      fixCount++;
      const propList = props.split(',').map(p => p.trim());
      const tempVar = '_temp';
      const destructures = propList.map(prop => {
        if (prop.includes(':')) {
          const [key, varName] = prop.split(':').map(s => s.trim());
          return `var ${varName} = ${tempVar}["${key}"];`;
        } else {
          return `var ${prop} = ${tempVar}["${prop}"];`;
        }
      });
      return `function(${tempVar}) { ${destructures.join(' ')} `;
    });
  }
  
  // Fix arrow functions => to function
  code = code.replace(/(\w+)\s*=>\s*{/g, 'function($1) {');
  code = code.replace(/\(\s*([^)]+)\s*\)\s*=>\s*{/g, 'function($1) {');
  code = code.replace(/(\w+)\s*=>\s*([^{])/g, 'function($1) { return $2');
  code = code.replace(/\(\s*([^)]+)\s*\)\s*=>\s*([^{])/g, 'function($1) { return $2');
  
  // Fix template literals
  code = code.replace(/`([^`]*)`/g, (match, content) => {
    if (!content.includes('${')) {
      return '"' + content.replace(/"/g, '\\"') + '"';
    }
    // Handle template with expressions
    const parts = content.split(/\$\{([^}]+)\}/);
    let result = '';
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // String part
        if (parts[i]) {
          if (result) result += ' + ';
          result += '"' + parts[i].replace(/"/g, '\\"') + '"';
        }
      } else {
        // Expression part
        if (result) result += ' + ';
        result += '(' + parts[i] + ')';
      }
    }
    return '(' + result + ')';
  });
  
  // Fix const/let to var
  code = code.replace(/\b(const|let)\b/g, 'var');
  
  // Fix class declarations
  code = code.replace(/class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{([^}]+)}/g, (match, className, superClass, body) => {
    let result = `function ${className}() {\n`;
    if (superClass) {
      result += `  ${superClass}.call(this);\n`;
    }
    
    // Extract constructor
    const constructorMatch = body.match(/constructor\s*\([^)]*\)\s*{([^}]+)}/);
    if (constructorMatch) {
      result += constructorMatch[1];
    }
    result += '}\n';
    
    if (superClass) {
      result += `${className}.prototype = Object.create(${superClass}.prototype);\n`;
      result += `${className}.prototype.constructor = ${className};\n`;
    }
    
    // Extract methods
    const methodRegex = /(\w+)\s*\([^)]*\)\s*{([^}]+)}/g;
    let methodMatch;
    while ((methodMatch = methodRegex.exec(body))) {
      if (methodMatch[1] !== 'constructor') {
        result += `${className}.prototype.${methodMatch[1]} = function${methodMatch[0]};\n`;
      }
    }
    
    return result;
  });
  
  // Fix spread operator
  code = code.replace(/\.\.\.(\w+)/g, (match, varName) => {
    return `Array.prototype.slice.call(${varName})`;
  });
  
  // Fix Object.assign if not polyfilled
  if (code.includes('Object.assign') && !code.includes('Object.assign||function')) {
    code = 'if(!Object.assign){Object.assign=function(t){for(var o=1;o<arguments.length;o++){var n=arguments[o];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t}}\n' + code;
  }
  
  // Fix Array.from if not polyfilled
  if (code.includes('Array.from') && !code.includes('Array.from||function')) {
    code = 'if(!Array.from){Array.from=function(t){return Array.prototype.slice.call(t)}}\n' + code;
  }
  
  // Fix for...of loops
  code = code.replace(/for\s*\(\s*(var|let|const)\s+(\w+)\s+of\s+([^)]+)\)\s*{/g, (match, varType, varName, iterable) => {
    fixCount++;
    return `for (var _i = 0, _a = ${iterable}; _i < _a.length; _i++) { var ${varName} = _a[_i];`;
  });
  
  // Final cleanup - ensure no missed patterns
  const es6Patterns = [
    { pattern: /=>/g, replacement: 'function' },
    { pattern: /`/g, replacement: '"' },
    { pattern: /\bconst\b/g, replacement: 'var' },
    { pattern: /\blet\b/g, replacement: 'var' },
  ];
  
  es6Patterns.forEach(({ pattern, replacement }) => {
    const matches = code.match(pattern);
    if (matches) {
      console.log(`Found ${matches.length} instances of ${pattern}`);
      fixCount += matches.length;
    }
  });
  
  // Write the fixed code
  fs.writeFileSync(filePath, code);
  console.log(`✅ Applied ${fixCount} ES5 fixes`);
  
} catch (error) {
  console.error('❌ ES5 fix failed:', error.message);
  process.exit(1);
}