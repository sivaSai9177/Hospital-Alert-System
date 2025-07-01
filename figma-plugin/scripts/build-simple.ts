#!/usr/bin/env bun
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Build simple UI
async function buildSimpleUI() {
  const outputDir = join(process.cwd(), 'dist');
  const outputPath = join(outputDir, 'ui.html');
  const sourcePath = join(process.cwd(), 'src/ui/simple.html');
  
  // Ensure dist directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Copy the simple HTML file to dist
  copyFileSync(sourcePath, outputPath);
  console.log(`✓ Copied simple ui.html to dist at ${new Date().toLocaleTimeString()}`);
}

// Build
buildSimpleUI();