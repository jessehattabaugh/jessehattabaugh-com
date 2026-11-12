/** Authored pattern indices become HTML records during rendering. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** @type {Record<string, {columns: number, rows: number, tiles: number[]}>} */
export const gameTiles = JSON.parse(readFileSync(fileURLToPath(new URL('../client/games/aether-wing/tilemaps.json', import.meta.url)), 'utf8'));
