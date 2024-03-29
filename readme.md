# Samual's Rollup Config
An opinionated Rollup config.

Put this in your `rollup.config.js`:
```js
import { rollupConfig } from "@samual/rollup-config"

export default rollupConfig()
```

By default, this config finds source files in `src` and emits them to `dist`.
You can override the source path with `rollupConfig({ sourcePath: "source" })` and you can override the out path with
`rollupConfig({ outPath: "build" })`.
