const path = require('path');

module.exports = {
  mode: 'production',
  entry: ['./src/polyfills.js', './src/code.ts'],
  
  output: {
    filename: 'code.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    // Figma expects a simple script, not a module
    iife: true
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
      '@ui': path.resolve(__dirname, 'src/ui')
    }
  },
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
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
              downlevelIteration: true,
              importHelpers: false,
              noEmitHelpers: false,
              removeComments: true
            }
          }
        }
      }
    ]
  },
  
  optimization: {
    minimize: true,
    splitChunks: false,
    runtimeChunk: false
  },
  
  externals: {
    figma: 'figma'
  }
};