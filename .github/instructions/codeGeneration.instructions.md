---
applyTo: '**.js'
---

# JavaScript Coding Standards

- Use tabs for indentation.
- Prefer traditional control structures (`if/else`, `switch`, `while`) for clarity.
- Use `==` and `!=` for comparisons unless stricter comparisons are necessary.
- Avoid creating functions solely for organizing code.
- Functions must have at least two call sites or be passed as callbacks.
- Move conditional logic up to the caller (centralize branching)
- Move iteration down into batch-oriented functions, so hot loops have fewer branches and can vectorize better.

## Use Modern JavaScript Syntax and APIs

- Support all modern browsers; no Internet Explorer compatibility.
- Use modern APIs where possible, such as `fetch` and `async/await`.
- Use try/catch blocks for async operations
- Use `const` for constants and `let` for variables that change.
- Avoid creating new names by using array/object destructuring, and rest/spread operators.
- Use ESModules instead of CommonJS.
- Keep shared functions in ES modules.
- Avoid using fat arrow functions for top-level exports.

## Logging

- Use appropriate console methods:
  - `console.debug()`: Minor information, loop iterations, internal details.
  - `console.info()`: Useful but non-critical messages.
  - `console.log()`: General information useful to end-users.
  - `console.warn()`: Important notices or potential issues users must see.
  - `console.error()`: Only for unrecoverable errors; always include relevant debugging information.
- Use exactly two emojis per console message: one shared per file, one unique per message.

## Types

- Always provide JSDoc type annotations.
- Never create .ts files (only use JavaScript syntax); do not create a tsconfig.json.
- Use `types.d.ts` for shared types.
- Use `@typedef` for complex types.
