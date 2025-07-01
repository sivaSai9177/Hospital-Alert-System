const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './src/code.ts',
  
  output: {
    filename: 'code.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  
  target: 'es5',
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
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
              target: 'ES3',
              module: 'commonjs',
              lib: ['ES5', 'DOM'],
              downlevelIteration: true,
              importHelpers: false,
              noEmitHelpers: false,
              strict: false,
              esModuleInterop: false,
              allowSyntheticDefaultImports: false,
              forceConsistentCasingInFileNames: false,
              removeComments: true
            }
          }
        }
      }
    ]
  },
  
  optimization: {
    minimize: false // Disable minification to debug issues
  },
  
  externals: {
    figma: 'figma'
  },
  
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ]
};