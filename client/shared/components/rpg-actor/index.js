import { RpgActor } from './rpg-actor.js';
export { RpgActor, expressions, directions } from './rpg-actor.js';
if (!customElements.get('rpg-actor')) { customElements.define('rpg-actor', RpgActor); }
