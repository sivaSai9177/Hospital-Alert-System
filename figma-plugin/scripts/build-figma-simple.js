#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎨 Building Figma plugin with embedded HTML...\n');

// Step 1: Try to build UI or use existing
console.log('1️⃣ Preparing UI...');
try {
  execSync('bunx vite build', { stdio: 'inherit' });
} catch (e) {
  console.log('  Skipping vite build, using simple HTML');
}

// Step 2: Read the built HTML
const htmlPath = path.join(__dirname, '../dist/index.html');
let html = '';
if (fs.existsSync(htmlPath)) {
  html = fs.readFileSync(htmlPath, 'utf8');
  // Escape the HTML for embedding
  html = html.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
} else {
  // Use a simple HTML template
  html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Inter, sans-serif; padding: 20px; }
    button { padding: 8px 16px; margin: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <h2>Design System Agent</h2>
  <button onclick="parent.postMessage({pluginMessage:{type:'EXTRACT_TOKENS'}},'*')">Extract Tokens</button>
  <div id="status"></div>
  <script>
    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      if (msg) {
        document.getElementById('status').innerText = JSON.stringify(msg, null, 2);
      }
    };
  </script>
</body>
</html>`.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

// Step 3: Create a simple plugin code
const pluginCode = `
// Figma Plugin Code (ES5)
var __html__ = '${html}';

// Show UI
figma.showUI(__html__, {
  width: 600,
  height: 400,
  title: 'Design System Agent'
});

// Handle messages from UI
figma.ui.onmessage = function(msg) {
  console.log('Received message:', msg);
  
  if (msg.type === 'EXTRACT_TOKENS') {
    var selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'ERROR',
        message: 'Please select something first'
      });
      return;
    }
    
    var tokens = [];
    for (var i = 0; i < selection.length; i++) {
      var node = selection[i];
      tokens.push({
        name: node.name,
        type: node.type,
        id: node.id
      });
    }
    
    figma.ui.postMessage({
      type: 'TOKENS_EXTRACTED',
      tokens: tokens
    });
  }
};

// Initial message
figma.ui.postMessage({
  type: 'READY',
  message: 'Plugin loaded'
});
`;

// Step 4: Write the plugin code
const outputPath = path.join(__dirname, '../dist/code.js');
fs.writeFileSync(outputPath, pluginCode);

console.log('\n✅ Build complete!');
console.log('📁 Output: dist/code.js');
console.log('\nThe plugin is a simple ES5-compatible version that should work in Figma.');