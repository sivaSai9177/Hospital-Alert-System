# Figma Plan Limitations & Workarounds

## Variable Mode Limitations

Figma's free/starter plan has a limitation of **1 mode per variable collection**. This affects how we can implement multi-theme and responsive design systems.

### What This Means

- ❌ Cannot have multiple themes (light/dark) in one collection
- ❌ Cannot have multiple densities (compact/medium/large) in one collection
- ✅ Can still create unlimited variables within a collection
- ✅ Can create multiple collections

### How the Plugin Handles This

1. **Colors**: Uses the default theme in light mode
2. **Spacing**: Uses medium density as the default
3. **Typography**: Creates individual text styles (not affected by mode limit)
4. **Effects**: Creates individual effect styles (not affected by mode limit)

## Workarounds for Free Plan

### Option 1: Multiple Collections (Recommended)

Instead of modes, create separate collections for each theme/density:

```
Collections:
├── Colors - Default Light
├── Colors - Default Dark
├── Colors - Glass Light
├── Colors - Glass Dark
├── Spacing - Compact
├── Spacing - Medium
└── Spacing - Large
```

**Pros**: 
- Works with free plan
- Clear organization
- Easy to switch between collections

**Cons**:
- More collections to manage
- Manual switching required

### Option 2: Manual Value Updates

1. Sync the default tokens
2. Manually update variable values for different themes
3. Save different versions of your file

### Option 3: Use Styles Instead

For some use cases, traditional Figma styles might be sufficient:

- **Color Styles**: For simple color systems
- **Text Styles**: Already supported without limitations
- **Effect Styles**: For shadows and effects

## Implementation Guide

### Creating Theme-Specific Collections

```javascript
// Instead of modes, create separate collections
const collections = [
  { name: "Colors - Light", theme: "light" },
  { name: "Colors - Dark", theme: "dark" },
  { name: "Colors - Glass", theme: "glass" }
];
```

### Switching Between Collections

1. In Figma, go to the Variables panel
2. Select the collection you want to use
3. Apply variables from that collection to your designs

### Plugin Configuration

The plugin now:
1. Detects free plan limitations
2. Uses default values only
3. Logs helpful tips in the console
4. Suggests upgrading for full functionality

## Upgrade Benefits

With Figma's paid plans, you get:

- **Professional**: 4 modes per collection
- **Organization**: 40 modes per collection
- **Enterprise**: Unlimited modes

This enables:
- ✅ True theme switching with modes
- ✅ Responsive density modes
- ✅ Brand variations in one collection
- ✅ Easier design system management

## Console Messages

When using the plugin, you'll see messages like:

```
⚠️ Colors: Multiple modes (12) requested but limited to 1 mode in free plan.
💡 To use multiple modes, upgrade your Figma plan or create separate collections.
```

These are informational and the plugin will still work with the limitations.

## Best Practices for Free Plan

1. **Start Simple**: Use the default theme and medium density
2. **Document Variants**: Keep a reference of other theme values
3. **Use Naming Conventions**: Clearly label collections by theme/density
4. **Consider Styles**: Use traditional styles where variables aren't needed
5. **Plan for Growth**: Structure your tokens for easy migration when upgrading

## Future Plugin Updates

We're planning to add:
- Automatic multi-collection creation for themes
- Collection switching helper
- Theme preview without modes
- Export/import for different theme configurations

---

For questions about Figma plans, visit: https://www.figma.com/pricing/