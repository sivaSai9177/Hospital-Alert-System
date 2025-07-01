const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  
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
        test: /\.(tsx?|jsx?|js)$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    targets: {
                      ie: '9',
                    },
                    modules: 'commonjs',
                    useBuiltIns: 'usage',
                    corejs: 3,
                    debug: false,
                    forceAllTransforms: true,
                    loose: false,
                    bugfixes: false,
                  },
                ],
                '@babel/preset-typescript',
              ],
              plugins: [
                ['@babel/plugin-transform-destructuring', { loose: false }],
                ['@babel/plugin-transform-parameters', { loose: false }],
                '@babel/plugin-transform-object-rest-spread',
                '@babel/plugin-transform-spread',
                '@babel/plugin-transform-for-of',
                '@babel/plugin-transform-classes',
                '@babel/plugin-transform-async-to-generator',
                '@babel/plugin-transform-regenerator',
                [
                  '@babel/plugin-transform-runtime',
                  {
                    corejs: false,
                    helpers: true,
                    regenerator: true,
                    useESModules: false,
                  },
                ],
              ],
            },
          },
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              compilerOptions: {
                target: 'ES5',
                module: 'ESNext',
                lib: ['ES5', 'DOM', 'ES2015.Promise'],
              },
            },
          },
        ],
        exclude: /node_modules\/(?!.)/,  // Transpile ALL node_modules
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },

  optimization: {
    minimize: true,
    moduleIds: 'deterministic',
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    // Provide polyfills for Node.js globals
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
};