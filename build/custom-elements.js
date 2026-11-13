import { existsSync, globSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
// The analyzer ships plugin types but omits its programmatic exports from them.
// @ts-expect-error The package exports create and ts at runtime.
import { create, ts } from '@custom-elements-manifest/analyzer';
import Ajv from 'ajv';
import { parse } from 'comment-parser';
import schema from 'custom-elements-manifest/schema.json' with { type: 'json' };

/** @typedef {import('custom-elements-manifest/schema').Package} Manifest */
/** @typedef {import('custom-elements-manifest/schema').CustomElement & import('custom-elements-manifest/schema').ClassDeclaration} ElementDeclaration */

/** @typedef {{ getText(): string }} TextNode */
/** @typedef {{ name?: { text: string }, jsDoc?: TextNode[] }} ClassNode */
/** @typedef {{ expression: TextNode, arguments: [{ text: string }?] }} DefineCall */

const validate = new Ajv({ strict: false, allErrors: true }).compile(schema);
const check = process.argv.includes('--check');
const browserModules = globSync('client/**/*.js', { exclude: ['**/sw.js'] }).sort();
const componentDirectories = new Set(
	browserModules
		.filter((file) => {
			return file.startsWith('client/components/');
		})
		.map((file) => {
			return file.split('/').slice(0, 3).join('/');
		}),
);

/** Keep the documentation site's light-DOM hooks and input events alongside standard CEM fields.
 * @type {import('@custom-elements-manifest/analyzer').Plugin} */
const extensions = {
	name: 'site JSDoc extensions',
	analyzePhase({ node, moduleDoc }) {
		if (!ts.isClassDeclaration(node)) {
			return;
		}
		const { name, jsDoc = [] } = /** @type {ClassNode} */ (node);
		const declaration = moduleDoc.declarations?.find((entry) => {
			return entry.name === name?.text;
		});
		if (!declaration) {
			return;
		}
		const tags = jsDoc.flatMap((comment) => {
			return parse(comment.getText()).flatMap((block) => {
				return block.tags;
			});
		});
		for (const [tag, key] of [
			['markup', 'x-markup'],
			['listens', 'x-listens'],
		]) {
			const entries = tags
				.filter((item) => {
					return item.tag === tag;
				})
				.map(({ name, type, description }) => {
					return {
						name,
						...(type && { type: { text: type } }),
						description: description.replace(/^- /, ''),
					};
				});
			if (entries.length) {
				Object.assign(declaration, { [key]: entries });
			}
		}
	},
};

/** @param {string} directory @param {string[]} files */
function analyze(directory, files) {
	/** @type {Set<string>} */
	const registered = new Set();
	const modules = files.map((file) => {
		const source = ts.createSourceFile(
			relative(directory, file),
			readFileSync(file, 'utf8'),
			ts.ScriptTarget.Latest,
			true,
		);
		/** @param {unknown} node */
		function visit(node) {
			if (ts.isCallExpression(node)) {
				const call = /** @type {DefineCall} */ (node);
				if (
					/^(?:window\.|globalThis\.)?customElements\.define$/.test(
						call.expression.getText(),
					)
				) {
					const [tag] = call.arguments;
					if (!tag || !ts.isStringLiteral(tag)) {
						throw new Error(
							`${file}: register custom elements with a literal tag so the analyzer can document them.`,
						);
					}
					registered.add(tag.text);
				}
			}
			ts.forEachChild(node, visit);
		}
		visit(source);
		return source;
	});
	/** @type {Manifest} */
	const manifest = create({ modules, plugins: [extensions] });
	manifest.readme = existsSync(join(directory, 'README.md')) ? 'README.md' : '';
	const paths = new Set(
		manifest.modules.map(({ path }) => {
			return path;
		}),
	);
	for (const module of manifest.modules) {
		for (const entry of module.exports ?? []) {
			const reference = entry.declaration;
			if (reference.package || !reference.module) {
				continue;
			}
			// The analyzer emits both import-relative and slash-prefixed package paths.
			const path = reference.module.startsWith('.')
				? normalize(join(dirname(module.path), reference.module))
				: reference.module.replace(/^\//, '');
			if (paths.has(path)) {
				reference.module = path;
			}
		}
	}
	manifest.modules = manifest.modules.filter(({ declarations, exports }) => {
		return (
			declarations?.some((entry) => {
				return 'tagName' in entry;
			}) ||
			exports?.some((entry) => {
				return entry.kind === 'custom-element-definition';
			})
		);
	});

	// Keep actual module exports and registered classes. The analyzer may also
	// infer unexported names from object literals inside a component module.
	for (const module of manifest.modules) {
		const names = new Set(
			module.exports?.map(({ declaration }) => {
				return declaration.name;
			}),
		);
		module.declarations = module.declarations?.filter((entry) => {
			return 'tagName' in entry || names.has(entry.name);
		});
	}

	const elements = manifest.modules.flatMap(({ declarations = [] }) => {
		return /** @type {ElementDeclaration[]} */ (
			declarations.filter((entry) => {
				return 'tagName' in entry;
			})
		);
	});
	for (const tag of registered) {
		const element = elements.find(({ tagName }) => {
			return tagName === tag;
		});
		if (!element?.description?.trim()) {
			throw new Error(`${directory}: ${tag} needs a documented declaration.`);
		}
		const declaringModule = manifest.modules.find(({ declarations }) => {
			return declarations?.includes(element);
		});
		const linked = manifest.modules.some(({ exports }) => {
			return exports?.some((entry) => {
				return (
					entry.kind === 'custom-element-definition' &&
					entry.name === tag &&
					entry.declaration.name === element.name &&
					entry.declaration.module === declaringModule?.path
				);
			});
		});
		if (!linked) {
			throw new Error(
				`${directory}: ${tag} needs a definition pointing to its declaring module.`,
			);
		}
		element.members = element.members?.filter(({ privacy }) => {
			return privacy !== 'private';
		});
		if (!element.members?.length) {
			delete element.members;
		}
		for (const entry of [
			element.attributes,
			element.events,
			element.slots,
			element.cssProperties,
			element.cssParts,
			element.members,
		].flatMap((entries) => {
			return entries ?? [];
		})) {
			if (!entry.description?.trim()) {
				throw new Error(`${tag}: document ${entry.name} in the class JSDoc.`);
			}
		}
	}
	if (!validate(manifest)) {
		throw new Error(`${directory}: ${JSON.stringify(validate.errors, null, '\t')}`);
	}
	return manifest;
}

const targets = new Map([
	['.', browserModules],
	['client', browserModules],
	...[...componentDirectories].map((directory) => {
		return /** @type {[string, string[]]} */ ([
			directory,
			browserModules.filter((file) => {
				return file.startsWith(`${directory}/`);
			}),
		]);
	}),
]);

for (const [directory, files] of targets) {
	const output = join(directory, 'custom-elements.json');
	const contents = `${JSON.stringify(analyze(directory, files), null, '\t')}\n`;
	if (!check) {
		writeFileSync(output, contents);
	} else if (!existsSync(output) || readFileSync(output, 'utf8') !== contents) {
		console.error(`${output} is stale. Run npm run cem:generate.`);
		process.exitCode = 1;
	}
}
