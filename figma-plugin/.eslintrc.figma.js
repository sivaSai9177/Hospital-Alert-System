module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'es5'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  env: {
    browser: true,
    es5: true
  },
  parserOptions: {
    ecmaVersion: 5,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  rules: {
    // ES5 compatibility rules
    'no-var': 'off',
    'prefer-const': 'off',
    'no-restricted-syntax': [
      'error',
      {
        selector: 'SpreadElement',
        message: 'Spread operator is not supported in Figma. Use Object.assign() or Array methods.'
      },
      {
        selector: 'ArrowFunctionExpression',
        message: 'Arrow functions may not be supported. Use function expressions.'
      },
      {
        selector: 'TemplateLiteral',
        message: 'Template literals are not supported. Use string concatenation.'
      },
      {
        selector: 'ClassDeclaration[body.body.0.type="PropertyDefinition"]',
        message: 'Class fields are not supported. Initialize in constructor.'
      },
      {
        selector: 'OptionalMemberExpression',
        message: 'Optional chaining is not supported. Use && checks.'
      },
      {
        selector: 'LogicalExpression[operator="??"]',
        message: 'Nullish coalescing is not supported. Use || or explicit checks.'
      }
    ],
    'comma-dangle': ['error', 'never'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'no-multi-str': 'error'
  },
  globals: {
    figma: 'readonly',
    WebSocket: 'readonly'
  }
};