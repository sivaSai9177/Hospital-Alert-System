#!/usr/bin/env bun
/**
 * Test script for token sync functionality
 */

import { mapTokensToFigma } from '../src/extractors/unified-token-mapper';

console.log('🧪 Testing Token Sync System\n');

async function testTokenExtraction() {
  console.log('📦 Testing token extraction from codebase...');
  
  try {
    const tokens = mapTokensToFigma();
    
    console.log('\n✅ Successfully extracted tokens:');
    console.log(`  - Color variables: ${tokens.colors.variables.length}`);
    console.log(`  - Color modes: ${tokens.colors.modes.map(m => m.name).join(', ')}`);
    console.log(`  - Spacing variables: ${tokens.spacing.variables.length}`);
    console.log(`  - Spacing modes: ${tokens.spacing.modes.map(m => m.name).join(', ')}`);
    console.log(`  - Typography styles: ${tokens.typography.length}`);
    console.log(`  - Shadow effects: ${tokens.effects.shadows.length}`);
    console.log(`  - Border radius tokens: ${tokens.effects.borderRadius.length}`);
    
    // Show sample tokens
    console.log('\n📋 Sample tokens:');
    
    // Sample color
    const sampleColor = tokens.colors.variables[0];
    if (sampleColor) {
      console.log(`\n  Color: ${sampleColor.name}`);
      console.log(`    Type: ${sampleColor.type}`);
      console.log(`    Modes: ${Object.keys(sampleColor.valuesByMode).join(', ')}`);
    }
    
    // Sample spacing
    const sampleSpacing = tokens.spacing.variables[5];
    if (sampleSpacing) {
      console.log(`\n  Spacing: ${sampleSpacing.name}`);
      console.log(`    Values: ${JSON.stringify(sampleSpacing.valuesByMode)}`);
    }
    
    // Sample typography
    const sampleTypo = tokens.typography[0];
    if (sampleTypo) {
      console.log(`\n  Typography: ${sampleTypo.name}`);
      console.log(`    Font size: ${sampleTypo.fontSize}px`);
      console.log(`    Font weight: ${sampleTypo.fontWeight}`);
    }
    
    return tokens;
  } catch (error) {
    console.error('❌ Failed to extract tokens:', error);
    throw error;
  }
}

async function testServerConnection() {
  console.log('\n\n🔌 Testing server connection...');
  
  const serverUrl = 'http://localhost:3457';
  
  try {
    const response = await fetch(`${serverUrl}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server is running:', data);
    } else {
      console.log('❌ Server returned error:', response.status);
    }
  } catch (error) {
    console.log('⚠️  Server not running. Start it with: bun run token:server');
  }
}

async function testTokenSync() {
  console.log('\n\n🔄 Testing token sync to server...');
  
  const serverUrl = 'http://localhost:3457';
  
  try {
    // First extract tokens
    const tokens = await testTokenExtraction();
    
    // Then sync to server
    const response = await fetch(`${serverUrl}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'sync-to-code',
        tokens,
        config: {
          source: 'test-script'
        }
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ Tokens synced successfully:', result);
    } else {
      console.log('❌ Sync failed:', response.status);
    }
  } catch (error) {
    console.log('⚠️  Could not sync tokens. Make sure server is running.');
  }
}

// Run tests
async function runTests() {
  await testTokenExtraction();
  await testServerConnection();
  // Uncomment to test sync (requires server running)
  // await testTokenSync();
  
  console.log('\n\n✨ Token sync system test complete!');
  console.log('\nTo start the token sync server, run:');
  console.log('  bun run token:server');
  console.log('\nTo start the MCP server, run:');
  console.log('  bun run mcp:server');
}

runTests().catch(console.error);