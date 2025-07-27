---
applyTo: '**.spec.js'
---

# Playwright Testing Standards

-	Use Playwright for end-to-end testing; do NOT write Unit tests or use Jest.
-   Tests should be run against the staging or production environment.
-	When selecting elements, prefer using userspace selectors (e.g., `getByRole`, `getByLabelText`) over CSS selectors or `data-*` attributes.
-	Only test the user interface; do not test the implementation.
-	Each URL path should have a single test file.
-	Each HTTP verb that a URL path supports should have a separate `test.describe()` in the test file.
-	Every user interaction should be in a separate `test()` block.
-	Use `test.step()` to group related actions within a test.
-	Avoid using `test.beforeEach()`, `test.beforeAll()`, `test.afterAll()` or `test.afterEach()` unless absolutely necessary.
