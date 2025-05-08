import compatPlugin from 'eslint-plugin-compat';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier/flat';
import promisePlugin from 'eslint-plugin-promise';
import sonarPlugin from 'eslint-plugin-sonarjs';
import unicornPlugin from 'eslint-plugin-unicorn';

export default defineConfig([
	js.configs.recommended,
	importPlugin.flatConfigs.recommended,
	promisePlugin.configs['flat/recommended'],
	unicornPlugin.configs.recommended,
	sonarPlugin.configs.recommended,
	compatPlugin.configs['flat/recommended'],
	prettierConfig,
	{
		languageOptions: {
			ecmaVersion: 'latest',
			globals: {
				...globals.browser,
				...globals.node,
				...globals.serviceworker,
				...globals.worker,
				document: 'readonly',
				navigator: 'readonly',
				window: 'readonly',
			},
			parserOptions: {
				ecmaFeatures: {
					impliedStrict: true,
				},
			},
			sourceType: 'module',
		},
		linterOptions: {
			reportUnusedDisableDirectives: 'error',
		},
	},
]);
