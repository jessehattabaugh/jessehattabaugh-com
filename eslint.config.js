import compatPlugin from 'eslint-plugin-compat';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import path from 'node:path';
import prettierConfig from 'eslint-config-prettier/flat';
import promisePlugin from 'eslint-plugin-promise';
import sonarPlugin from 'eslint-plugin-sonarjs';
import unicornPlugin from 'eslint-plugin-unicorn';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

export default defineConfig([
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
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
				...globals.es2021,
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
