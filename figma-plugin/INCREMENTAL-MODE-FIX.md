# Figma Incremental Mode Fix

## What is Incremental Mode?

Figma plugins can run in "incremental mode" which provides better performance for operations that modify the document. In this mode, certain API methods have different requirements.

## The Error

```
Cannot call createVariable with a collection id in incremental mode. Please pass the collection node instead.
```

## The Fix

When creating variables in incremental mode, you must pass the collection object itself, not just its ID:

### Before (Incorrect)
```javascript
const newVar = figma.variables.createVariable(
  variableName,
  collectionId,  // ❌ String ID not allowed in incremental mode
  'COLOR'
);
```

### After (Correct)
```javascript
const newVar = figma.variables.createVariable(
  variableName,
  collection,    // ✅ Pass the collection object
  'COLOR'
);
```

## What We Changed

1. **Updated function signatures** to pass collection objects
2. **Modified variable creation** to use collection objects instead of IDs
3. **Maintained collection references** throughout the token application process

## Benefits of Incremental Mode

- **Better Performance**: Changes are batched and optimized
- **Undo Support**: All changes can be undone as a single operation
- **Memory Efficiency**: Lower memory usage for large operations
- **Progress Tracking**: Better support for progress indicators

## Plugin Status

The plugin now correctly handles incremental mode and should work without any errors when syncing tokens.

---

For more details, see: https://www.figma.com/plugin-docs/api/properties/figma-mode/