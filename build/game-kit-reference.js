import manifest from '../client/components/game-kit/custom-elements.json' with { type: 'json' };
import { gameKitElements } from '../shared/routes.js';
import { gameKitElement } from './templates/game-kit.js';

/** @param {import('../shared/data/atproto.js').Social} social
 * @param {URLSearchParams} query @param {string} origin
 * @param {import('../shared/routes.js').Route & { name: string }} route */
export function reference(social, query, origin, route) {
	const tag = gameKitElements.find((name) => { return name === route.name; });
	if (!tag) { throw new Error(`Unknown Game Kit element: ${route.name}`); }
	const { modules } = /** @type {{ modules: { declarations?: import('./templates/game-kit.js').Declaration[] }[] }} */ (manifest);
	const declaration = modules.flatMap(({ declarations = [] }) => { return declarations; })
		.find((item) => { return item.tagName === route.name; });
	if (!declaration) { throw new Error(`Game Kit manifest lacks ${route.name}`); }
	return gameKitElement(tag, declaration, social);
}
