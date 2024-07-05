import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default [
	...compat.extends('eslint:recommended', 'prettier'),
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...globals.serviceworker,
				...globals.worker,
			},
			ecmaVersion: 'latest',
			sourceType: 'module',
			parserOptions: {
				ecmaFeatures: {
					impliedStrict: true,
				},
			},
		},
		rules: {
			'array-callback-return': 'warn',
			'arrow-body-style': ['warn', 'always'],
			camelcase: 'warn',
			curly: 'warn',
			'no-await-in-loop': 'warn',
			'no-constant-binary-expression': 'warn',
			'no-constructor-return': 'warn',
			'no-duplicate-imports': 'warn',
			'no-promise-executor-return': 'warn',
			'no-return-await': 'warn',
			'no-self-compare': 'warn',
			'no-template-curly-in-string': 'warn',
			'no-unmodified-loop-condition': 'warn',
			'no-unreachable-loop': 'warn',
			'no-unused-private-class-members': 'warn',
			'no-unused-vars': 'warn',
			'no-use-before-define': 'warn',
			'object-shorthand': 'warn',
			'prefer-const': 'warn',
			'prefer-destructuring': 'warn',
			'require-atomic-updates': 'warn',
		},
	},
];
