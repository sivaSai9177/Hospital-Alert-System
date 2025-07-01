module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          ie: '9',
          firefox: '10',
          chrome: '10',
          safari: '5.1'
        },
        modules: 'commonjs',
        useBuiltIns: 'usage',
        corejs: 3,
        debug: false,
        forceAllTransforms: true,
        loose: false,
        spec: true,
        bugfixes: false,
        exclude: [] // Don't exclude any transforms
      }
    ],
    '@babel/preset-typescript'
  ],
  plugins: [
    // Core transforms
    '@babel/plugin-transform-arrow-functions',
    '@babel/plugin-transform-block-scoping',
    '@babel/plugin-transform-classes',
    '@babel/plugin-transform-computed-properties',
    ['@babel/plugin-transform-destructuring', { loose: false, useBuiltIns: true }],
    '@babel/plugin-transform-for-of',
    '@babel/plugin-transform-function-name',
    '@babel/plugin-transform-literals',
    '@babel/plugin-transform-object-super',
    ['@babel/plugin-transform-parameters', { loose: false }],
    '@babel/plugin-transform-shorthand-properties',
    ['@babel/plugin-transform-spread', { loose: false }],
    '@babel/plugin-transform-sticky-regex',
    '@babel/plugin-transform-template-literals',
    '@babel/plugin-transform-typeof-symbol',
    '@babel/plugin-transform-unicode-regex',
    
    // ES2015+ transforms
    '@babel/plugin-transform-exponentiation-operator',
    '@babel/plugin-transform-async-to-generator',
    '@babel/plugin-transform-regenerator',
    ['@babel/plugin-transform-object-rest-spread', { loose: false, useBuiltIns: true }],
    
    
    // Runtime
    [
      '@babel/plugin-transform-runtime',
      {
        corejs: false,
        helpers: true,
        regenerator: true,
        useESModules: false,
        version: '^7.27.0'
      }
    ]
  ],
  // Ensure we process everything
  ignore: [],
  // Source maps for debugging
  sourceMaps: false,
  // Minify output
  minified: false,
  // Comments
  comments: false
};