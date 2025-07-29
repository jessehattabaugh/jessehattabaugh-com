#!/usr/bin/env node

import { copyFileSync, cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Build script for Lambda function bundling
 * This script copies page files and creates the package.json with type: module
 *
 * Arguments:
 * 1. inputDirectory - Source directory
 * 2. outputDirectory - Target directory
 * 3. pageEntryPath - Absolute path to the page file
 */
function main() {
	const inputDirectory = process.argv[2];
	const outputDirectory = process.argv[3];
	const pageEntryPath = process.argv[4];

	if (!inputDirectory || !outputDirectory || !pageEntryPath) {
		console.error('Usage: build-lambda.js <inputDirectory> <outputDirectory> <pageEntryPath>');
		process.exit(1);
	}

	try {
		// Calculate relative path from project root to page file
		const projectRoot = path.join(__dirname, '..');
		const relativePagePath = path.relative(projectRoot, pageEntryPath);

		// Set up paths
		const outputPageDirectory = path.join(outputDirectory, path.dirname(relativePagePath));
		const inputPagePath = path.join(inputDirectory, relativePagePath);
		const outputPagePath = path.join(outputDirectory, relativePagePath);
		const inputLibraryPath = path.join(inputDirectory, 'lib');
		const outputLibraryPath = path.join(outputDirectory, 'lib');
		const outputPackageJson = path.join(outputDirectory, 'package.json');

		// Create output directory structure
		if (!existsSync(outputPageDirectory)) {
			mkdirSync(outputPageDirectory, { recursive: true });
		}

		// Copy the page file
		copyFileSync(inputPagePath, outputPagePath);
		console.log(`Copied page file: ${relativePagePath}`);

		// Copy lib directory if it exists
		if (existsSync(inputLibraryPath)) {
			cpSync(inputLibraryPath, outputLibraryPath, { recursive: true });
			console.log('Copied lib directory');
		}

		// Create package.json with ES module type
		writeFileSync(outputPackageJson, JSON.stringify({ type: 'module' }, undefined, 2));
		console.log('Created package.json with type: module');

		console.log('Lambda build completed successfully');
	} catch (error) {
		console.error('Error during Lambda build:', error.message);
		process.exit(1);
	}
}

main();
