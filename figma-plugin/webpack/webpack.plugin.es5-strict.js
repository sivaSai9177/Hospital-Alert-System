const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/main.ts',
  
  output: {
    filename: 'code.js',
    path: path.resolve(__dirname, '../dist'),
    clean: true,
    environment: {
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
                ['@babel/preset-env', {
                  targets: {
                    ie: '11',
                  },
                  useBuiltIns: false,
                  modules: 'commonjs',
                  forceAllTransforms: true,
                }],
                '@babel/preset-typescript',
              ],
              plugins: [
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-transform-runtime',
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
                '@babel/plugin-transform-typeof-symbol',
                '@babel/plugin-transform-unicode-regex',
                '@babel/plugin-transform-regenerator',
                '@babel/plugin-transform-object-rest-spread',
                '@babel/plugin-transform-async-to-generator',
                '@babel/plugin-transform-exponentiation-operator',
                '@babel/plugin-transform-modules-commonjs',
              ],
            },
          },
        ],
        // DO NOT exclude node_modules - we need to transpile everything
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
            dead_code: true,
            evaluate: true,
            sequences: true,
            booleans: true,
            loops: true,
            unused: true,
            hoist_funs: true,
            if_return: true,
            join_vars: true,
            reduce_vars: true,
            collapse_vars: true,
            negate_iife: true,
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
            quote_style: 3,
            wrap_iife: true,
            wrap_func_args: true,
          },
          ie8: true,
        },
        extractComments: false,
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
  ],
  
  performance: {
    hints: false,
  },
  
  stats: 'errors-warnings',
};