# Design System Pages in Figma

## Overview

The Figma plugin now includes functionality to automatically generate two comprehensive pages in your Figma file:

1. **🎨 Design System** - A complete overview of all design tokens
2. **🧩 Universal Components** - A library of reusable components

## How to Use

1. Open your Figma file
2. Run the Universal Design System Sync plugin
3. Click the "🎨 Generate Design System Pages" button
4. The plugin will create two new pages with all your design tokens and components

## What Gets Generated

### Design System Page

The Design System page includes:

#### 1. **Colors Section**
- Organized by category (primary, secondary, background, etc.)
- Color swatches with proper variable bindings
- Hover states and color values
- Auto-layout grid for easy browsing

#### 2. **Typography Section**
- Complete type scale (Display, Headline, Title, Body, etc.)
- Font sizes, weights, and line heights
- Sample text for each style
- Proper font loading (Inter)

#### 3. **Spacing Section**
- Visual representation of spacing scale
- Values from 0px to 96px
- Consistent with Tailwind spacing
- Easy to understand grid layout

#### 4. **Effects Section**
- Shadow examples (sm, md, lg, xl)
- Visual preview of each shadow
- Proper effect application
- Organized in a horizontal layout

#### 5. **Grid System Section**
- Desktop, tablet, and mobile grids
- Column counts and gutters
- Margin specifications
- Visual grid examples

### Universal Components Page

The Components page includes:

#### 1. **Buttons**
- All variants: primary, secondary, outline, ghost, destructive
- All sizes: small, medium, large
- Proper auto-layout
- Consistent styling

#### 2. **Inputs**
- Text, email, password, search, textarea
- All states: default, focused, error, disabled
- Labels and error messages
- Proper field styling

#### 3. **Cards**
- Default, bordered, elevated, interactive
- Image placeholders
- Content areas with proper spacing
- Shadow and border variations

#### 4. **Navigation**
- Breadcrumbs with separators
- Tabs with active states
- Navigation menu with hover states
- Proper hierarchy

#### 5. **Feedback Components**
- Toast notifications (success, error, warning, info)
- Badges with different variants
- Proper color coding
- Icon placeholders

#### 6. **Layout Components**
- Container examples (sm, md, lg, xl)
- Responsive widths
- Proper padding and margins
- Visual guides

## Features

### Auto-Layout Everything
All components and sections use Figma's auto-layout for:
- Easy resizing
- Consistent spacing
- Responsive behavior
- Better organization

### Variable Integration
- Colors use Figma Variables API
- Proper scoping for each variable type
- Easy to update and maintain
- Supports multiple themes (if available)

### Consistent Styling
- Uses Inter font throughout
- Consistent spacing scale
- Proper color application
- Professional appearance

### Organization
- Clear section headers
- Logical grouping
- Easy navigation
- Professional documentation

## Benefits

1. **Documentation** - Automatic documentation of your design system
2. **Consistency** - Ensures all teams see the same tokens
3. **Efficiency** - No manual page creation needed
4. **Updates** - Easy to regenerate when tokens change
5. **Handoff** - Perfect for developer handoff

## Tips

1. **Before Generating**: Make sure you have the Inter font available in your Figma file
2. **After Generating**: You can customize the generated pages to add more documentation
3. **Regenerating**: The plugin will clear existing content before creating new pages
4. **Sharing**: These pages are perfect for sharing with stakeholders

## Troubleshooting

### Pages Not Created
- Ensure you have edit permissions in the Figma file
- Check the console for any errors
- Try closing and reopening the plugin

### Missing Styles
- The plugin uses the Inter font - ensure it's available
- Some effects require proper variable setup
- Check that your file has the necessary permissions

### Layout Issues
- All elements use auto-layout
- If something looks wrong, check the auto-layout settings
- Ensure your Figma app is up to date

## Future Enhancements

- [ ] Interactive component states
- [ ] Dark mode variations
- [ ] Responsive previews
- [ ] Animation demonstrations
- [ ] Accessibility annotations
- [ ] Component usage guidelines
- [ ] Code snippets per component

## Conclusion

The Design System Pages feature provides a quick way to visualize and document your entire design system in Figma. It's perfect for:
- Design system documentation
- Developer handoff
- Stakeholder reviews
- Team alignment
- Quick reference

Use this feature to maintain a single source of truth for your design system directly in Figma!