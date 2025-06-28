#!/usr/bin/env bun
/**
 * Fix style array spreading issues in onboarding screens
 * Ensures compatibility with React Native
 */

import fs from 'fs/promises';
import path from 'path';

const colors = {
  success: '\x1b[32m',
  error: '\x1b[31m',
  info: '\x1b[34m',
  reset: '\x1b[0m',
};

async function fixStyleArrays() {
  console.log(`${colors.info}Fixing style array spreading issues...${colors.reset}\n`);

  const screensDir = path.join(process.cwd(), 'modules/onboarding/screens');
  
  try {
    const files = await fs.readdir(screensDir);
    const tsxFiles = files.filter(f => f.endsWith('.tsx'));
    
    for (const file of tsxFiles) {
      const filePath = path.join(screensDir, file);
      let content = await fs.readFile(filePath, 'utf-8');
      let modified = false;
      
      // Pattern 1: Fix style array spreading
      // From: ...(condition ? value : [])
      // To: ...(condition ? [value] : [])
      const stylePattern = /\.\.\.\(([^?]+)\?([^:]+):([^)]+)\)/g;
      
      content = content.replace(stylePattern, (match, condition, trueVal, falseVal) => {
        // Check if it's in a style array context
        const beforeMatch = content.substring(0, content.indexOf(match));
        const lastBracket = beforeMatch.lastIndexOf('[');
        const lastCloseBracket = beforeMatch.lastIndexOf(']');
        
        if (lastBracket > lastCloseBracket) {
          // We're inside an array
          const trimmedTrue = trueVal.trim();
          const trimmedFalse = falseVal.trim();
          
          // Check if true value needs wrapping
          if (!trimmedTrue.startsWith('[') && trimmedFalse.trim() === '[]') {
            modified = true;
            return `...(${condition}? [${trimmedTrue}] :${falseVal})`;
          }
        }
        
        return match;
      });
      
      // Pattern 2: Fix standalone spread at line start
      const standalonePattern = /^\s*\.\.\.([^,\]]+)(,?)$/gm;
      
      content = content.replace(standalonePattern, (match, expr, comma) => {
        if (!expr.trim().startsWith('[')) {
          modified = true;
          return `                ${match.trim()}`; // Add proper indentation
        }
        return match;
      });
      
      if (modified) {
        await fs.writeFile(filePath, content);
        console.log(`${colors.success}✓ Fixed ${file}${colors.reset}`);
      } else {
        console.log(`${colors.info}  No changes needed in ${file}${colors.reset}`);
      }
    }
    
    console.log(`\n${colors.success}✓ Style array fixes completed${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.error}Error fixing styles:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run the fix
fixStyleArrays();