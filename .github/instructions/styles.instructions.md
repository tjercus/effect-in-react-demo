---
applyTo: "**/*.scss,**/*.css,**/*.sass"
---

# SCSS/CSS Styling Guidelines

## Core Principles

- Use SCSS for all styling to leverage variables, mixins, and nesting.
- Import theme variables from `@use '@visma-connect-bv/iss-bootstrap' as *;` at the top of each SCSS file.
- Always use styling from `@visma-connect-bv/iss-bootstrap`, read it via the
node_modules and rely on its variables, mixins, and utility classes before introducing custom styles. Apply to the components used in the project.
- Follow BEM (Block Element Modifier) methodology for class naming to avoid conflicts.
- Use semantic class names that describe purpose, not appearance.
- Prefer CSS custom properties (variables) over hardcoded values for maintainability.

## Code Organization and Structure

- Use consistent spacing and indentation (2 spaces).
- Group related properties together (positioning, box model, typography, visual).
- Use meaningful comments to explain complex selectors or non-obvious styling decisions.
- Organize SCSS files by component - one SCSS file per component when possible.
- Use SCSS partials and imports to organize styles logically.

## Layout and Positioning

- Prefer CSS Grid and Flexbox for layouts over floats or positioning.
- Use CSS Grid for complex layouts, Flexbox for one-dimensional layouts.
- Use relative units (rem, em, %) instead of pixels where appropriate.
- Implement responsive design with mobile-first approach using min-width media queries.
- Use CSS logical properties (margin-inline, padding-block) for better internationalization support.

## Selectors and Specificity

- Keep specificity low - avoid deeply nested selectors (max 3 levels).
- Avoid `!important` declarations - restructure selectors if needed.
- Use CSS nesting judiciously - don't mirror HTML structure unnecessarily.

## Variables and Theming

- Use SCSS variables for colors, spacing, and other design tokens.
- Use CSS custom properties for theming and dynamic values.
- Follow atomic design principles - create reusable utility classes for common patterns.

## Responsive Design and Mixins

- Use SCSS mixins for reusable patterns and responsive breakpoints.
- Implement responsive design with mobile-first approach using min-width media queries.
- Group vendor prefixes and use autoprefixer when possible.

## Properties and Values

- Prefer shorthand properties where appropriate (margin, padding, border).
- Include fallbacks for newer CSS features when needed for browser support.

## Performance and Animations

- Use CSS transitions for smooth animations, prefer transform and opacity for performance.
- Optimize for performance - avoid expensive properties like box-shadow on animated elements.
- Use consistent naming for animation keyframes and custom properties.

## Accessibility

- Implement proper focus styles for accessibility compliance.

## Best Practices

- Implement CSS-in-JS patterns sparingly - prefer external stylesheets for maintainability.

## Example Structure

```scss
// Import theme variables first
@use '@visma-connect-bv/iss-bootstrap' as *;

// Component variables
$component-padding: 1rem;
$component-border-radius: 0.5rem;

// Main component block
.component-name {
  // Positioning
  position: relative;
  
  // Box model
  padding: $component-padding;
  margin-bottom: 1rem;
  border-radius: $component-border-radius;
  
  // Typography
  font-size: 1rem;
  line-height: 1.5;
  
  // Visual
  background-color: var(--bs-light);
  border: 1px solid var(--bs-border-color);
  
  // Element modifier
  &__header {
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  
  // State modifier
  &--active {
    border-color: var(--bs-primary);
  }
  
  // Responsive behavior
  @media (min-width: 768px) {
    padding: calc($component-padding * 1.5);
  }
}
```

## BEM Naming Convention Examples

```scss
// Block
.card { }

// Element
.card__header { }
.card__body { }
.card__footer { }

// Modifier
.card--large { }
.card--primary { }

// Element with modifier
.card__header--centered { }
```
