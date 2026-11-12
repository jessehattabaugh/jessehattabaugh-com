# rpg-actor

A dependency-free Web Component for rpg.actor sprites. Four directions, nine
expressions, talking, and attribute-driven playback. Code is MIT; artwork retains
its owner's license. Browser-only ES modules; no account writes or analytics.

## Install

Clone https://github.com/jessehattabaugh/jessehattabaugh-com, check out a reviewed
full commit SHA, and copy client/components/rpg-actor into your vendor directory.
Keep the license. Serve the directory from your origin with JavaScript MIME types.

```html
<script type="module" src="/vendor/rpg-actor/index.js"></script>
<rpg-actor src="/sprites/me.png" animation="walk" direction="down" label="My character">
	<img src="/sprites/portrait.png" alt="My character" width="144" height="144">
</rpg-actor>
```

The child image is a cropped portrait fallback, not the whole sheet. Arbitrary
fallback HTML is supported in the default slot. It stays visible until the
component stylesheet and a usable sprite sheet load.

For a bundler, choose one: `npm install ./vendor/rpg-actor`,
`pnpm add ./vendor/rpg-actor`, or `yarn add ./vendor/rpg-actor`.
Import `@jessehattabaugh/rpg-actor` from your browser entry. Relative imports
also work without a package resolver. There is no npm registry release.
The `/element` export supplies RpgActor for manual registration; automatic
registration is guarded and the first definition wins. Import only in browsers.

## Attributes

| Attribute | Default | Contract |
| --- | --- | --- |
| `src` |  | Base sprite sheet URL, relative or HTTP(S). |
| `emotes` | {} | JSON map of expression names to emoteSheet and optional talkSheet image URLs. |
| `columns` | 3 | Base grid columns, 1–16. Invalid values use 3; zero becomes 1. |
| `rows` | 4 | Base grid rows, 1–16. Invalid values use 4; zero becomes 1. |
| `animation` | idle | Walking uses ping-pong columns, normally 0,1,2,1. |
| `direction` | down | Direction row, clamped to the sheet rows. |
| `expression` | neutral | Missing expression sheets fall back to src. |
| `talking` | false | Presence alternates open and closed mouth sheets. |
| `paused` | false | Presence freezes animation. Reflected by the built-in button. |
| `showcase` | false | Presence cycles available expressions, directions and poses. |
| `showcase-duration` | 2400 | Duration of each pose in ms, 150–60000. Invalid values use 2400; values below 150 become 150. Changes take effect immediately. |
| `interval` | 150 | Frame duration in ms, 50–2000. Invalid values use 150; values below 50 become 50. |
| `frame` | absent | Optional zero-based column override; invalid values use idle column. |
| `label` | RPG character | Accessible image name. |

Expressions: neutral, blink, happy, sad, angry, silly, tired, bruh, pout.
Directions: down, left, right, up. Unknown enums use their defaults. Boolean
attributes use presence: paused="false" still pauses. Remove showcase before
manual control. The showcase reflects its current state to the attributes. Each expression holds
its direction through idle, walking, and talking before advancing. Frame speed
(`interval`) is independent of pose duration, which rounds up to the next frame.

```html
<rpg-actor src="/sprites/me.png" showcase showcase-duration="3000">
	<img src="/sprites/portrait.png" alt="My character">
</rpg-actor>
```
Custom base sheets ping-pong across columns; emotes always use the standard 3×4.
The idle column is 1 (or 0 for a one-column sheet). Frame overrides walking only.

```js
const actor = document.querySelector('rpg-actor');
actor.setAttribute('emotes', JSON.stringify({
	happy: { emoteSheet: '/sprites/happy.png', talkSheet: '/sprites/happy-talk.png' }
}));
actor.setAttribute('expression', 'happy');
actor.setAttribute('talking', '');
actor.setAttribute('paused', '');
actor.removeAttribute('paused');
```

Read actor.rpg.sprite/self from the actor's PDS in your application. Convert
spriteSheet and emotes.<name>.{emoteSheet,talkSheet} blob references to image URLs
using the PDS com.atproto.sync.getBlob endpoint with did and cid parameters.
Pass those URLs as src and the emotes JSON map. Raw AT Protocol blob objects are
not URLs. You can host images on your own origin; image display needs no CORS.
Permit the image origin in img-src and the component's shadow styles in style-src.
Only HTTP(S) URLs without embedded credentials are accepted.

## Events and styling

All events bubble, are composed, and are not cancelable:

- actor-change: detail { animation, direction, expression, talking, paused }.
  Fired after attribute changes and showcase steps, not initialization.
- actor-load: detail { src }, fired for each loaded image in this instance.
- actor-error: detail { reason, src }, malformed JSON or a failed image.

No custom public methods or incoming events. Use setAttribute/removeAttribute.
Style --rpg-actor-size (default 144px), ::part(sprite), and ::part(controls).
The default slot remains visible if JavaScript, the stylesheet, or the sheet
fails to load.

## Playback and failures

Missing/failed variants use the base sheet. Invalid emotes JSON is ignored with
an error event. An unavailable base with no usable selected variant exposes the
fallback. Changing src/emotes resets the image cache, allowing retries. Images
load on demand and are reused per instance. Attribute changes discard obsolete
image callbacks. Disconnect stops timers/listeners; reconnect resumes playback.
Hidden documents suspend playback. Reduced motion stops walking, talking, and
showcase progression, even if paused is absent. Manual direction/expression
selection still works. The built-in button pauses/resumes through the attribute.

The component cannot add expressions to an actor that hasn't published them.
Sign in at rpg.actor and save the sprite upgrade first. No invented emote images.

Specification: https://rpg.actor/dev-guide#pc-emotes
Landing page: https://jessehattabaugh.com/components/rpg-actor/
API: custom-elements.json (Custom Elements Manifest 1.0.0).

Keep `styles.css` beside `rpg-actor.js`; the shadow root loads this stylesheet
relative to the module URL.

## Authoritative reference

Always use https://rpg.actor/dev-guide when implementing, integrating, updating,
or reviewing this component. Consult the current guide for every sprite format,
record, playback, emote, talking-sheet, or API decision. It takes precedence over
remembered behavior and examples here; update this package and its manifest if
the official contract changes.
