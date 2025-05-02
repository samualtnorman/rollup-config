import babelPresetEnv, { Options as BabelPresetEnvOptions } from "@babel/preset-env"
import babelPresetTypescript from "@babel/preset-typescript"
import { babel, type RollupBabelInputPluginOptions } from "@rollup/plugin-babel"
import json from "@rollup/plugin-json"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import terser, { type Options as TerserOptions } from "@rollup/plugin-terser"
import type { LaxPartial } from "@samual/lib"
import { ensure } from "@samual/lib/assert"
import { findFiles } from "@samual/lib/findFiles"
import { babelPluginHere } from "babel-plugin-here"
import { babelPluginVitest } from "babel-plugin-vitest"
import { defu } from "defu"
import { cpus } from "os"
import * as Path from "path"
import type { RollupOptions } from "rollup"
import prettier, { type Options as PrettierOptions } from "rollup-plugin-prettier"

type Options = LaxPartial<{
	/**
	 * Override the source folder.
	 * @default "src"
	 *
	 * @example
	 * ```js
	 * // rollup.config.js
	 * import { rollupConfig } from "@samual/rollup-config"
	 *
	 * export default rollupConfig({ sourcePath: "source" })
	 * ```
	 */
	sourcePath: string

	/**
	 * Override any Rollup options.
	 * @see [Official Rollup docs.](https://rollupjs.org/configuration-options/)
	 *
	 * @example
	 * ```ts
	 * // rollup.config.js
	 * import { rollupConfig } from "@samual/rollup-config"
	 *
	 * // You can override the output folder like so:
	 * export default rollupConfig({ rollupOptions: { output: { dir: "build" } } })
	 * ```
	 */
	rollupOptions: RollupOptions

	/**
	 * Override any Babel options.
	 * @see [Official Babel docs.](https://babeljs.io/docs/options)
	 */
	babelOptions: RollupBabelInputPluginOptions

	/**
	 * Override any Terser options.
	 * @see [Official Terser docs.](https://terser.org/docs/options/)
	 */
	terserOptions: TerserOptions

	/**
	 * Override any Prettier options.
	 * @see [Official Prettier docs.](https://prettier.io/docs/en/options)
	 */
	prettierOptions: PrettierOptions

	/**
	 * @deprecated Use {@linkcode Options.rollupOptions rollupOptions} [`output.dir`](
	 * https://rollupjs.org/configuration-options/#output-dir) instead.
	 */
	outPath: string

	/**
	 * @deprecated Use {@linkcode Options.rollupOptions rollupOptions} [`output.preserveModules`](
	 * https://rollupjs.org/configuration-options/#output-preservemodules) instead.
	 */
	preserveModules: boolean
}>

/**
 * Construct a {@linkcode RollupOptions} object.
 *
 * Compiles all `.js` and `.ts` files (excludes `.test.js`, `.test.ts`, and `.d.ts`) found in the
 * {@linkcode Options.sourcePath sourcePath}.
 *
 * @see {@linkcode Options}
 *
 * @example
 * ```text
 * src/
 * 	env.d.ts
 * 	foo.ts
 * 	bar/
 * 		baz.ts
 * 		baz.test.ts
 * dist/
 * 	foo.js
 * 	bar/
 * 		baz.js
 * ```
 *
 * @example
 * ```js
 * // rollup.config.js
 * import { rollupConfig } from "@samual/rollup-config"
 *
 * export default rollupConfig()
 * ```
 */
export const rollupConfig = async ({
	sourcePath = "src",
	outPath = "dist",
	preserveModules = false,
	rollupOptions,
	babelOptions,
	terserOptions,
	prettierOptions
}: Options = {}): Promise<RollupOptions> => defu(rollupOptions, {
	external: source => !(Path.isAbsolute(source) || source.startsWith(".")),
	input: Object.fromEntries(
		(await findFiles(sourcePath))
			.filter(path =>
				(path.endsWith(".js") && !path.endsWith(".test.js")) ||
				(path.endsWith(".ts") && !path.endsWith(".d.ts") && !path.endsWith(".test.ts"))
			)
			.map(path => [ path.slice(sourcePath.length + 1, -3), path ])
	),
	output: { dir: outPath, preserveModules },
	plugins: [
		babel(defu(babelOptions, {
			babelHelpers: "bundled",
			extensions: [ ".ts" ],
			presets: [
				[
					babelPresetEnv,
					{ targets: { node: "18.20" } } satisfies BabelPresetEnvOptions
				],
				[ babelPresetTypescript, { allowDeclareFields: true, optimizeConstEnums: true } ]
			],
			plugins: [ babelPluginHere(), babelPluginVitest() ]
		} satisfies RollupBabelInputPluginOptions)),
		nodeResolve({ extensions: [ ".ts" ] }),
		terser(defu(terserOptions, {
			compress: { passes: Infinity, unsafe: true, sequences: false },
			maxWorkers: Math.floor(cpus().length / 2),
			mangle: false,
			ecma: 2020
		} satisfies TerserOptions)),
		{
			name: `no-side-effects`,
			async renderChunk(code) {
				const ast = ensure(await parseAsync(code, { plugins: [ babelPluginSyntaxTypescript ] }))
				const indexes: number[] = []

				traverse(ast, {
					Function(path) {
						if (path.node.loc && !path.node.type.endsWith(`Method`) && (!path.isExpression() || path.parentPath.node.type == `VariableDeclarator`) && path.isPure()) {
							indexes.push(path.node.loc.start.index)
							// console.debug(path.toString())
						}
					}
				})

				indexes.sort((a, b) => b - a)

				for (const index of indexes)
					code = `${code.slice(0, index)}/*@__NO_SIDE_EFFECTS__*/${code.slice(index)}`

				return code
			}
		},
		prettier(defu(prettierOptions, {
			parser: "espree",
			useTabs: true,
			tabWidth: 4,
			arrowParens: "avoid",
			printWidth: 120,
			semi: false,
			trailingComma: "none"
		} satisfies PrettierOptions)),
		json({ preferConst: true })
	],
	preserveEntrySignatures: "strict",
	strictDeprecations: true,
	treeshake: { moduleSideEffects: false }
} satisfies RollupOptions)
