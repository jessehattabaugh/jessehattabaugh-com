# Web Counter

`<web-counter>` shows a supplied count on rolling digit wheels, with one leading
zero by default. Keep `styles.css` next to `index.js`. The element renders the
counter and loads its stylesheet inside its shadow root.

```html
<script type="module" src="./index.js"></script>
<web-counter value="1234"></web-counter>
```

For server rendering, place a `<template shadowrootmode="open">` directly inside
the counter. Include a stylesheet link, an `<output aria-label="Page views">`
with the initial count, and a `<slot name="label">Page views</slot>` for the
caption. The browser renders the template before JavaScript runs, and the
element reuses that output on upgrade. The site's server template also renders
the digit wheels inside this template. A light DOM `<output>` child can provide
a plain count for browsers that lack declarative shadow DOM. To replace the
visible caption, add a child with `slot="label"`.

Set `leading-zeros` to an integer from 0 through 16. Use `0` to display just the
digits of the count. An absent or invalid setting uses one leading zero.

The stylesheet rolls each wheel once on arrival and skips motion when the
visitor enables reduced motion. The `value` attribute accepts decimal
integers from zero through `Number.MAX_SAFE_INTEGER`. The counter starts blank
until it has a valid count. Later invalid values preserve the current count.
