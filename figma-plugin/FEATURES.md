# Universal Design System Sync - Feature Guide

## Table of Contents
1. [Extract Tokens from Figma](#extract-tokens-from-figma)
2. [Sync from Code to Figma](#sync-from-code-to-figma)
3. [Sync from Figma to Code](#sync-from-figma-to-code)
4. [Export and Import Tokens](#export-and-import-tokens)
5. [Error Recovery System](#error-recovery-system)
6. [Progress Tracking](#progress-tracking)
7. [Code Generation](#code-generation)
8. [Best Practices](#best-practices)

## Extract Tokens from Figma

### Overview
Extract all design tokens from your current Figma file, including colors, typography, spacing, effects, and more.

### How to Use
1. Open your Figma file with existing designs
2. Run the plugin (Plugins → Universal Design System Sync)
3. Click the **"Extract Tokens"** button
4. View extracted tokens organized by category

### What Gets Extracted
- **Colors**: From fills, strokes, and color variables
- **Typography**: Text styles including font, size, weight, line height
- **Spacing**: Gap values, padding, and spacing variables
- **Shadows**: Drop shadow and inner shadow effects
- **Border Radius**: Corner radius values

### Example Output
```
📊 Extracted Tokens from Figma
🎨 Colors (27)
  - background/default/light
  - foreground/default/light
  - card/default/light
  + 24 more colors

📝 Typography (33)
  - display-large/compact
  - display-large/medium
  + 31 more styles
```

## Sync from Code to Figma

### Overview
Import your design tokens from your codebase directly into Figma, creating Variables and Styles automatically.

### How to Use
1. Ensure your code files are in the expected locations:
   - `app/global.css` - CSS variables
   - `lib/theme/index.ts` - Theme configuration
   - `lib/design/spacing.ts` - Spacing system
2. Click **"← Sync from Code"** button
3. Watch real-time progress as tokens are applied
4. Check the Variables panel in Figma to see imported tokens

### What Gets Synced
- **Color Variables**: Creates color variables with proper scoping
- **Spacing Variables**: Numeric variables for gaps and padding
- **Typography Styles**: Text styles with all properties
- **Effect Styles**: Shadow effects with proper layering

### Progress Tracking
```
Syncing Tokens...
🎨 Colors
Progress: 27/27 completed ✅

📏 Spacing  
Progress: 51/51 completed ✅

📝 Typography ⏳
Progress: 15/33 completed
- display-large/compact ✅
- display-large/medium ✅
- display-large/large ⏳
```

## Sync from Figma to Code

### Overview
Generate production-ready code files from your Figma tokens in multiple formats.

### How to Use
1. First, extract tokens using "Extract Tokens" button
2. Click **"Sync to Code →"** button (appears after extraction)
3. Review generated code files
4. Click "Copy" button for each file you need
5. Paste into your project

### Generated Files

#### CSS Variables (`app/global-generated.css`)
```css
/* Generated from Figma tokens */
:root {
  --background-default-light: rgb(255, 255, 255);
  --foreground-default-light: rgb(10, 10, 10);
  --card-default-light: rgb(255, 255, 255);
  --primary-default-light: rgb(0, 102, 255);
  /* ... more variables */
}
```

#### TypeScript Theme (`lib/theme/generated-tokens.ts`)
```typescript
// Generated from Figma tokens
export const theme = {
  colors: {
    background_default_light: 'rgb(255, 255, 255)',
    foreground_default_light: 'rgb(10, 10, 10)',
    // ... more colors
  },
  spacing: {
    spacing_0: 0,
    spacing_1: 4,
    spacing_2: 8,
    // ... more spacing
  },
  typography: {
    display_large_compact: {
      fontSize: 48,
      fontWeight: 700,
      lineHeight: 57.6,
      letterSpacing: -0.96,
    },
    // ... more typography
  }
};
```

#### Tailwind Config (`tailwind-tokens.config.js`)
```javascript
// Generated from Figma tokens
module.exports = {
  theme: {
    extend: {
      colors: {
        'background': {
          'default-light': 'rgb(255, 255, 255)',
          'default-dark': 'rgb(10, 10, 10)',
        },
        'foreground': {
          'default-light': 'rgb(10, 10, 10)',
          'default-dark': 'rgb(250, 250, 250)',
        }
      },
      spacing: {
        'spacing-0': '0px',
        'spacing-1': '4px',
        'spacing-2': '8px',
      }
    }
  }
};
```

## Export and Import Tokens

### Export Tokens
Save your current tokens as a JSON file for backup or sharing.

#### How to Export
1. Extract tokens from Figma first
2. Click **"📥 Export JSON"** button
3. File downloads automatically with timestamp
4. Example: `design-tokens-2024-01-15.json`

#### Export Format
```json
{
  "tokens": {
    "colors": [...],
    "typography": [...],
    "spacing": [...],
    "shadows": [...],
    "borderRadius": [...]
  },
  "metadata": {
    "version": "1.0.0",
    "exportedAt": "2024-01-15T10:30:00Z",
    "source": "figma-plugin"
  }
}
```

### Import Tokens
Load tokens from a previously exported JSON file.

#### How to Import
1. Click **"📤 Import JSON"** button
2. Select your JSON file
3. Preview tokens before applying
4. Click "Apply Tokens" to import
5. Or click "Cancel" to abort

#### Import Preview
```
📤 Import Token Preview
🎨 Colors: 27
📝 Typography: 33
📏 Spacing: 51
🌑 Shadows: 7
⭕ Border Radius: 9

[Apply Tokens] [Cancel]
```

## Error Recovery System

### Overview
Comprehensive error handling with retry options for failed tokens.

### Error Display
When tokens fail to sync, you'll see:
```
⚠️ 5 tokens failed to sync

🎨 Colors: 2 failed
📝 Typography: 3 failed

[🔄 Retry All Failed] [🔄 Retry by Category]
```

### Retry Options

#### Retry All Failed
- Retries all failed tokens at once
- Shows progress for each retry
- Updates status in real-time

#### Retry by Category
- View failed tokens grouped by type
- Retry entire categories
- Retry individual tokens

#### Individual Token Retry
```
🔄 Retry Failed Tokens by Category

📝 Typography (3 failed)        [Retry]
- body-small/compact - Invalid font weight    [Retry]
- caption/medium - Font not loaded            [Retry]
- overline/large - Invalid letter spacing     [Retry]

[← Back]
```

## Progress Tracking

### Real-time Updates
The plugin shows detailed progress during sync operations:

#### Visual Indicators
- ⏳ In Progress (with pulsing animation)
- ✅ Completed successfully
- ❌ Failed with error
- ⭕ Pending

#### Progress Display
```
Syncing Tokens...

🎨 Colors ⏳
Progress: 15/27 completed
- background/default/light ✅
- foreground/default/light ✅
- card/default/light ✅
- primary/default/light ⏳
- secondary/default/light ⭕
```

### Completion Summary
```
✅ Sync Complete!

🎨 Colors          ████████████ 27/27 (100%)
📏 Spacing         ████████████ 51/51 (100%)
📝 Typography      ████████░░░░ 30/33 (91%)
                   ⚠️ 3 failed

Total time: 5.2s
```

## Code Generation

### Features
- **Multiple Formats**: TypeScript, CSS, Tailwind
- **Smart Grouping**: Organizes tokens logically
- **Platform Support**: React Native and Web compatible
- **Copy to Clipboard**: One-click copying

### Code Quality
- Clean, formatted output
- Proper type definitions
- Framework-specific syntax
- Comments for clarity

### Integration Tips
1. **CSS Variables**: Import in your global stylesheet
2. **TypeScript**: Import theme object in components
3. **Tailwind**: Merge with existing config
4. **JSON Backup**: Store in version control

## Best Practices

### Token Naming
- Use consistent naming conventions
- Group related tokens with prefixes
- Avoid special characters (except `/` and `-`)
- Keep names descriptive but concise

### Organization
- **Colors**: Group by semantic purpose (background, foreground, etc.)
- **Typography**: Group by size/usage (display, body, caption)
- **Spacing**: Use consistent scale (0, 1, 2, 4, 8, etc.)
- **Effects**: Name by intensity (sm, md, lg, xl)

### Workflow Tips
1. **Regular Syncs**: Sync frequently to avoid conflicts
2. **Backup Tokens**: Export JSON before major changes
3. **Test Imports**: Preview before applying imported tokens
4. **Handle Errors**: Use retry system for temporary failures
5. **Version Control**: Commit generated code files

### Performance
- Extract tokens from organized Figma files
- Sync in smaller batches for large systems
- Use error recovery for network issues
- Close other Figma plugins during sync

### Team Collaboration
1. **Share JSON**: Export and share token files
2. **Document Changes**: Use meaningful commit messages
3. **Consistent Setup**: Ensure all team members use same file structure
4. **Regular Updates**: Keep plugin updated for latest features

## Troubleshooting

### Common Issues
1. **"Font not loaded"**: Ensure Inter font is available in Figma
2. **"Invalid variable name"**: Check for special characters
3. **"Sync failed"**: Check network connection and retry
4. **"Limited to 1 mode"**: Figma free plan limitation

### Debug Mode
- Open Developer Console in Figma
- Check for error messages
- Verify file paths match expected structure
- Test with smaller token sets first

## Conclusion

The Universal Design System Sync plugin provides a complete solution for managing design tokens between Figma and code. With its comprehensive feature set, error handling, and multiple export formats, it streamlines the design-to-development workflow and ensures consistency across your product.

For more information, see:
- [README.md](README.md) - Installation and setup
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Technical details
- [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md) - Quick overview