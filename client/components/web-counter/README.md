# Web Counter

`<web-counter>` shows a supplied count on rolling digit wheels, with one leading
zero by default. Keep `styles.css` next to `index.js`. The element renders the
counter and loads its stylesheet inside its shadow root.

```html
<script type="module" src="./index.js"></script>
<web-counter value="1234"></web-counter>
```

You can supply an `<output aria-label="Page views">1,234</output>` child as a
fallback for browsers without JavaScript. To replace the visible “Page views”
caption, add a child with `slot="label"`.

Set `leading-zeros` to an integer from 0 through 16. Use `0` to display just the
digits of the count. An absent or invalid setting uses one leading zero.

The stylesheet rolls each wheel once on arrival and skips motion when the
visitor enables reduced motion. The `value` attribute accepts decimal
integers from zero through `Number.MAX_SAFE_INTEGER`. The counter starts blank
until it has a valid count. Later invalid values preserve the current count.
