const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: [
    './src/polyfills.js',
    './src/code.ts'
  ],
  
  output: {
    filename: 'code.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    iife: true,
    environment: {
      // Ensure output is ES5 compatible
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
      '@shared': path.resolve(__dirname, 'shared'),
      '@handlers': path.resolve(__dirname, 'src/handlers'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@ui': path.resolve(__dirname, 'src/ui'),
    },
  },
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: {
              target: 'ES5',
              module: 'commonjs',
              lib: ['ES5', 'DOM'],
              jsx: 'react',
              strict: false,
              esModuleInterop: true,
              skipLibCheck: true,
              forceConsistentCasingInFileNames: true,
              resolveJsonModule: true,
              isolatedModules: false,
              useDefineForClassFields: false,
              downlevelIteration: true,
              importHelpers: false,
              noEmitHelpers: false,
              removeComments: true,
            }
          }
        }
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
            pure_funcs: ['console.log'],
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