import { defineConfig } from 'eslint/config';
import js from '@eslint/js';

export default defineConfig([
	{
		files: ['**/*.js'],
		plugins: {
			js,
		},
		extends: ['js/recommended'],
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
]);
