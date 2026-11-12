# Web Counter

`<web-counter>` shows a supplied count on rolling digit wheels, with one leading
zero by default. Load the stylesheet for the mechanical face
and the ES module if you want the element to render or update the wheels.

```html
<link rel="stylesheet" href="./styles.css">
<script type="module" src="./index.js"></script>
<web-counter value="1234" leading-zeros="2">
	<output aria-label="Page views">1,234</output>
	<span>Page views</span>
</web-counter>
```

Supply the formatted count in the native output for browsers without JavaScript.
To render wheels on the server, use a `data-count` span for the formatted count,
followed by an `aria-hidden="true" data-reels` span. Give each wheel an empty
child span with `--digit` set to its digit and `--wheel` set to its zero-based
position. Prefix the wheel sequence with the configured number of zeros.

Set `leading-zeros` to an integer from 0 through 16. Use `0` to display just the
digits of the count. An absent or invalid setting uses one leading zero.

The stylesheet rolls each wheel once on arrival and skips motion when the
visitor enables reduced motion. The `value` attribute accepts decimal
integers from zero through `Number.MAX_SAFE_INTEGER`. Absent or invalid values
preserve the current output. The element makes no network requests.
