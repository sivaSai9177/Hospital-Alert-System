#!/usr/bin/env node

// This script clears the cached API endpoint from AsyncStorage
// Run this to force the app to re-resolve the API endpoint

const { exec } = require('child_process');
const path = require('path');

console.log('🧹 Clearing cached API endpoint...\n');

// For React Native apps, we need to clear AsyncStorage
// This requires the app to be running, so we'll add a clear mechanism

// Clear web localStorage (if testing on web)
if (typeof localStorage !== 'undefined') {
  try {
    localStorage.removeItem('WORKING_API_ENDPOINT');
    console.log('✅ Cleared web localStorage');
  } catch (e) {
    console.log('ℹ️  Web localStorage not available');
  }
}

// Clear Expo cache directories
const cacheDirs = [
  '.expo',
  'node_modules/.cache',
  'dist',
  'web-build',
];

cacheDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  exec(`rm -rf "${fullPath}"`, (error) => {
    if (!error) {
      console.log(`✅ Cleared ${dir}`);
    }
  });
});

console.log('\n📱 To clear AsyncStorage on device:');
console.log('1. Delete and reinstall the Expo Go app, or');
console.log('2. Clear app data in device settings');
console.log('\n🔄 The app will re-resolve the API endpoint on next launch');