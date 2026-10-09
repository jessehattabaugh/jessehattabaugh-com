/** One local configuration file for Node commands and Wrangler development.
 * Node's native dotenv parser supports the same KEY=value syntax as .dev.vars.
 * CI-provided values win; empty examples never mask working account settings.
 * Credentials are not logged or exported into deployment config. */
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const defaults = parseEnv(readFileSync(new URL('../.dev.vars.example', import.meta.url), 'utf8'));
const source = new URL('../.dev.vars', import.meta.url);
export const localVariables = existsSync(source) ? parseEnv(readFileSync(source, 'utf8')) : {};
for (const [name, value] of Object.entries(localVariables)) {
	if (value?.trim() && !process.env[name]) { process.env[name] = value; }
}

/** Only public Worker settings can enter tracked/generated Wrangler vars. */
export function workerVariables() {
	/** @type {Record<string,string>} */
	const variables = {};
	for (const name of ['EMAIL_FROM', 'VAPID_CONTACT', 'OSRM_URL']) {
		const value = process.env[name]?.trim() ? process.env[name] : defaults[name];
		if (value?.trim()) { variables[name] = value; }
	}
	return variables;
}
