import babelPresetEnv, { Options as BabelPresetEnvOptions } from "@babel/preset-env"
import babelPresetTypescript from "@babel/preset-typescript"
import { babel } from "@rollup/plugin-babel"
import json from "@rollup/plugin-json"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import terser from "@rollup/plugin-terser"
import type { LaxPartial } from "@samual/lib"
import { findFiles } from "@samual/lib/findFiles"
import { babelPluginHere } from "babel-plugin-here"
import { babelPluginVitest } from "babel-plugin-vitest"
import { defu } from "defu"
import { cpus } from "os"
import * as Path from "path"
import type { RollupOptions } from "rollup"
import prettier from "rollup-plugin-prettier"

export const rollupConfig = async (
	{ sourcePath = "src", outPath = "dist", preserveModules = false, rollupOptions = {} }:
		LaxPartial<{ sourcePath: string, outPath: string, preserveModules: boolean, rollupOptions: RollupOptions }> = {}
): Promise<RollupOptions> => defu(rollupOptions, {
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
		babel({
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
		}),
		nodeResolve({ extensions: [ ".ts" ] }),
		terser({
			compress: { passes: Infinity, unsafe: true, sequences: false },
			maxWorkers: Math.floor(cpus().length / 2),
			mangle: false,
			ecma: 2020
		}),
		prettier({
			parser: "espree",
			useTabs: true,
			tabWidth: 4,
			arrowParens: "avoid",
			printWidth: 120,
			semi: false,
			trailingComma: "none"
		}),
		json({ preferConst: true })
	],
	preserveEntrySignatures: "strict",
	strictDeprecations: true,
	treeshake: { moduleSideEffects: false }
} satisfies RollupOptions)
