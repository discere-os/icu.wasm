import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import ICU from "../../src/lib/index.ts";

Deno.test("ICU initialization", async () => {
  const icu = new ICU();
  await icu.initialize();

  assertExists(icu);
  assert(icu.isInitialized());

  icu.cleanup();
});

Deno.test("ICU version information", async () => {
  const icu = new ICU();
  await icu.initialize();

  const version = icu.getVersion();
  assertExists(version);
  assertEquals(typeof version.major, "number");
  assertEquals(typeof version.minor, "number");
  assertEquals(typeof version.patch, "number");
  assertEquals(typeof version.micro, "number");
  assert(version.major >= 70); // ICU 70+ expected

  const versionString = version.toString();
  assert(versionString.includes("."));

  icu.cleanup();
});

Deno.test("ICU initialization without proper setup should throw", async () => {
  const icu = new ICU();

  // Should throw when not initialized
  assertRejects(() => {
    return Promise.resolve(icu.getVersion());
  }, "ICU not initialized");
});

Deno.test("ICU cleanup multiple times", async () => {
  const icu = new ICU();
  await icu.initialize();

  assert(icu.isInitialized());

  // Should handle multiple cleanup calls gracefully
  icu.cleanup();
  assert(!icu.isInitialized());

  icu.cleanup(); // Should not throw
  assert(!icu.isInitialized());
});

Deno.test("ICU options configuration", async () => {
  const icu = new ICU({
    simdOptimizations: true,
    maxMemoryMB: 128,
    locale: "en-US"
  });

  await icu.initialize();
  assert(icu.isInitialized());

  icu.cleanup();
});

Deno.test("ICU performance metrics", async () => {
  const icu = new ICU({ simdOptimizations: true });
  await icu.initialize();

  const metrics = icu.getPerformanceMetrics();
  assertExists(metrics);
  assertEquals(typeof metrics.memoryUsageMB, "number");
  assertEquals(typeof metrics.simdUsed, "boolean");

  icu.cleanup();
});

Deno.test("ICU SIMD capabilities", async () => {
  const icu = new ICU();
  await icu.initialize();

  const capabilities = icu.getSIMDCapabilities();
  assertExists(capabilities);
  assertEquals(typeof capabilities.supported, "boolean");
  assertExists(capabilities.version);
  assert(Array.isArray(capabilities.features));

  icu.cleanup();
});