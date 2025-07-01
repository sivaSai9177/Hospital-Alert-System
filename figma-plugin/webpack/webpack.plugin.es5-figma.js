const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'none', // No default optimizations
  entry: './src/code.ts',
  
  output: {
    filename: 'code.js',
    path: path.resolve(__dirname, '../dist'),
    clean: true,
    // No library wrapper, we'll add our own
  },
  
  target: 'web',
  
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
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: {
              target: 'ES5',
              module: 'commonjs',
              lib: ['es5', 'dom'],
              downlevelIteration: true,
              importHelpers: false,
              esModuleInterop: true,
              removeComments: true,
              strict: false,
            }
          }
        },
        exclude: /node_modules/,
      },
    ],
  },
  
  optimization: {
    minimize: false, // We'll minify manually
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