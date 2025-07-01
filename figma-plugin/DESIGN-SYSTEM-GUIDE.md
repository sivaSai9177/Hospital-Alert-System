# Design System Guide: Component-Specific Tokens

## Table of Contents
1. [Overview](#overview)
2. [Design System Architecture](#design-system-architecture)
3. [Component Token Structure](#component-token-structure)
4. [Component Categories](#component-categories)
5. [Implementation Guide](#implementation-guide)
6. [Token Naming Conventions](#token-naming-conventions)
7. [Component Audit Checklist](#component-audit-checklist)
8. [Best Practices](#best-practices)
9. [Migration Guide](#migration-guide)

## Overview

This guide provides a comprehensive approach to implementing component-specific design tokens in your design system. Component tokens build upon foundational tokens (colors, typography, spacing) to create consistent, scalable component definitions.

### Benefits of Component Tokens
- **Consistency**: Ensure all instances of a component look and behave identically
- **Maintainability**: Update component styles from a single source of truth
- **Scalability**: Easy to add new variants and states
- **Documentation**: Self-documenting component specifications
- **Cross-platform**: Share component definitions between platforms

## Design System Architecture

```
┌─────────────────────────────────────────────────┐
│                Design System Tokens              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────┐    ┌─────────────────────┐  │
│  │  Foundation   │    │  Component Tokens   │  │
│  │    Tokens     │    │                     │  │
│  ├───────────────┤    ├─────────────────────┤  │
│  │ • Colors      │───►│ • Button           │  │
│  │ • Typography  │    │ • Input            │  │
│  │ • Spacing     │    │ • Card             │  │
│  │ • Shadows     │    │ • Dialog           │  │
│  │ • Animation   │    │ • Navigation       │  │
│  │ • Gradients   │    │ • And more...      │  │
│  └───────────────┘    └─────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Token Hierarchy

1. **Primitive Tokens**: Raw values (colors, numbers)
2. **Semantic Tokens**: Purpose-based tokens (primary, secondary)
3. **Component Tokens**: Component-specific combinations
4. **Composite Tokens**: Complex multi-component systems

## Component Token Structure

Each component should have tokens for:

### 1. Dimensions
```typescript
interface DimensionTokens {
  height: SizeVariants;      // Small, medium, large
  width?: SizeVariants;      // Optional fixed widths
  minWidth?: number;         // Minimum widths
  maxWidth?: number;         // Maximum widths
  padding: DensityModes;     // Spacing inside
  margin?: DensityModes;     // Spacing outside
}
```

### 2. Typography
```typescript
interface TypographyTokens {
  fontSize: DensityModes;
  fontWeight: WeightVariants;
  lineHeight: DensityModes;
  letterSpacing?: DensityModes;
  textTransform?: string;
}
```

### 3. Colors & Appearance
```typescript
interface AppearanceTokens {
  background: StateColors;
  text: StateColors;
  border: StateColors;
  shadow?: ShadowVariants;
  opacity?: StateOpacity;
}
```

### 4. Layout
```typescript
interface LayoutTokens {
  display?: string;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  gap?: DensityModes;
}
```

### 5. Interaction
```typescript
interface InteractionTokens {
  cursor?: string;
  userSelect?: string;
  pointerEvents?: string;
  transition?: TransitionTokens;
  animation?: AnimationTokens;
}
```

## Component Categories

### 1. Action Components
Components that trigger actions or navigation.

#### Button
```typescript
const buttonTokens = {
  // Size variants
  height: {
    small: { compact: 28, medium: 32, large: 36 },
    medium: { compact: 32, medium: 40, large: 44 },
    large: { compact: 36, medium: 44, large: 48 },
  },
  
  // Variants
  variants: {
    primary: {
      background: 'var(--primary)',
      text: 'var(--primary-foreground)',
      hover: { background: 'var(--primary-hover)' }
    },
    secondary: { /* ... */ },
    outline: { /* ... */ },
    ghost: { /* ... */ },
    destructive: { /* ... */ }
  }
};
```

#### Link
```typescript
const linkTokens = {
  color: {
    default: 'var(--primary)',
    hover: 'var(--primary-hover)',
    visited: 'var(--primary-visited)',
  },
  textDecoration: {
    default: 'none',
    hover: 'underline',
  }
};
```

### 2. Form Components
Interactive elements for data input.

#### Input
```typescript
const inputTokens = {
  height: {
    small: { compact: 28, medium: 32, large: 36 },
    medium: { compact: 32, medium: 40, large: 44 },
    large: { compact: 36, medium: 44, large: 48 },
  },
  borderColor: {
    default: 'var(--border)',
    hover: 'var(--border-hover)',
    focus: 'var(--primary)',
    error: 'var(--destructive)',
    disabled: 'var(--border-disabled)',
  }
};
```

#### Select, Textarea, Checkbox, Radio, Switch
Each follows similar patterns with specific variations.

### 3. Layout Components
Structural components for organizing content.

#### Card
```typescript
const cardTokens = {
  padding: {
    compact: { x: 12, y: 12 },
    medium: { x: 16, y: 16 },
    large: { x: 20, y: 20 },
  },
  shadow: {
    none: 'none',
    small: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    large: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  }
};
```

#### Container
```typescript
const containerTokens = {
  maxWidth: {
    small: 640,
    medium: 768,
    large: 1024,
    xlarge: 1280,
    full: '100%',
  },
  padding: {
    compact: { x: 16, y: 0 },
    medium: { x: 24, y: 0 },
    large: { x: 32, y: 0 },
  }
};
```

### 4. Navigation Components
Components for app navigation and wayfinding.

#### Sidebar
```typescript
const sidebarTokens = {
  width: {
    collapsed: 64,
    expanded: 240,
  },
  item: {
    height: { compact: 32, medium: 40, large: 48 },
    padding: { compact: { x: 12, y: 6 }, /* ... */ },
    hover: {
      background: 'var(--accent)',
      color: 'var(--accent-foreground)',
    }
  }
};
```

### 5. Feedback Components
Components that provide user feedback.

#### Alert
```typescript
const alertTokens = {
  variants: {
    info: {
      background: 'var(--info-light)',
      color: 'var(--info-dark)',
      icon: 'var(--info)',
    },
    success: { /* ... */ },
    warning: { /* ... */ },
    error: { /* ... */ },
  }
};
```

### 6. Overlay Components
Components that appear above other content.

#### Dialog/Modal
```typescript
const dialogTokens = {
  overlay: {
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
  },
  content: {
    maxWidth: {
      small: 400,
      medium: 600,
      large: 800,
    },
    padding: {
      compact: { x: 16, y: 16 },
      medium: { x: 24, y: 24 },
      large: { x: 32, y: 32 },
    }
  }
};
```

## Implementation Guide

### Step 1: Audit Existing Components
1. List all components in your system
2. Document current variations and states
3. Identify inconsistencies
4. Map to token categories

### Step 2: Define Token Structure
1. Create base token interfaces
2. Define component-specific tokens
3. Establish naming conventions
4. Document token relationships

### Step 3: Extract Token Values
Use the Figma plugin to:
1. Analyze existing components
2. Extract common patterns
3. Generate initial token values
4. Validate consistency

### Step 4: Implement in Code
```typescript
// 1. Import component tokens
import { getButtonTokens } from '@/lib/design/component-tokens';

// 2. Get tokens for current density
const buttonTokens = getButtonTokens(density);

// 3. Apply tokens
const Button = ({ variant, size }) => {
  const styles = {
    height: buttonTokens.height[size][density],
    padding: `${buttonTokens.padding[density].y}px ${buttonTokens.padding[density].x}px`,
    fontSize: buttonTokens.fontSize[density],
    ...buttonTokens.variants[variant],
  };
  
  return <button style={styles}>{children}</button>;
};
```

### Step 5: Validate and Test
1. Test all component variants
2. Verify density modes work correctly
3. Check accessibility compliance
4. Validate cross-platform consistency

## Token Naming Conventions

### Structure
```
[component].[property].[variant].[state].[mode]
```

### Examples
```
button.height.medium.default.compact
input.borderColor.default.focus
card.shadow.elevated
dialog.overlay.background
```

### Rules
1. Use lowercase with dots for hierarchy
2. Be consistent with variant names
3. Use semantic names over visual
4. Include state when applicable
5. Add density mode at the end

## Component Audit Checklist

### For Each Component:

#### □ Structure
- [ ] Defined all size variants
- [ ] Specified padding/margin
- [ ] Set min/max dimensions
- [ ] Configured layout properties

#### □ Visual
- [ ] Defined color tokens for all states
- [ ] Set typography tokens
- [ ] Added shadow tokens if needed
- [ ] Configured border properties

#### □ Interaction
- [ ] Added hover states
- [ ] Defined focus states
- [ ] Set active/pressed states
- [ ] Added disabled states
- [ ] Configured transitions

#### □ Variants
- [ ] Listed all variants
- [ ] Defined tokens for each
- [ ] Ensured consistency
- [ ] Documented differences

#### □ Responsive
- [ ] Works in all density modes
- [ ] Scales appropriately
- [ ] Maintains proportions
- [ ] Text remains readable

#### □ Accessibility
- [ ] Meets contrast requirements
- [ ] Has focus indicators
- [ ] Supports keyboard nav
- [ ] Includes ARIA attributes

## Best Practices

### 1. Start with Foundation
Always build component tokens on top of foundation tokens:
```typescript
// Good
background: 'var(--primary)'

// Avoid
background: '#0066FF'
```

### 2. Use Semantic Names
Choose names that describe purpose, not appearance:
```typescript
// Good
variants: {
  primary: { /* ... */ },
  secondary: { /* ... */ },
  destructive: { /* ... */ }
}

// Avoid
variants: {
  blue: { /* ... */ },
  gray: { /* ... */ },
  red: { /* ... */ }
}
```

### 3. Maintain Consistency
Ensure similar components use similar token structures:
```typescript
// All form inputs should share base structure
const inputBaseTokens = {
  height: SizeVariants,
  padding: DensityModes,
  borderWidth: number,
  borderRadius: DensityModes,
};
```

### 4. Document Everything
Each token should have clear documentation:
```typescript
interface ButtonTokens {
  /**
   * Button height variants
   * - small: Compact UI elements
   * - medium: Default buttons
   * - large: Prominent CTAs
   */
  height: SizeVariants;
}
```

### 5. Plan for Scale
Design token structure to accommodate growth:
```typescript
// Extensible structure
const componentTokens = {
  button: ButtonTokens,
  input: InputTokens,
  // Easy to add new components
  [newComponent]: NewComponentTokens,
};
```

## Migration Guide

### Phase 1: Foundation (Week 1-2)
1. Audit current component library
2. Define token structure
3. Set up token infrastructure
4. Create documentation

### Phase 2: Core Components (Week 3-4)
1. Implement tokens for buttons
2. Add form component tokens
3. Create card and container tokens
4. Test with sample layouts

### Phase 3: Extended Components (Week 5-6)
1. Add navigation tokens
2. Implement overlay tokens
3. Create feedback component tokens
4. Add data display tokens

### Phase 4: Integration (Week 7-8)
1. Update component library
2. Migrate existing components
3. Update documentation
4. Train team on new system

### Phase 5: Validation (Week 9-10)
1. Cross-platform testing
2. Accessibility audit
3. Performance testing
4. User acceptance testing

## Tools and Resources

### Figma Plugin Features
- **Component Scanner**: Automatically detect components
- **Token Extractor**: Extract values from designs
- **Consistency Checker**: Find inconsistencies
- **Token Generator**: Create token files
- **Documentation Builder**: Generate docs

### Code Integration
```typescript
// Install package
npm install @your-org/design-tokens

// Import tokens
import { componentTokens } from '@your-org/design-tokens';

// Use in components
const tokens = componentTokens.button;
```

### Validation Tools
- Token validator for consistency
- Contrast checker for accessibility
- Size analyzer for responsiveness
- Performance profiler

## Conclusion

Component-specific tokens are essential for maintaining a scalable, consistent design system. By following this guide and using the provided tools, you can create a robust token system that serves as the foundation for your component library.

Remember:
- Start small and iterate
- Maintain consistency
- Document thoroughly
- Test extensively
- Collaborate with your team

For more information, see:
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Technical implementation details
- [README.md](README.md) - Plugin usage guide
- [FEATURES.md](FEATURES.md) - Feature documentation