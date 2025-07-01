// Core ES5 polyfills for Figma plugin environment
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Specific polyfills needed for ES5 compatibility
import 'core-js/es/promise';
import 'core-js/es/object';
import 'core-js/es/array';
import 'core-js/es/string';
import 'core-js/es/symbol';
import 'core-js/es/map';
import 'core-js/es/set';
import 'core-js/es/weak-map';
import 'core-js/es/weak-set';

// Async/await support
import 'core-js/es/promise/finally';
import 'core-js/es/promise/all-settled';

// Array methods
import 'core-js/es/array/from';
import 'core-js/es/array/of';
import 'core-js/es/array/includes';
import 'core-js/es/array/find';
import 'core-js/es/array/find-index';
import 'core-js/es/array/fill';
import 'core-js/es/array/flat';
import 'core-js/es/array/flat-map';

// Object methods
import 'core-js/es/object/assign';
import 'core-js/es/object/entries';
import 'core-js/es/object/values';
import 'core-js/es/object/from-entries';

// String methods
import 'core-js/es/string/includes';
import 'core-js/es/string/starts-with';
import 'core-js/es/string/ends-with';
import 'core-js/es/string/repeat';
import 'core-js/es/string/pad-start';
import 'core-js/es/string/pad-end';

// Number methods
import 'core-js/es/number/is-finite';
import 'core-js/es/number/is-integer';
import 'core-js/es/number/is-nan';
import 'core-js/es/number/is-safe-integer';

// Console polyfill for older environments
if (typeof console === 'undefined') {
  (window as any).console = {
    log: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
  };
}