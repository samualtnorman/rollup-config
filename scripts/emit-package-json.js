#!/usr/bin/env node
import { mkdirSync as makeDirectorySync, writeFileSync } from "fs"
import packageJson_ from "../package.json" assert { type: "json" }

const { private: _0, devDependencies: _1, scripts: _3, engines: { pnpm, ...engines }, ...packageJson } = packageJson_

makeDirectorySync("dist", { recursive: true })
writeFileSync("dist/package.json", JSON.stringify({ ...packageJson, engines }, undefined, "\t"))
process.exit()
