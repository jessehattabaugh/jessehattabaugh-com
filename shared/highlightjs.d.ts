declare module '@highlightjs/cdn-assets/es/core.min.js' {
	import type { LanguageDefinition } from '@highlightjs/cdn-assets/es/languages/*.min.js';
	const core: {
		registerLanguage(name: string, definition: LanguageDefinition): void;
		registerAliases(alias: string, options: { languageName: string }): void;
		getLanguage(name: string): object | undefined;
		highlight(source: string, options: { language: string, ignoreIllegals: boolean }): { value: string };
	};
	export default core;
}

declare module '@highlightjs/cdn-assets/es/languages/*.min.js' {
	export type LanguageDefinition = (api: unknown) => object;
	const definition: LanguageDefinition;
	export default definition;
}
