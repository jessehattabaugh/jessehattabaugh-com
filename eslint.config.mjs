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
			globals: { ...globals.browser, ...globals.node, workbox: 'readonly' },

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
	// specific configuration for different environments
	{ files: ['**/**.[js,mjs]'], languageOptions: { globals: { ...globals.node } } },
	{ files: ['**/sw.js'], languageOptions: { globals: { ...globals.serviceworker } } },
	{ files: ['**/workers/**.js'], languageOptions: { globals: { ...globals.worker } } },
	{ files: ['**/scripts/**.js'], languageOptions: { globals: { ...globals.browser } } },
];
