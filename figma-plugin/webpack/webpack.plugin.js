const path = require('path');
const { merge } = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const common = require('./webpack.common');

module.exports = (env, argv) => {
  const isAnalyze = env && env.analyze;
  
  return merge(common, {
    entry: './src/code-with-polyfills.ts',
    
    output: {
      filename: 'code.js',
      path: path.resolve(__dirname, '../dist'),
      clean: false, // Don't clean, we need to preserve index.html
    },

    target: ['web', 'es5'],

    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            ecma: 5,
            compress: {
              drop_console: false, // Keep console logs for debugging
              drop_debugger: true,
              pure_funcs: ['console.debug'],
            },
            format: {
              comments: false,
              ascii_only: true,
              beautify: false,
              ecma: 5,
            },
            mangle: {
              safari10: true,
            },
          },
          extractComments: false,
        }),
      ],
      // Don't split chunks for Figma plugin
      splitChunks: false,
      runtimeChunk: false,
    },

    externals: {
      // Figma API is available globally
      figma: 'figma',
    },

    plugins: [
      ...(isAnalyze ? [new BundleAnalyzerPlugin()] : []),
    ],

    // Figma plugins don't support source maps
    devtool: false,
  });
};