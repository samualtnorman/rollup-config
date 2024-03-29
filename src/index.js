import babelPresetEnv from "@babel/preset-env"
import babelPresetTypescript from "@babel/preset-typescript"
import { babel } from "@rollup/plugin-babel"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import terser from "@rollup/plugin-terser"
import { findFiles } from "@samual/lib/findFiles"
import { babelPluginHere } from "babel-plugin-here"
import { cpus } from "os"
import prettier from "rollup-plugin-prettier"

/** @arg {{ sourcePath?: string | undefined, outPath?: string | undefined } | undefined} options
  * @return {Promise<import("rollup").RollupOptions>} */
export const rollupConfig = async ({ sourcePath = "src", outPath = "dist" } = {}) => ({
	external: source => !(source.startsWith("/") || source.startsWith(".")),
	input: Object.fromEntries(
		(await findFiles(sourcePath))
			.filter(path =>
				(path.endsWith(".js") && !path.endsWith(".test.js")) ||
				(path.endsWith(".ts") && !path.endsWith(".d.ts") && !path.endsWith(".test.ts"))
			)
			.map(path => [ path.slice(sourcePath.length + 1, -3), path ])
	),
	output: { dir: outPath },
	plugins: [
		babel({
			babelHelpers: "bundled",
			extensions: [ ".ts" ],
			presets: [
				[
					babelPresetEnv,
					/** @satisfies {import("@babel/preset-env").Options} */({ targets: { node: "18.0" } })
				],
				[ babelPresetTypescript, { allowDeclareFields: true, optimizeConstEnums: true } ]
			],
			plugins: [ babelPluginHere() ]
		}),
		nodeResolve({ extensions: [ ".ts" ] }),
		terser({
			compress: { passes: Infinity, unsafe: true, sequences: false },
			maxWorkers: Math.floor(cpus().length / 2),
			mangle: false
		}),
		prettier({
			parser: "espree",
			useTabs: true,
			tabWidth: 4,
			arrowParens: "avoid",
			experimentalTernaries: true,
			printWidth: 120,
			semi: false,
			trailingComma: "none"
		})
	],
	preserveEntrySignatures: "allow-extension",
	strictDeprecations: true,
	treeshake: { moduleSideEffects: false },
})
