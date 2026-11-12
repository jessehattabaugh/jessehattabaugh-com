import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import { includeIgnoreFile } from '@eslint/compat';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});
const gitignorePath = path.resolve(__dirname, '.gitignore');

export default [
	includeIgnoreFile(gitignorePath),
	...compat.extends('eslint:recommended'),
	{
		languageOptions: {
			globals: { ...globals.es2022 },

			ecmaVersion: 'latest',
			sourceType: 'module',

			parserOptions: { ecmaFeatures: { impliedStrict: true } },
		},

		rules: {
			'accessor-pairs': 'warn',
			'array-callback-return': 'warn',
			'arrow-body-style': ['warn', 'always'],
			camelcase: 'warn',
			curly: 'warn',
			'consistent-return': 'warn',
			'no-await-in-loop': 'warn',
			'no-constant-binary-expression': 'warn',
			'no-constructor-return': 'warn',
			'no-duplicate-imports': 'warn',
			'no-nested-ternary': 'warn',
			'no-param-reassign': 'warn',
			'no-promise-executor-return': 'warn',
			'no-restricted-globals': ['warn', 'event', 'fdescribe'],
			'no-restricted-syntax': [
				'warn',
				{
					selector:
						'CallExpression[callee.name="document"][callee.property.name="write"]',
					message: 'Do not use document.write()',
				},
			],
			'no-return-await': 'warn',
			'no-script-url': 'warn',
			'no-self-compare': 'warn',
			'no-template-curly-in-string': 'warn',
			'no-unmodified-loop-condition': 'warn',
			'no-unreachable-loop': 'warn',
			'no-unused-private-class-members': 'warn',
			'no-unused-vars': 'warn',
			'no-use-before-define': 'warn',
			'no-var': 'warn',
			'object-shorthand': 'warn',
			'prefer-arrow-callback': 'warn',
			'prefer-const': 'warn',
			'prefer-destructuring': 'warn',
			'prefer-rest-params': 'warn',
			'prefer-spread': 'warn',
			'prefer-template': 'warn',
			'require-atomic-updates': 'warn',
		},
	},
	// Each runtime gets only its own globals. Cross-runtime code uses Web APIs
	// available to Node, Cloudflare Workers, and browsers, never DOM/Node bindings.
	{ files: ['client/**/*.js'], ignores: ['client/**/sw.js', 'client/shared/rainbow-hour/**'], languageOptions: { globals: globals.browser } },
	{ files: ['client/**/sw.js'], languageOptions: { globals: globals.serviceworker } },
	{ files: ['client/shared/rainbow-hour/**/*.js'], languageOptions: { globals: { indexedDB: 'readonly' } } },
	{ files: ['server/**/*.js'], languageOptions: { globals: { ...globals.worker, AbortSignal: 'readonly' } } },
	{ files: ['shared/**/*.js'], languageOptions: { globals: Object.fromEntries(['URL', 'URLSearchParams', 'fetch', 'AbortSignal', 'console', 'TextEncoder', 'TextDecoder'].map((name) => { return [name, 'readonly']; })) } },
	{ files: ['build/**/*.js', 'test/**/*.js', '*.mjs', 'playwright.config.js'], languageOptions: { globals: globals.node } },
	{ files: ['test/**/*.js'], languageOptions: { globals: globals.browser } },
	{
		files: ['shared/**/*.js'],
		rules: {
			'no-restricted-imports': ['error', { patterns: [{
				group: ['node:*', 'cloudflare:*', '@cloudflare/*', '**/server/**', '**/client/**', '**/build/**', '**/test/**'],
				message: 'Root shared modules must be runtime-independent. Put runtime-specific code in its owning context.',
			}] }],
		},
	},
	{
		files: ['server/**/*.js'],
		rules: {
			'no-restricted-imports': ['error', { patterns: [{
				group: ['node:*', '**/client/**', '**/build/**', '**/test/**'],
				message: 'Cloudflare request handlers import only server code and runtime-independent shared modules.',
			}] }],
		},
	},
	{
		files: ['client/**/*.js'],
		rules: {
			'no-restricted-imports': ['error', { patterns: [{
				group: ['node:*', 'cloudflare:*', '@cloudflare/*', '**/server/**', '**/build/**', '**/test/**'],
				message: 'Browser code must not import build tooling, tests, or Cloudflare server modules.',
			}] }],
		},
	},
	{
		files: ['server/apps/*/templates.js', 'server/templates/**/*.js', 'build/templates/**/*.js'],
		rules: {
			'no-restricted-imports': ['error', { patterns: [{
				group: ['node:*', 'cloudflare:*', '@cloudflare/*', '**/worker.js', '**/data.js', '**/auth/**', '**/server/**', '**/build/**', '**/client/**', '**/test/**'],
				message: 'Templates render pre-authorized data without importing request handlers, persistence, or browser code.',
			}] }],
		},
	},
];
