---
applyTo: '**.js'
---

# JavaScript Coding Standards

-   Use ESModules instead of CommonJS.
-   Prefer traditional control structures (`if/else`, `switch`, `while`) for clarity.
-   Avoid creating new names by using array/object destructuring, and rest/spread operators.
-   Use modern APIs where possible, such as `fetch` and `async/await`.
-   Use try/catch blocks for async operations
-   Use `const` for constants and `let` for variables that change.
-   Use `==` and `!=` for comparisons unless stricter comparisons are necessary.
-   Avoid unnecessary abstraction or creating functions solely for organizing code.
-   Functions must have at least two call sites or be passed as callbacks.
-   Keep shared functions in ES modules.
-   Always provide JSDoc type annotations.
-   Use `types.d.ts` for shared types.
-   Use `@typedef` for complex types.
-   Use appropriate console methods:
    -   `console.debug()`: Minor information, loop iterations, internal details.
    -   `console.info()`: Useful but non-critical messages.
    -   `console.log()`: General information useful to end-users.
    -   `console.warn()`: Important notices or potential issues users must see.
    -   `console.error()`: Only for unrecoverable errors; always include relevant debugging information.
-   Use exactly two emojis per console message: one shared per file, one unique per message.
