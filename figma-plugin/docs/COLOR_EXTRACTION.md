# Color Extraction Feature

The Color Extraction feature enables you to extract colors from selected Figma frames and sync them back to your codebase as design tokens. This feature is optimized for the free Figma tier (single theme with light/dark modes).

## Features

### 1. Smart Color Extraction
- **Multi-source extraction**: Extracts colors from fills, strokes, text, and effects
- **Nested frame support**: Recursively analyzes nested frames and components
- **Usage tracking**: Records where and how often each color is used
- **Format conversion**: Automatically converts all colors to HSL format

### 2. Intelligent Categorization
The system automatically categorizes colors based on:
- **Hue analysis**: Identifies primary, secondary, and accent colors
- **Luminance**: Determines if colors are suitable for backgrounds or text
- **Semantic meaning**: Recognizes success (green), warning (yellow), danger (red), and info (blue) colors
- **Usage context**: Considers whether colors are used for fills, text, or strokes

### 3. Theme Generation
- **Automatic light/dark modes**: Generates both theme variants from extracted colors
- **Smart adjustments**: Applies intelligent lightness modifications for dark mode
- **Accessibility**: Ensures proper contrast ratios between text and backgrounds
- **Free tier compatible**: Works within single theme limitations

### 4. Bidirectional Sync
- **Export to code**: Syncs extracted colors to your codebase through MCP
- **Apply to Figma**: Updates current page with extracted theme
- **Token mapping**: Creates proper mappings between Figma colors and theme tokens

## Usage

### Extracting Colors

1. **Select frames** in Figma containing the colors you want to extract
2. Navigate to the **Colors tab** (press `7` or use `⌘K`)
3. Click **"Extract Colors from Selection"**
4. Review the extracted colors and their categorization

### Syncing to Codebase

1. After extraction, review the generated theme
2. Toggle between light/dark modes to preview
3. Click **"Sync to Codebase"** to update your theme files
4. The MCP server will update:
   - `app/global.css` with CSS variables
   - Theme registry files
   - Design token documentation

### Applying Theme to Figma

1. Click **"Apply Theme to Page"** to update the current Figma page
2. This creates/updates:
   - Color styles for all extracted colors
   - Light/dark mode variants
   - Semantic color mappings

## Color Categories

### Primary Colors
- Main brand colors
- Used for primary actions, links, and key UI elements
- Typically blues, purples, or brand-specific colors

### Secondary Colors
- Supporting colors for the primary palette
- Used for secondary actions and accents
- Complementary to primary colors

### Accent Colors
- Colors for special emphasis
- Used sparingly for highlights and calls-to-action
- Often contrasting or vibrant colors

### Neutral Colors
- Grays and near-grays for backgrounds and text
- Organized from lightest to darkest
- Essential for creating visual hierarchy

### Semantic Colors
- **Success**: Green hues for positive actions/states
- **Warning**: Yellow/orange for cautions
- **Danger**: Red hues for errors/destructive actions
- **Info**: Blue hues for informational content

## Theme Structure

The extracted colors generate a theme following this structure:

```typescript
{
  default: {  // Light mode
    background: "0 0% 100%",        // HSL values
    foreground: "0 0% 3.9%",
    primary: "221.2 83.2% 53.3%",
    secondary: "210 40% 96.1%",
    // ... other tokens
  },
  dark: {     // Dark mode
    background: "0 0% 3.9%",
    foreground: "0 0% 98%",
    primary: "221.2 83.2% 63.3%",   // Adjusted for dark mode
    secondary: "217.2 32.6% 17.5%",
    // ... other tokens
  }
}
```

## Best Practices

### 1. Frame Organization
- Group related colors in frames
- Name frames descriptively (e.g., "Brand Colors", "UI Colors")
- Use consistent color across similar elements

### 2. Color Selection
- Limit primary colors to 1-2 choices
- Ensure sufficient color contrast
- Test colors in both light and dark contexts

### 3. Sync Frequency
- Extract and sync colors when making significant changes
- Review generated themes before syncing
- Keep Figma and code in sync regularly

## Keyboard Shortcuts

- `7` - Switch to Colors tab
- `⌘K` / `Ctrl+K` - Quick access to color extraction

## Troubleshooting

### No colors extracted
- Ensure frames are selected
- Check if frames contain visible elements
- Verify elements have fill/stroke colors

### Colors look different after sync
- Colors are converted to HSL format
- Dark mode adjustments may modify lightness
- Check theme preview before syncing

### Sync fails
- Ensure MCP server is running
- Check file permissions
- Verify token file paths are correct

## Technical Details

### Color Format Conversion
All colors are converted to HSL format:
- **H**: Hue (0-360°)
- **S**: Saturation (0-100%)
- **L**: Lightness (0-100%)

### Dark Mode Generation
Dark mode colors are generated using:
- Lightness inversion for backgrounds
- Slight lightness boost for primary colors
- Maintained hue and adjusted saturation
- Preserved semantic meaning

### MCP Integration
The feature integrates with MCP server to:
- Read existing theme structure
- Update CSS variables
- Generate TypeScript tokens
- Maintain version history