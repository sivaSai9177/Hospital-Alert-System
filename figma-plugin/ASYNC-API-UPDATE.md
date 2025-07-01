# Figma Async API Update

## What Changed

Figma has updated their plugin API to require async versions of certain methods for better performance and stability. This affects methods that access document data.

## Updated Methods

### Variable Collection Access
```javascript
// Old (deprecated)
const collection = figma.variables.getVariableCollectionById(id);

// New (required)
const collection = await figma.variables.getVariableCollectionByIdAsync(id);
```

### Variable Access
```javascript
// Old (deprecated)
const variable = figma.variables.getVariableById(id);

// New (required)
const variable = await figma.variables.getVariableByIdAsync(id);
```

### Style Access
```javascript
// Old (deprecated)
const textStyles = figma.getLocalTextStyles();
const effectStyles = figma.getLocalEffectStyles();
const paintStyles = figma.getLocalPaintStyles();

// New (required)
const textStyles = await figma.getLocalTextStylesAsync();
const effectStyles = await figma.getLocalEffectStylesAsync();
const paintStyles = await figma.getLocalPaintStylesAsync();
```

## Why This Change?

1. **Performance**: Async methods don't block the UI thread
2. **Scalability**: Better handling of large documents
3. **Stability**: Prevents timeouts with complex operations
4. **Future-proofing**: Aligns with modern JavaScript practices

## Impact on the Plugin

All methods that access Figma document data have been updated to use async versions:

- ✅ Variable collection operations
- ✅ Variable creation and updates
- ✅ Style management (text, effects, paint)
- ✅ Token extraction and application

## Error Messages

If you see errors like:
```
Cannot call with documentAccess: dynamic-page. Use figma.variables.getVariableCollectionByIdAsync instead.
```

This means a non-async method is being used where an async method is required.

## Best Practices

1. Always use async versions when available
2. Use `await` with async methods
3. Handle errors with try-catch blocks
4. Check Figma's API documentation for updates

## Plugin Status

The plugin has been fully updated to use async APIs and should work without any deprecation warnings.

---

For more information, see: https://www.figma.com/plugin-docs/api/api-reference/