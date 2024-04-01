import babelPresetEnv from "@babel/preset-env"
import babelPresetTypescript from "@babel/preset-typescript"
import { babel } from "@rollup/plugin-babel"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import terser from "@rollup/plugin-terser"
import type { LaxPartial } from "@samual/lib"
import { findFiles } from "@samual/lib/findFiles"
import { babelPluginHere } from "babel-plugin-here"
import { cpus } from "os"
import type { RollupOptions } from "rollup"
import prettier from "rollup-plugin-prettier"
import { babelPluginVitest } from "babel-plugin-vitest"

export const rollupConfig = async (
	{ sourcePath = "src", outPath = "dist" }: LaxPartial<{ sourcePath: string; outPath: string }> = {}
): Promise<RollupOptions> => ({
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
			plugins: [ babelPluginHere(), babelPluginVitest() ]
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
