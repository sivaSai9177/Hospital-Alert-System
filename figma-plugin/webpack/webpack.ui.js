const path = require('path');
const { merge } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const common = require('./webpack.common');

module.exports = merge(common, {
  entry: './src/ui/main.tsx',
  
  output: {
    filename: 'ui.bundle.js',
    path: path.resolve(__dirname, '../dist'),
    clean: false, // Preserve code.js
  },

  target: ['web', 'es5'],

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/ui/index.html',
      filename: 'index.html',
      inject: 'body',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true,
      },
      // Inline all assets for Figma
      inlineSource: '.(js|css)$',
    }),
  ],

  optimization: {
    // Single bundle for Figma UI
    splitChunks: false,
    runtimeChunk: false,
  },

  devtool: false,
});