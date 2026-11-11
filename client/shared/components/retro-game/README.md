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

## Perspective worlds

A world screen contains stages of `retro-layer` background tilemaps and
`retro-sprite` object records. Both reference `retro-tileset` pattern banks.
Image banks declare tile width and height. Indexed banks contain
`retro-tile` pixel palette indices. A tilemap references bank entries by
index and a `retro-palette` by ID. These are the graphics records consumed
by the CSS display and a future hardware interpreter.

CSS owns `perspective`, `perspective-origin`, `translate3d`, ground
`rotateX`, parallax transforms, stepped sprite frames, palette keyframes,
and motion transitions. Native checkboxes and radio controls run/pause the
course, steer the player, shoot targets and select sectors without scripting.
Use the live documentation's copyable HTML as a complete example.

Upgrade adds a fixed 60 Hz simulation, controller input, aimed projectiles,
collision checks, shield damage, score and automatic stage progression.
The same sprite primitive has an `actor` attribute of `player`, `enemy`
or `scenery`. Movement bounds, enemy movement, encounters and shots are
sprite attributes. Optional movement behaviors are `straight`, `sine`,
`dive`, and `chase`. Equal player vertical bounds constrain height.

The `retro-input` element emits normalized axes and commands from
keyboard, held pointer buttons and the first exposed gamepad. Arrow keys
or WASD move, Space fires, and P/Escape pause. A standard controller uses
the left stick or D-pad, bottom face button or right trigger, and Start.
Press a button after connection so the browser exposes it. Disconnecting
hands ownership to another connected pad or keyboard/touch. Set
`deadzone` and `fire-button` to tune input.

Player sprites emit `retro-shot` and `retro-player-hit`. Enemy sprites
emit `retro-enemy-hit`. Stages emit `retro-stage-change`, and worlds
emit `retro-world-change` and `retro-world-error`. All bubble and are
composed. The manifest documents payloads and defaults.

The world reflects `state`, `score`, and `stage`. Players reflect
`position-x`, `position-y`, `health` and selected `frame`, while
rendered objects expose `x`, `y`, and `z`. Missing banks and failed
images stop initialization of the enhancement. Native presentation remains.
The simulation pauses when hidden or unfocused.

Console translation still needs hardware-specific assembly routines,
fixed-point projection, palette packing and sprite/tile resource checks.
The explicit pattern banks, tile and palette indices, object records and
stage tables are the content input for that backend.
