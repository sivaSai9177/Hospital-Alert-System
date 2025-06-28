import React from 'react';
import { View, ViewProps, Platform } from 'react-native';
import { cn } from '@/lib/core/utils';
import { Box, BoxProps } from './Box';
import { useSpacing } from '@/lib/stores/spacing-store';
import { getGapClass } from '@/lib/core/utils/density-classes';
import { LayoutStyleProps } from './types';
import { SPACING_ALIASES } from '@/lib/design/spacing';

// Type for numeric spacing values
type NumericSpacing = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 14 | 16 | 20 | 24 | 28 | 32 | 36 | 40 | 44 | 48 | 52 | 56 | 60 | 64 | 72 | 80 | 96;

// Type for string spacing aliases
type SpacingAlias = keyof typeof SPACING_ALIASES;

// Combined spacing type
type SpacingValue = NumericSpacing | SpacingAlias;

// Base Stack props - extends BoxProps but overrides gap type
interface BaseStackProps extends Omit<BoxProps, 'gap'> {
  // Gap size using Tailwind spacing scale or aliases
  gap?: SpacingValue;
  
  // Alignment
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  
  // Other props
  wrap?: boolean;
  reverse?: boolean;
}

// Map gap values to Tailwind classes
const gapClasses = {
  0: '',
  0.5: 'gap-0.5',
  1: 'gap-1',
  1.5: 'gap-1.5',
  2: 'gap-2',
  2.5: 'gap-2.5',
  3: 'gap-3',
  3.5: 'gap-3.5',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  7: 'gap-7',
  8: 'gap-8',
  9: 'gap-9',
  10: 'gap-10',
  11: 'gap-11',
  12: 'gap-12',
  14: 'gap-14',
  16: 'gap-16',
  20: 'gap-20',
  24: 'gap-24',
  28: 'gap-28',
  32: 'gap-32',
  36: 'gap-36',
  40: 'gap-40',
  44: 'gap-44',
  48: 'gap-48',
  52: 'gap-52',
  56: 'gap-56',
  60: 'gap-60',
  64: 'gap-64',
  72: 'gap-72',
  80: 'gap-80',
  96: 'gap-96',
} as const;

// Alignment classes
const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const;

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
} as const;

// Helper function to resolve spacing value
function resolveSpacingValue(value: SpacingValue | undefined): NumericSpacing {
  if (value === undefined) return 0;
  if (typeof value === 'string' && value in SPACING_ALIASES) {
    return SPACING_ALIASES[value as SpacingAlias] as NumericSpacing;
  }
  return value as NumericSpacing;
}

// VStack - Vertical Stack
export interface VStackProps extends BaseStackProps {
  spacing?: BaseStackProps['gap']; // Alias for gap
}

export const VStack = React.forwardRef<View, VStackProps>(({
  gap = 0,
  spacing,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  reverse = false,
  className,
  children,
  style,
  ...props
}, ref) => {
  const { density, spacing: spacingValues } = useSpacing();
  const rawGapValue = spacing ?? gap;
  const gapValue = resolveSpacingValue(rawGapValue);
  
  // Use density-aware gap class or fallback to standard
  const gapClass = typeof gapValue === 'number' && gapValue <= 12 
    ? getGapClass(gapValue, density)
    : gapClasses[gapValue] || '';
  
  // Android doesn't support gap property well, use margin instead
  const childrenWithSpacing = Platform.OS === 'android' && gapValue > 0 
    ? React.Children.map(children, (child, index) => {
        if (index === 0 || !React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<any>, {
          style: [
            (child.props as any).style,
            { marginTop: spacingValues[gapValue] || gapValue * 4 }
          ]
        });
      })
    : children;
  
  return (
    <Box
      ref={ref}
      className={cn(
        // Base flex column
        'flex flex-col',
        // Gap - only for non-Android
        Platform.OS !== 'android' && gapClass,
        // Alignment
        alignClasses[align],
        justifyClasses[justify],
        // Wrap
        wrap && 'flex-wrap',
        // Reverse
        reverse && 'flex-col-reverse',
        // Custom className
        className
      )}
      style={style}
      {...props}
    >
      {childrenWithSpacing}
    </Box>
  );
});

VStack.displayName = 'VStack';

// HStack - Horizontal Stack
export interface HStackProps extends BaseStackProps {
  spacing?: BaseStackProps['gap']; // Alias for gap
}

export const HStack = React.forwardRef<View, HStackProps>(({
  gap = 0,
  spacing,
  align = 'center', // Default to center for horizontal stacks
  justify = 'start',
  wrap = false,
  reverse = false,
  className,
  children,
  style,
  ...props
}, ref) => {
  const { density, spacing: spacingValues } = useSpacing();
  const rawGapValue = spacing ?? gap;
  const gapValue = resolveSpacingValue(rawGapValue);
  
  // Use density-aware gap class or fallback to standard
  const gapClass = typeof gapValue === 'number' && gapValue <= 12 
    ? getGapClass(gapValue, density)
    : gapClasses[gapValue] || '';
  
  // Android doesn't support gap property well, use margin instead
  const childrenWithSpacing = Platform.OS === 'android' && gapValue > 0 
    ? React.Children.map(children, (child, index) => {
        if (index === 0 || !React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<any>, {
          style: [
            (child.props as any).style,
            { marginLeft: spacingValues[gapValue] || gapValue * 4 }
          ]
        });
      })
    : children;
  
  return (
    <Box
      ref={ref}
      className={cn(
        // Base flex row
        'flex flex-row',
        // Gap - only for non-Android
        Platform.OS !== 'android' && gapClass,
        // Alignment
        alignClasses[align],
        justifyClasses[justify],
        // Wrap
        wrap && 'flex-wrap',
        // Reverse
        reverse && 'flex-row-reverse',
        // Custom className
        className
      )}
      style={style}
      {...props}
    >
      {childrenWithSpacing}
    </Box>
  );
});

HStack.displayName = 'HStack';

// ZStack - Layered Stack (uses relative/absolute positioning)
export interface ZStackProps extends BoxProps {
  // Alignment within the stack
  align?: 'topLeft' | 'top' | 'topRight' | 'left' | 'center' | 'right' | 'bottomLeft' | 'bottom' | 'bottomRight';
}

const zAlignClasses = {
  topLeft: 'top-0 left-0',
  top: 'top-0 left-0 right-0 items-center',
  topRight: 'top-0 right-0',
  left: 'top-0 bottom-0 left-0 justify-center',
  center: 'top-0 bottom-0 left-0 right-0 items-center justify-center',
  right: 'top-0 bottom-0 right-0 justify-center',
  bottomLeft: 'bottom-0 left-0',
  bottom: 'bottom-0 left-0 right-0 items-center',
  bottomRight: 'bottom-0 right-0',
} as const;

export const ZStack = React.forwardRef<View, ZStackProps>(({
  align = 'center',
  className,
  children,
  ...props
}, ref) => {
  const childArray = React.Children.toArray(children);
  
  return (
    <Box
      ref={ref}
      className={cn('relative', className) as string}
      {...props}
    >
      {childArray.map((child, index) => {
        if (index === 0) {
          // First child is relative positioned
          return child;
        }
        // Other children are absolutely positioned
        return (
          <View
            key={index}
            className={cn('absolute', zAlignClasses[align]) as string}
          >
            {child}
          </View>
        );
      })}
    </Box>
  );
});

ZStack.displayName = 'ZStack';

// Spacer - Flexible space component
export interface SpacerProps extends BoxProps {
  size?: BaseStackProps['gap'];
  horizontal?: boolean;
}

export const Spacer = React.forwardRef<View, SpacerProps>(({
  size,
  horizontal = false,
  className,
  ...props
}, ref) => {
  if (size !== undefined) {
    // Fixed size spacer
    const sizeClass = horizontal ? `w-${size}` : `h-${size}`;
    return (
      <Box
        ref={ref}
        className={cn(sizeClass, className) as string}
        {...props}
      />
    );
  }
  
  // Flexible spacer
  return (
    <Box
      ref={ref}
      className={cn('flex-1', className) as string}
      {...props}
    />
  );
});

Spacer.displayName = 'Spacer';

// Divider - Visual separator
export interface DividerProps extends BoxProps {
  orientation?: 'horizontal' | 'vertical';
  thickness?: 'thin' | 'medium' | 'thick';
}

const dividerThickness = {
  thin: 'border-[0.5px]',
  medium: 'border',
  thick: 'border-2',
} as const;

export const Divider = React.forwardRef<View, DividerProps>(({
  orientation = 'horizontal',
  thickness = 'thin',
  className,
  ...props
}, ref) => {
  return (
    <Box
      ref={ref}
      className={cn(
        'border-border',
        dividerThickness[thickness],
        orientation === 'horizontal' ? 'w-full border-t' : 'h-full border-l',
        className
      )}
      {...props}
    />
  );
});

Divider.displayName = 'Divider';

// Stack is an alias for VStack (vertical stack by default)
export const Stack = VStack;
Stack.displayName = 'Stack';