#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const generate = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');

const filePath = path.resolve(__dirname, '../dist/code.js');

console.log('🔧 Post-processing for ES5 compatibility...');

try {
  const code = fs.readFileSync(filePath, 'utf-8');
  
  // Parse the code
  const ast = parse(code, {
    sourceType: 'script',
    plugins: [],
  });
  
  let hasChanges = false;
  
  // Transform destructuring in function parameters
  traverse(ast, {
    FunctionExpression(path) {
      const params = path.node.params;
      const newParams = [];
      const destructuringAssignments = [];
      
      params.forEach((param, index) => {
        if (t.isArrayPattern(param) || t.isObjectPattern(param)) {
          // Create a temporary variable
          const tempVar = t.identifier(`_temp${index}`);
          newParams.push(tempVar);
          
          // Create assignment from temp to destructured pattern
          const assignment = t.variableDeclaration('var', [
            t.variableDeclarator(param, tempVar)
          ]);
          destructuringAssignments.push(assignment);
          hasChanges = true;
        } else {
          newParams.push(param);
        }
      });
      
      if (destructuringAssignments.length > 0) {
        path.node.params = newParams;
        path.node.body.body.unshift(...destructuringAssignments);
      }
    },
    
    ArrowFunctionExpression(path) {
      // Convert arrow functions to regular functions
      const { params, body, async } = path.node;
      
      let functionBody;
      if (t.isBlockStatement(body)) {
        functionBody = body;
      } else {
        // Expression body, wrap in return statement
        functionBody = t.blockStatement([
          t.returnStatement(body)
        ]);
      }
      
      const functionExpression = t.functionExpression(
        null,
        params,
        functionBody,
        false,
        async
      );
      
      path.replaceWith(functionExpression);
      hasChanges = true;
    },
    
    // Handle template literals
    TemplateLiteral(path) {
      const { quasis, expressions } = path.node;
      
      if (expressions.length === 0) {
        // No expressions, just a string
        path.replaceWith(t.stringLiteral(quasis[0].value.cooked));
      } else {
        // Build concatenation
        let result = null;
        
        for (let i = 0; i < quasis.length; i++) {
          const quasi = quasis[i];
          const expr = expressions[i];
          
          if (quasi.value.cooked) {
            const str = t.stringLiteral(quasi.value.cooked);
            result = result ? t.binaryExpression('+', result, str) : str;
          }
          
          if (expr) {
            result = result ? t.binaryExpression('+', result, expr) : expr;
          }
        }
        
        if (result) {
          path.replaceWith(result);
        }
      }
      hasChanges = true;
    },
    
    // Handle const/let -> var
    VariableDeclaration(path) {
      if (path.node.kind === 'const' || path.node.kind === 'let') {
        path.node.kind = 'var';
        hasChanges = true;
      }
    },
    
    // Handle class declarations
    ClassDeclaration(path) {
      const className = path.node.id.name;
      const superClass = path.node.superClass;
      
      // Convert to function constructor
      const constructor = path.node.body.body.find(
        method => method.kind === 'constructor'
      );
      
      const constructorParams = constructor ? constructor.params : [];
      const constructorBody = constructor ? constructor.body : t.blockStatement([]);
      
      // Create function declaration
      const functionDeclaration = t.functionDeclaration(
        t.identifier(className),
        constructorParams,
        constructorBody
      );
      
      const statements = [functionDeclaration];
      
      // Handle methods
      path.node.body.body.forEach(method => {
        if (method.kind !== 'constructor') {
          const assignment = t.expressionStatement(
            t.assignmentExpression(
              '=',
              t.memberExpression(
                t.memberExpression(
                  t.identifier(className),
                  t.identifier('prototype')
                ),
                t.identifier(method.key.name)
              ),
              t.functionExpression(null, method.params, method.body)
            )
          );
          statements.push(assignment);
        }
      });
      
      path.replaceWithMultiple(statements);
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    // Generate the transformed code
    const output = generate(ast, {
      compact: false,
      comments: false,
    });
    
    // Write back to file
    fs.writeFileSync(filePath, output.code);
    console.log('✅ ES5 post-processing complete');
  } else {
    console.log('ℹ️ No ES5 transformations needed');
  }
  
} catch (error) {
  console.error('❌ Post-processing failed:', error.message);
  process.exit(1);
}