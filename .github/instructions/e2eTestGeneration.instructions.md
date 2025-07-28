---
applyTo: '**.spec.js'
---

# End-to-end Testing Standards

-   Use Playwright for end-to-end browser testing of user facing features.
-   Tests should be run against the staging or production environment.
-   When selecting elements, prefer using userspace selectors (e.g., `getByRole`, `getByLabelText`) over CSS selectors or `data-*` attributes.
-   Only test the user interface; do not test the implementation.
-   Each page URL path should have a single test file.
-   Each HTTP verb that a URL path supports should have a separate `test.describe()` in the test file.
-   Every user interaction should be in a separate `test()` block.
-   Avoid using `test.beforeEach()`, `test.beforeAll()`, `test.afterAll()` or `test.afterEach()` unless absolutely necessary.
