const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/code-with-polyfills.ts',
  
  output: {
    filename: 'code.js',
    path: path.resolve(__dirname, '../dist'),
    clean: true,
    environment: {
      // Disable all ES6+ features
      arrowFunction: false,
      bigIntLiteral: false,
      const: false,
      destructuring: false,
      dynamicImport: false,
      forOf: false,
      module: false,
      optionalChaining: false,
      templateLiteral: false,
    },
  },
  
  target: ['web', 'es5'],
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@handlers': path.resolve(__dirname, '../src/handlers'),
      '@utils': path.resolve(__dirname, '../src/utils'),
      '@types': path.resolve(__dirname, '../src/types'),
      '@lib': path.resolve(__dirname, '../src/lib'),
      '@ui': path.resolve(__dirname, '../src/ui'),
    },
  },
  
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-typescript',
                ['@babel/preset-env', {
                  targets: {
                    ie: '9',
                  },
                  modules: 'commonjs',
                  useBuiltIns: 'usage',
                  corejs: 3,
                  debug: false,
                  forceAllTransforms: true,
                  loose: false,
                  spec: true,
                  bugfixes: false,
                  ignoreBrowserslistConfig: true,
                  exclude: []
                }]
              ],
              plugins: [
                // Class properties must come FIRST, before any class transforms
                ['@babel/plugin-proposal-class-properties', { loose: false }],
                // Then arrow functions (often used in class properties)
                '@babel/plugin-transform-arrow-functions',
                // Then classes
                '@babel/plugin-transform-classes',
                // Order matters - destructuring should come before parameters
                ['@babel/plugin-transform-destructuring', { loose: false, useBuiltIns: true }],
                ['@babel/plugin-transform-parameters', { loose: false }],
                ['@babel/plugin-transform-spread', { loose: false }],
                '@babel/plugin-transform-object-rest-spread',
                '@babel/plugin-transform-block-scoping',
                '@babel/plugin-transform-computed-properties',
                '@babel/plugin-transform-for-of',
                '@babel/plugin-transform-function-name',
                '@babel/plugin-transform-literals',
                '@babel/plugin-transform-object-super',
                '@babel/plugin-transform-shorthand-properties',
                '@babel/plugin-transform-template-literals',
                '@babel/plugin-transform-typeof-symbol',
                '@babel/plugin-transform-unicode-regex',
                '@babel/plugin-transform-sticky-regex',
                '@babel/plugin-transform-async-to-generator',
                '@babel/plugin-transform-regenerator',
                '@babel/plugin-transform-exponentiation-operator',
                '@babel/plugin-transform-modules-commonjs',
                ['@babel/plugin-transform-runtime', {
                  corejs: false,
                  helpers: true,
                  regenerator: true,
                  useESModules: false,
                  version: '^7.27.0'
                }]
              ],
              cacheDirectory: false,
              compact: true,
              minified: false,
              comments: false,
              retainLines: false,
              highlightCode: false,
            }
          }
        ],
        // Include ALL node_modules for transpilation
        include: [
          path.resolve(__dirname, '../src'),
          path.resolve(__dirname, '../node_modules')
        ],
      },
    ],
  },
  
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 5,
          warnings: false,
          parse: {
            ecma: 5,
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
            drop_console: false,
            drop_debugger: true,
            pure_funcs: ['console.debug'],
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
            beautify: false,
            indent_level: 0,
          },
          ie8: true,
        },
        extractComments: false,
        parallel: true,
      }),
    ],
    splitChunks: false,
    runtimeChunk: false,
  },
  
  externals: {
    figma: 'figma',
  },
  
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    
    // Add a custom plugin to do final ES5 cleanup
    {
      apply: (compiler) => {
        compiler.hooks.emit.tapAsync('ES5CleanupPlugin', (compilation, callback) => {
          Object.keys(compilation.assets).forEach((filename) => {
            if (filename.endsWith('.js')) {
              let source = compilation.assets[filename].source();
              
              // Remove any remaining ES6+ syntax
              source = source.replace(/\bimport\s+/g, '');
              source = source.replace(/\bexport\s+/g, '');
              source = source.replace(/=>/g, 'function');
              source = source.replace(/`/g, '"');
              source = source.replace(/\bconst\s+/g, 'var ');
              source = source.replace(/\blet\s+/g, 'var ');
              
              compilation.assets[filename] = {
                source: () => source,
                size: () => source.length
              };
            }
          });
          callback();
        });
      }
    }
  ],
  
  performance: {
    hints: false,
  },
  
  stats: 'errors-warnings',
};