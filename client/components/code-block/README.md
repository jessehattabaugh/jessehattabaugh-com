# Code Block

Display selectable, copyable source in native `<pre><code>` markup. See the
[component documentation](https://jessehattabaugh.com/components/code-block/)
for highlighted examples.

For a browser installation, self-host the published files under
`/components/code-block/` (`index.js`, `code-block.js`, and `styles.css`) and
`/shared/code-highlight.js`. Copy `core.min.js` and the `languages/xml.min.js`,
`languages/css.min.js`, `languages/javascript.min.js`, and `languages/bash.min.js`
files from the `es/` directory of the site's pinned `@highlightjs/cdn-assets`
package into `/vendor/highlightjs/`, preserving the directory structure.
Include the dependency's BSD-3-Clause license with those files.

```html
<link rel="stylesheet" href="/components/code-block/styles.css">
<script type="importmap">
	{"imports":{"@highlightjs/cdn-assets/es/":"/vendor/highlightjs/"}}
</script>
<script type="module" src="/components/code-block/index.js"></script>

<code-block language="html">
	<pre tabindex="0" aria-label="Button source"><code>&lt;button type="button"&gt;Save&lt;/button&gt;</code></pre>
</code-block>
```

Set `language` to `html` (the default), `css`, `javascript`, or `bash`.
`markup`, `js`, `shell`, and `sh` also work. Unknown languages display as plain
text. Build a block with its source in place before connecting it. Use
`textContent` to assign source in JavaScript. Changing the language recolors
the current text.

The site renders authored examples with the shared `codeExample` template.
It adds syntax spans before sending the HTML, so these examples keep their
colors with scripting disabled. Browser-created blocks use the same grammars
and stylesheet. Authored plain source remains readable if the module fails
to load.

The component uses the MIT license.
