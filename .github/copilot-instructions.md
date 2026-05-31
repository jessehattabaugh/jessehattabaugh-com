---
description: JavaScript code style for the project.
applyTo: '**.js'
---

- Use explicit and descriptive identifiers for all classes, functions, variables, and parameters.
- New Functions should only be created for callbacks, or routines with more than one callsite.
- Prefer deeply nested code over guard clauses or helper functions to maintain linear execution paths.
- Use ES Modules to organize shared code.
- Move conditional logic up to the caller (centralize branching)
- Move iteration down into batch-oriented functions, so hot loops have fewer branches and can vectorize better.

## Use Modern Syntax and APIs

- Avoid creating new variable names by using destructuring assignment when possible.
- Use async/await for handling asynchronous operations instead of Promises directly.
- Handle errors using try/catch blocks.
- Top-level module exports shouldn't use => syntax, to enable proper hoisting and named references
- Use == and != for comparisons unless stricter comparisons are necessary.
- Use fetch API for network requests.

## Use Logging Liberally

- Use appropriate console methods:
    - `console.debug()`: Minor information, loop iterations, internal details.
    - `console.info()`: Useful but non-critical messages.
    - `console.log()`: General information useful to end-users.
    - `console.warn()`: Important notices or potential issues users must see.
    - `console.error()`: Only for unrecoverable errors; always include relevant debugging information.
- Use exactly three emojis per console message: one shared per file, one per function, and one per message. Emojis should be unique project wide and relevant to the context. Ex : 👥 for the UserAuthentication module, 📖 for the login function, 🔑 for the "authenticating" message and 🍭 for the "success" message.

```javascript
console.info('👥📖🔑 Authenticating user...');
console.log('👥📖🍭 Successfully logged in');
```

## Type Definitions

- Use only JavaScript syntax, no Typescript syntax (except for `.d.ts` files).
- Include type definitions via JSDoc comments.
- Define shared types in a separate `.d.ts` file.
- Keep all `d.ts` files in the `types/` directory.

---

applyTo: 'www/styles/\*\*.css',
description: CSS code style for the project.

---

## Browser Support and Modern APIs

- Assume latest stable Chromium/WebKit/Gecko; ignore legacy browser support.
- Gate features with `@supports` rather than fallbacks.
- Write CSS that stands alone without build steps.

## Properties and Values

- Keep rules sorted alphabetically within each selector block.
- Treat custom properties as first-class design tokens; avoid preprocessors.
- Use logical properties (`margin-inline`, `block-size`) instead of physical ones.
- Use modern color spaces and functions (`oklch()`, `lab()`, `color-mix()`).

## Layout and Positioning

- Prefer native CSS capabilities over JavaScript for layout, animation, and UI state.
- Prefer Grid, Subgrid, and Flexbox over floats or absolute positioning.
- Use Masonry layouts (`grid-template-rows: masonry`) where appropriate.
- Use CSS Anchor Positioning (`anchor-name`, `position-anchor`, `inset-area`) for contextual UI.

## Cascade and Specificity

- Use the least specificity possible.
- Use Cascade Layers (`@layer`) to express intent and ordering; avoid specificity hacks.
- Use modern selectors (`:has()`, `:where()`, `:is()`) to reduce specificity.

## Responsive and Container Design

- Use Container Queries (`@container`, size/style queries) instead of viewport media queries.
- Respect user preferences (`prefers-reduced-motion`, `prefers-color-scheme`, `prefers-contrast`).

## Component Styling

- Use `@scope` for component-level styling; avoid deep descendant selectors.
- Co-locate styles by component; keep global styles minimal and layered.

## Animation and Transitions

- Prefer declarative animations (`@keyframes`, `transition-behavior`) over JS.
- Use the View Transitions API (`::view-transition-*`) for page and component transitions.

---

applyTo: 'www/\*\*.html',
description: HTML code style for the project.

---

## Semantic Structure

- Write semantic HTML first; use ARIA only when semantics are insufficient.
- Prefer native elements (`dialog`, `details`, `popover`, `menu`, `form`) over custom widgets.
- Favor landmarks (`main`, `nav`, `section`, `article`, `aside`) over generic `div`s.
- Use Web Components only when native elements cannot express the behavior.

## Architecture and Encapsulation

- Use Declarative Shadow DOM when encapsulation is beneficial.
- Keep the DOM flat and intentional to support `@scope` and `:has()`.
- Design markup around intentional containment boundaries for Container Queries.
- Structure markup to support View Transitions (stable IDs, meaningful DOM continuity).

## State and Interactivity

- Use data attributes for state and hooks, not class-based state machines.
- Follow progressive enhancement: HTML works without JS; JS upgrades behavior.
- Use native forms and validation before adding JavaScript.
- Prefer URL-addressable state over client-only routing when feasible.

## Modern Practices

- Assume modern attributes (`loading`, `fetchpriority`, `popover`, `inert`).
- Keep markup style-agnostic; let CSS handle layout and presentation.
- Assume ES modules and minimal or no build tooling.
- Optimize for clarity, inspectability, and platform leverage over abstraction.
