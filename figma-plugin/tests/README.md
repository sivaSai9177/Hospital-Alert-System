# 🧪 Test Suite Documentation

Comprehensive testing infrastructure for the Figma Universal Design System Plugin.

## 📋 Test Structure

```
tests/
├── unit/               # Unit tests for individual functions/components
│   ├── handlers/       # Handler function tests
│   ├── utils/          # Utility function tests
│   ├── components/     # React component tests
│   └── services/       # Service tests
├── integration/        # Integration tests for workflows
│   ├── handlers/       # Handler integration tests
│   └── services/       # Service integration tests
├── e2e/               # End-to-end tests
│   └── workflows/      # Complete workflow tests
└── setup.ts           # Test environment setup
```

## 🚀 Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e
```

### Run Specific Test File
```bash
npm test -- token-extractor.test.ts
```

## 📝 Writing Tests

### Unit Test Example
```typescript
// tests/unit/handlers/token-extractor.test.ts
import { extractDesignTokens } from '@handlers/tokens/token-extractor';

describe('Token Extractor', () => {
  it('should extract color tokens from solid fills', async () => {
    const mockNode = createMockRectangle({
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]
    });
    
    figma.currentPage.selection = [mockNode];
    
    const result = await extractDesignTokens();
    
    expect(result.colors).toHaveLength(1);
    expect(result.colors[0].value).toBe('#ff0000');
  });
});
```

### Component Test Example
```typescript
// tests/unit/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/ui/components/Button';

describe('Button Component', () => {
  it('should handle click events', () => {
    const handleClick = jest.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Test Example
```typescript
// tests/integration/token-sync.test.ts
describe('Token Sync Integration', () => {
  it('should extract and sync tokens end-to-end', async () => {
    // Setup
    const mockNodes = createDesignSystem();
    figma.currentPage.selection = mockNodes;
    
    // Extract
    const tokens = await extractDesignTokens();
    
    // Validate
    const validation = validateTokens(tokens);
    expect(validation.isValid).toBe(true);
    
    // Sync
    const result = await syncWithMCPServer(tokens, config);
    expect(result.success).toBe(true);
  });
});
```

## 🔧 Test Utilities

### Mock Helpers
```typescript
// tests/utils/mock-helpers.ts
export function createMockRectangle(overrides = {}) {
  return {
    type: 'RECTANGLE',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    fills: [],
    ...overrides
  };
}

export function createMockTextNode(overrides = {}) {
  return {
    type: 'TEXT',
    characters: 'Sample Text',
    fontSize: 16,
    fontName: { family: 'Inter', style: 'Regular' },
    ...overrides
  };
}
```

### Test Data Builders
```typescript
// tests/utils/builders.ts
export const tokenBuilder = {
  color: (overrides = {}) => ({
    name: 'primary-500',
    value: '#007AFF',
    rgb: { r: 0, g: 0.48, b: 1 },
    ...overrides
  }),
  
  typography: (overrides = {}) => ({
    name: 'heading-1',
    fontSize: 32,
    fontFamily: 'Inter',
    fontWeight: 700,
    lineHeight: 40,
    ...overrides
  })
};
```

## 🎯 Testing Best Practices

### 1. Test Structure
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert
- Group related tests with `describe` blocks
- Use `beforeEach` for common setup

### 2. Mocking
- Mock external dependencies
- Use `jest.fn()` for function mocks
- Clear mocks between tests
- Mock at the appropriate level

### 3. Assertions
- Test behavior, not implementation
- Use specific matchers
- Test edge cases
- Include negative tests

### 4. Component Testing
- Test user interactions
- Verify rendered output
- Test accessibility
- Test error states

## 📊 Coverage Goals

- **Overall**: 80% minimum
- **Handlers**: 90% (critical business logic)
- **Utils**: 95% (pure functions)
- **Components**: 75% (UI components)
- **Services**: 85% (external integrations)

## 🐛 Debugging Tests

### Enable Verbose Output
```bash
npm test -- --verbose
```

### Debug Single Test
```typescript
it.only('should debug this test', () => {
  // This test runs in isolation
});
```

### VS Code Debugging
1. Add breakpoint in test
2. Run "Debug Jest Tests" from VS Code
3. Step through code

### Console Logging
```typescript
// Temporarily bypass mock
const originalLog = console.log;
console.log = originalLog;
console.log('Debug info:', data);
```

## 🔍 Common Issues

### Figma API Not Defined
```typescript
// Ensure test setup is imported
import '../setup';
```

### Async Tests Timing Out
```typescript
// Increase timeout for slow operations
it('should handle large operations', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Module Import Errors
```typescript
// Check jest.config.js moduleNameMapper
// Ensure paths match tsconfig.json
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Docs](https://testing-library.com/docs/)
- [Figma Plugin Testing Guide](https://www.figma.com/plugin-docs/testing/)
- [TypeScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)