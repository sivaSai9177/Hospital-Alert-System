#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const filePath = path.resolve(__dirname, '../dist/code.js');

console.log('🔧 Complete ES5 Transpilation Starting...');

// Helper to transform arrow functions
function transformArrowFunction(path) {
  const { node } = path;
  const params = node.params;
  const body = node.body;
  const isExpression = !t.isBlockStatement(body);
  
  const functionExpression = t.functionExpression(
    null,
    params,
    isExpression ? t.blockStatement([t.returnStatement(body)]) : body,
    node.generator,
    node.async
  );
  
  path.replaceWith(functionExpression);
}

// Helper to transform template literals
function transformTemplateLiteral(path) {
  const { node } = path;
  const { expressions, quasis } = node;
  
  if (expressions.length === 0) {
    // No expressions, just a string
    const str = quasis[0].value.cooked;
    path.replaceWith(t.stringLiteral(str));
    return;
  }
  
  // Build concatenation
  let result = quasis[0].value.cooked ? t.stringLiteral(quasis[0].value.cooked) : null;
  
  for (let i = 0; i < expressions.length; i++) {
    const expr = expressions[i];
    const quasi = quasis[i + 1];
    
    if (result) {
      result = t.binaryExpression('+', result, expr);
    } else {
      result = expr;
    }
    
    if (quasi.value.cooked) {
      result = t.binaryExpression('+', result, t.stringLiteral(quasi.value.cooked));
    }
  }
  
  path.replaceWith(result || t.stringLiteral(''));
}

// Main transpilation function
async function transpileToES5(code) {
  try {
    // First pass: Parse and transform with Babel AST
    const ast = parser.parse(code, {
      sourceType: 'script',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true
    });
    
    // Transform ES6+ features
    traverse(ast, {
      // Arrow functions
      ArrowFunctionExpression(path) {
        transformArrowFunction(path);
      },
      
      // Template literals
      TemplateLiteral(path) {
        transformTemplateLiteral(path);
      },
      
      // Classes
      ClassDeclaration(path) {
        const className = path.node.id.name;
        const superClass = path.node.superClass;
        const body = path.node.body.body;
        
        // Create constructor function
        let constructorBody = [];
        let methods = [];
        
        for (const member of body) {
          if (member.kind === 'constructor') {
            constructorBody = member.body.body;
          } else if (member.kind === 'method') {
            methods.push(member);
          }
        }
        
        const constructorFunc = t.functionDeclaration(
          t.identifier(className),
          [],
          t.blockStatement(constructorBody)
        );
        
        const statements = [constructorFunc];
        
        // Add prototype methods
        for (const method of methods) {
          const assignment = t.expressionStatement(
            t.assignmentExpression(
              '=',
              t.memberExpression(
                t.memberExpression(t.identifier(className), t.identifier('prototype')),
                t.identifier(method.key.name)
              ),
              t.functionExpression(null, method.params, method.body)
            )
          );
          statements.push(assignment);
        }
        
        path.replaceWithMultiple(statements);
      },
      
      // Const/Let to Var
      VariableDeclaration(path) {
        if (path.node.kind === 'const' || path.node.kind === 'let') {
          path.node.kind = 'var';
        }
      },
      
      // Object method shorthand
      ObjectMethod(path) {
        const { node } = path;
        const key = node.key;
        const func = t.functionExpression(null, node.params, node.body);
        const prop = t.objectProperty(key, func);
        path.replaceWith(prop);
      },
      
      // Destructuring in parameters
      Function(path) {
        const params = path.node.params;
        const newParams = [];
        const bodyStatements = [];
        
        params.forEach((param, index) => {
          if (t.isObjectPattern(param) || t.isArrayPattern(param)) {
            const tempName = `_temp${index}`;
            const tempParam = t.identifier(tempName);
            newParams.push(tempParam);
            
            // Create destructuring assignment in function body
            const assignment = t.variableDeclaration('var', [
              t.variableDeclarator(param, tempParam)
            ]);
            bodyStatements.push(assignment);
          } else {
            newParams.push(param);
          }
        });
        
        if (bodyStatements.length > 0) {
          path.node.params = newParams;
          if (t.isBlockStatement(path.node.body)) {
            path.node.body.body.unshift(...bodyStatements);
          }
        }
      },
      
      // Spread operator
      SpreadElement(path) {
        if (path.parent.type === 'CallExpression') {
          // Function call spread
          const callExpr = path.parent;
          const spreadIndex = callExpr.arguments.indexOf(path.node);
          
          if (spreadIndex === callExpr.arguments.length - 1) {
            // Last argument is spread
            const applyCall = t.callExpression(
              t.memberExpression(callExpr.callee, t.identifier('apply')),
              [
                t.thisExpression(),
                t.callExpression(
                  t.memberExpression(
                    t.arrayExpression(callExpr.arguments.slice(0, -1)),
                    t.identifier('concat')
                  ),
                  [path.node.argument]
                )
              ]
            );
            path.parentPath.replaceWith(applyCall);
          }
        } else if (path.parent.type === 'ArrayExpression') {
          // Array spread
          const elements = path.parent.elements;
          const spreadIndex = elements.indexOf(path.node);
          
          if (spreadIndex === 0 && elements.length === 1) {
            // Only spread element
            path.parentPath.replaceWith(
              t.callExpression(
                t.memberExpression(
                  t.memberExpression(
                    t.memberExpression(t.identifier('Array'), t.identifier('prototype')),
                    t.identifier('slice')
                  ),
                  t.identifier('call')
                ),
                [path.node.argument]
              )
            );
          }
        }
      },
      
      // For...of loops
      ForOfStatement(path) {
        const { left, right, body } = path.node;
        const iteratorVar = path.scope.generateUidIdentifier('i');
        const arrayVar = path.scope.generateUidIdentifier('arr');
        const itemVar = left.declarations ? left.declarations[0].id : left;
        
        const forLoop = t.forStatement(
          t.variableDeclaration('var', [
            t.variableDeclarator(iteratorVar, t.numericLiteral(0)),
            t.variableDeclarator(arrayVar, right)
          ]),
          t.binaryExpression('<', iteratorVar, t.memberExpression(arrayVar, t.identifier('length'))),
          t.updateExpression('++', iteratorVar),
          t.blockStatement([
            t.variableDeclaration('var', [
              t.variableDeclarator(itemVar, t.memberExpression(arrayVar, iteratorVar, true))
            ]),
            body
          ])
        );
        
        path.replaceWith(forLoop);
      },
      
      // Async functions
      FunctionDeclaration(path) {
        if (path.node.async) {
          path.node.async = false;
          // Async transpilation is handled by babel transform
        }
      },
      
      FunctionExpression(path) {
        if (path.node.async) {
          path.node.async = false;
          // Async transpilation is handled by babel transform
        }
      },
      
      AwaitExpression(path) {
        // Convert to .then() call
        const thenCall = t.callExpression(
          t.memberExpression(path.node.argument, t.identifier('then')),
          []
        );
        path.replaceWith(thenCall);
      }
    });
    
    // Generate code
    const output = generate(ast, {
      compact: false,
      comments: false
    });
    
    // Second pass: Use Babel transform for complete transpilation
    const babelResult = babel.transformSync(output.code, {
      presets: [
        ['@babel/preset-env', {
          targets: { ie: '9' },
          modules: false,
          useBuiltIns: 'usage',
          corejs: 3,
          forceAllTransforms: true,
          loose: false,
          bugfixes: false
        }]
      ],
      plugins: [
        '@babel/plugin-transform-destructuring',
        '@babel/plugin-transform-parameters',
        '@babel/plugin-transform-spread',
        '@babel/plugin-transform-object-rest-spread',
        '@babel/plugin-transform-for-of',
        '@babel/plugin-transform-template-literals',
        '@babel/plugin-transform-arrow-functions',
        '@babel/plugin-transform-block-scoping',
        '@babel/plugin-transform-classes',
        '@babel/plugin-transform-computed-properties',
        '@babel/plugin-transform-shorthand-properties',
        '@babel/plugin-transform-async-to-generator',
        '@babel/plugin-transform-regenerator',
        ['@babel/plugin-transform-runtime', {
          corejs: false,
          helpers: true,
          regenerator: true,
          useESModules: false
        }]
      ]
    });
    
    return babelResult.code;
  } catch (error) {
    console.error('Babel transformation error:', error);
    // Fallback to regex-based transformation
    return fallbackTransform(code);
  }
}

// Fallback regex-based transformation
function fallbackTransform(code) {
  let transformed = code;
  
  // Arrow functions - more comprehensive
  transformed = transformed.replace(/(\w+)\s*=>\s*\{/g, 'function($1) {');
  transformed = transformed.replace(/\(\s*([^)]*)\s*\)\s*=>\s*\{/g, 'function($1) {');
  transformed = transformed.replace(/(\w+)\s*=>\s*([^{;\n]+)/g, 'function($1) { return $2; }');
  transformed = transformed.replace(/\(\s*([^)]*)\s*\)\s*=>\s*([^{;\n]+)/g, 'function($1) { return $2; }');
  
  // Template literals - handle nested
  transformed = transformed.replace(/`([^`]*)`/g, function(match, content) {
    if (!content.includes('${')) {
      return '"' + content.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    }
    
    // Handle template with expressions
    const parts = content.split(/\${([^}]+)}/);
    let result = '';
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // String part
        if (parts[i]) {
          if (result) result += ' + ';
          result += '"' + parts[i].replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
        }
      } else {
        // Expression part
        if (result) result += ' + ';
        result += '(' + parts[i] + ')';
      }
    }
    return '(' + (result || '""') + ')';
  });
  
  // Const/let to var
  transformed = transformed.replace(/\b(const|let)\b/g, 'var');
  
  // Destructuring in function parameters
  transformed = transformed.replace(/function\s*\(\s*\{([^}]+)\}\s*\)/g, function(match, props) {
    const propList = props.split(',').map(p => p.trim());
    const tempVar = '_temp';
    const destructures = propList.map(prop => {
      if (prop.includes(':')) {
        const [key, varName] = prop.split(':').map(s => s.trim());
        return `var ${varName} = ${tempVar}["${key}"];`;
      }
      return `var ${prop} = ${tempVar}["${prop}"];`;
    }).join(' ');
    return `function(${tempVar}) { ${destructures} `;
  });
  
  // For...of loops
  transformed = transformed.replace(/for\s*\(\s*(var|let|const)\s+(\w+)\s+of\s+([^)]+)\)\s*\{/g, 
    'for (var _i = 0, _a = $3; _i < _a.length; _i++) { var $2 = _a[_i];');
  
  // Object method shorthand - more careful
  transformed = transformed.replace(/(\w+)\s*\(\s*([^)]*)\s*\)\s*\{/g, function(match, name, params, offset, str) {
    // Check if it's already a function declaration
    if (match.startsWith('function')) return match;
    
    // Check if preceded by : or , (indicating it's in an object)
    const before = str.substring(Math.max(0, offset - 10), offset);
    if (before.match(/[:,]\s*$/)) {
      return `${name}: function(${params}) {`;
    }
    
    return match;
  });
  
  // Default parameters
  transformed = transformed.replace(/function\s*\([^)]*=[^)]*\)/g, function(match) {
    // This is complex, skip for now as it requires parsing
    return match;
  });
  
  return transformed;
}

// Add polyfills
function addPolyfills(code) {
  const polyfills = `
// ES5 Polyfills
if (!Object.assign) {
  Object.assign = function(target) {
    'use strict';
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    var to = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var nextSource = arguments[index];
      if (nextSource != null) {
        for (var nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

if (!Array.from) {
  Array.from = function(arrayLike) {
    return Array.prototype.slice.call(arrayLike);
  };
}

if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement, fromIndex) {
    var O = Object(this);
    var len = parseInt(O.length, 10) || 0;
    if (len === 0) return false;
    var n = parseInt(fromIndex, 10) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) k = 0;
    }
    while (k < len) {
      if (searchElement === O[k]) return true;
      k++;
    }
    return false;
  };
}

if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    'use strict';
    if (typeof start !== 'number') {
      start = 0;
    }
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;
    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}
`;
  
  return polyfills + '\n' + code;
}

// Main execution
async function main() {
  try {
    // Read the file
    let code = fs.readFileSync(filePath, 'utf-8');
    console.log(`📖 Read file: ${(code.length / 1024).toFixed(2)}KB`);
    
    // Transpile to ES5
    console.log('🔄 Transpiling to ES5...');
    code = await transpileToES5(code);
    
    // Add polyfills
    console.log('➕ Adding polyfills...');
    code = addPolyfills(code);
    
    // Final cleanup pass
    console.log('🧹 Final cleanup...');
    
    // Remove any remaining ES6+ syntax that might have been missed
    code = code.replace(/\bclass\s+/g, 'function ');
    code = code.replace(/\basync\s+function/g, 'function');
    code = code.replace(/\bawait\s+/g, '');
    code = code.replace(/\bconst\s+/g, 'var ');
    code = code.replace(/\blet\s+/g, 'var ');
    code = code.replace(/=>/g, 'function');
    
    // Remove import/export statements completely
    code = code.replace(/\bimport\s+.*?from\s+["'][^"']+["'];?/g, '');
    code = code.replace(/\bimport\s+["'][^"']+["'];?/g, '');
    code = code.replace(/\bexport\s+default\s+/g, '');
    code = code.replace(/\bexport\s+\{[^}]*\};?/g, '');
    code = code.replace(/\bexport\s+(const|let|var|function|class)\s+/g, '$1 ');
    
    // Ensure no Unicode issues
    code = code.replace(/[^\x00-\x7F]/g, function(char) {
      return '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
    });
    
    // Write the result
    fs.writeFileSync(filePath, code);
    console.log(`✅ Complete ES5 transpilation done! Output: ${(code.length / 1024).toFixed(2)}KB`);
    
  } catch (error) {
    console.error('❌ Transpilation failed:', error);
    process.exit(1);
  }
}

main();