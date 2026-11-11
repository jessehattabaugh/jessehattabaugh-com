# Retro game elements

Vendor this directory from a pinned GitHub revision. Serve `index.js` and
`styles.css` from your site.

```html
<link rel="stylesheet" href="./retro-game/styles.css">
<script type="module" src="./retro-game/index.js"></script>

<retro-game start="dock">
	<retro-scene id="dock" data-start tabindex="-1">
		<h1>Dock</h1>
		<retro-screen width="128" height="96">
			<retro-sprite x="32" y="24" width="16" height="16">
				<img src="./rover.png" alt="Rover">
			</retro-sprite>
		</retro-screen>
		<retro-menu><nav aria-label="Moves">
			<a href="#bridge" data-key="ArrowRight">Go east</a>
		</nav></retro-menu>
	</retro-scene>
	<retro-scene id="bridge" tabindex="-1">
		<h1>Bridge</h1>
		<a href="#dock">Return to the dock</a>
	</retro-scene>
</retro-game>
```

- Put scenes directly in a game and give them unique document IDs. Put
  `data-start` on the same scene named by `start`. The fragment selects the
  scene, and browser history works normally. Setting `scene` on an upgraded
  game updates the fragment. An invalid or unrelated fragment selects the
  start scene, or the first named scene. `retro-scene-change` bubbles from the
  game after selection changes. Its detail is `{ scene, previous }`.
- Put graphics directly in a screen. Children paint in DOM order. Tilemaps
  fill the viewport and take a row-major sequence of ordinary elements. Give
  each tile CSS or an image. Sprites use logical pixel positions and can scale
  or flip a child image. Sprite and grid sizing use typed CSS `attr()`. Keep
  descriptions and controls in ordinary HTML for browsers without it.
- Bitmap layers use a direct image child. Set `mode` to `plain`, `affine`,
  `scanlines`, `columns`, or `road`. A screen copies its camera attributes to
  direct layers. Each layer applies its own `factor`, then adds its local
  scroll offset. Transforms render on demand. The image remains available as
  a static fallback, including when JavaScript is disabled or drawing fails.
- Menus contain native links. A fragment link emits the cancelable
  `retro-action` event with `{ scene }` before navigating. Use unescaped
  fragment IDs when consuming this event, or decode percent-encoded link
  fragments yourself. A focused link enables the current menu's `data-key`
  shortcuts. Modified clicks retain their native behavior.
- Wrap a direct `<dialog>` in `<retro-modal>`. Use a native button with
  `command="show-modal"` and `commandfor="dialog-id"` to open it without a
  script in browsers that support dialog commands. Close with Escape or a
  form with `method="dialog"`. After upgrade, use the wrapper's boolean
  `open` attribute for programmatic control. It reflects native changes and
  emits `retro-modal-change` with `{ open }`.

All three events bubble across shadow boundaries. The manifest lists the
complete attribute, CSS, and event contract. The browser runtime has no
game-specific scripts, dependencies, persistence, or hardware backend. A
console interpreter can consume the HTML scene graph and bitmap assets
directly, with hardware-specific palette, memory, and timing checks.
