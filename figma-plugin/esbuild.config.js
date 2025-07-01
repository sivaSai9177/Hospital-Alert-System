const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/code.ts'],
  bundle: true,
  outfile: 'dist/code.js',
  target: 'es2015', // Target ES2015 for better compatibility
  platform: 'browser',
  format: 'iife',
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  // Transform modern JavaScript to older syntax
  supported: {
    'class-fields': false,
    'optional-chaining': false,
    'nullish-coalescing': false,
    'logical-assignment': false,
    'numeric-separator': false,
    'object-rest-spread': false,
    'async-await': true,
    'arrow': true,
    'const-and-let': true,
    'default-argument': true,
    'destructuring': true,
    'for-of': true,
    'generator': false,
    'template-literal': true,
  },
  minify: false, // Don't minify for better debugging
  sourcemap: false,
  external: [],
  plugins: [],
};

if (isWatch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch();
    console.log('Watching for changes...');
  });
} else {
  esbuild.build(buildOptions).catch(() => process.exit(1));
}