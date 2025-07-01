console.log('🔥 Test script loaded immediately!');

// Test basic DOM manipulation
document.addEventListener('DOMContentLoaded', () => {
  console.log('📋 DOM Content Loaded');
  const root = document.getElementById('root');
  if (root) {
    console.log('✅ Found root element');
    root.innerHTML = '<h1 style="color: green;">Test Script Working!</h1>';
  } else {
    console.error('❌ Root element not found');
  }
});

// Also try immediate execution
const immediateRoot = document.getElementById('root');
console.log('🔍 Immediate root check:', immediateRoot);

// Log any errors
window.addEventListener('error', (e) => {
  console.error('🚨 Window error:', e);
});