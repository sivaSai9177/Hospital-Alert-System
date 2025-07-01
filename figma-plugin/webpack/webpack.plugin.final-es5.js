const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    code: ['./src/polyfills.js', './src/main.ts']
  },
  
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../dist'),
    clean: true,
    iife: true,
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
        test: /\.tsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    ie: '11',
                    browsers: ['> 0.5%', 'ie 11']
                  },
                  modules: false,
                  useBuiltIns: false,
                  forceAllTransforms: true,
                  loose: true
                }]
              ],
              plugins: [
                ['@babel/plugin-transform-typescript', {
                  isTSX: true,
                  allExtensions: true
                }],
                ['@babel/plugin-transform-runtime', {
                  helpers: false,
                  regenerator: false
                }],
                '@babel/plugin-transform-arrow-functions',
                '@babel/plugin-transform-block-scoping',
                '@babel/plugin-transform-template-literals',
                '@babel/plugin-transform-parameters',
                '@babel/plugin-transform-destructuring',
                '@babel/plugin-transform-spread',
                '@babel/plugin-transform-for-of',
                '@babel/plugin-transform-classes',
                '@babel/plugin-transform-object-rest-spread',
                '@babel/plugin-transform-async-to-generator',
                ['@babel/plugin-proposal-class-properties', { loose: true }]
              ]
            }
          }
        ],
        include: [
          path.resolve(__dirname, '../src'),
          path.resolve(__dirname, '../shared'),
          path.resolve(__dirname, '../node_modules')
        ]
      },
      {
        test: /\.jsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    ie: '11'
                  },
                  modules: false,
                  useBuiltIns: false,
                  forceAllTransforms: true,
                  loose: true
                }]
              ]
            }
          }
        ],
        include: [
          path.resolve(__dirname, '../node_modules')
        ]
      }
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
            passes: 3,
            dead_code: true,
            pure_funcs: ['console.log']
          },
          mangle: {
            safari10: true,
            reserved: ['figma']
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
            quote_style: 3,
            wrap_iife: true,
          },
          ie8: true,
          keep_fnames: false,
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
  ],
  
  performance: {
    hints: false,
  },
  
  stats: 'errors-warnings',
};