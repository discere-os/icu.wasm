/**
 * Icu WASM Benchmarks
 */

import IcuWASM from "../src/lib/index.ts"

Deno.bench("icu initialization", {
  baseline: true
}, async () => {
  const lib = new IcuWASM()
  await lib.initialize()
})
