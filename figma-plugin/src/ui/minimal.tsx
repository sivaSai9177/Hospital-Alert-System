// First thing - log to console
console.log('🚀 Minimal script executing!');

// Test if we can access the DOM
const root = document.getElementById('root');
console.log('🎯 Root element found:', root);

if (root) {
  root.innerHTML = '<h1 style="color: blue; padding: 20px;">Minimal Script Works!</h1>';
}

// Export something to make it a module
export {};