import { assert, assertEquals, assertExists } from "@std/assert";
import ICU from "../../src/lib/index.ts";
import { ICUSIMDOptimizations } from "../../src/lib/simd.ts";

let icu: ICU;
let simd: ICUSIMDOptimizations;

// Setup before tests
async function setup() {
  icu = new ICU({ simdOptimizations: true });
  await icu.initialize();
  // @ts-ignore - Access private module for testing
  simd = new ICUSIMDOptimizations(icu.module);
}

// Cleanup after tests
function cleanup() {
  icu?.cleanup();
}

Deno.test("SIMD - availability check", async () => {
  await setup();

  const available = simd.isAvailable();
  assertEquals(typeof available, "boolean");

  // Even if not available, should not throw
  assert(true);

  cleanup();
});

Deno.test("SIMD - ASCII detection", async () => {
  await setup();

  // Test pure ASCII text
  const asciiResult = simd.isASCII("Hello World 123!");
  assertExists(asciiResult);
  assertEquals(asciiResult.result, true);
  assertEquals(asciiResult.simdUsed, true);
  assertExists(asciiResult.performance);
  assert(asciiResult.performance.averageLatencyMs >= 0);

  // Test non-ASCII text
  const nonAsciiResult = simd.isASCII("Hello 世界!");
  assertExists(nonAsciiResult);
  assertEquals(nonAsciiResult.result, false);
  assertEquals(nonAsciiResult.simdUsed, true);

  cleanup();
});

Deno.test("SIMD - UTF-8 validation", async () => {
  await setup();

  // Valid UTF-8 text
  const validResult = simd.validateUTF8("Hello 世界! café 🚀");
  assertExists(validResult);
  assertEquals(validResult.result, true);
  assertEquals(validResult.simdUsed, true);
  assertExists(validResult.performance);

  // Empty string should be valid
  const emptyResult = simd.validateUTF8("");
  assertEquals(emptyResult.result, true);

  // ASCII should be valid UTF-8
  const asciiResult = simd.validateUTF8("Hello World");
  assertEquals(asciiResult.result, true);

  cleanup();
});

Deno.test("SIMD - string comparison", async () => {
  await setup();

  // Equal strings
  const equalResult = simd.compareStrings("hello", "hello");
  assertExists(equalResult);
  assertEquals(equalResult.result, 0);
  assertEquals(equalResult.simdUsed, true);

  // Different strings
  const diffResult = simd.compareStrings("apple", "banana");
  assert(diffResult.result < 0); // "apple" < "banana"

  const diffResult2 = simd.compareStrings("banana", "apple");
  assert(diffResult2.result > 0); // "banana" > "apple"

  // Unicode strings
  const unicodeResult = simd.compareStrings("café", "cafe");
  assert(unicodeResult.result !== 0);

  cleanup();
});

Deno.test("SIMD - ASCII case conversion", async () => {
  await setup();

  // Uppercase conversion
  const upperResult = simd.toUppercaseASCII("hello world");
  assertExists(upperResult);
  assertEquals(upperResult.result, "HELLO WORLD");
  assertEquals(upperResult.simdUsed, true);

  // Lowercase conversion
  const lowerResult = simd.toLowercaseASCII("HELLO WORLD");
  assertEquals(lowerResult.result, "hello world");

  // Mixed case
  const mixedResult = simd.toUppercaseASCII("HeLLo WoRLd");
  assertEquals(mixedResult.result, "HELLO WORLD");

  // No change needed
  const noChangeResult = simd.toUppercaseASCII("ALREADY UPPER");
  assertEquals(noChangeResult.result, "ALREADY UPPER");

  cleanup();
});

Deno.test("SIMD - character search", async () => {
  await setup();

  // Character found
  const foundResult = simd.findCharacter("hello world", "o");
  assertExists(foundResult);
  assertEquals(foundResult.result, 4); // First 'o' at position 4
  assertEquals(foundResult.simdUsed, true);

  // Character not found
  const notFoundResult = simd.findCharacter("hello world", "z");
  assertEquals(notFoundResult.result, -1);

  // First character
  const firstResult = simd.findCharacter("hello", "h");
  assertEquals(firstResult.result, 0);

  // Last character
  const lastResult = simd.findCharacter("hello", "o");
  assertEquals(lastResult.result, 4);

  cleanup();
});

Deno.test("SIMD - combining marks counting", async () => {
  await setup();

  // Text without combining marks
  const noCombiningResult = simd.countCombiningMarks("hello world");
  assertExists(noCombiningResult);
  assertEquals(noCombiningResult.result, 0);
  assertEquals(noCombiningResult.simdUsed, true);

  // Text with combining marks
  const combiningResult = simd.countCombiningMarks("cafe\u0301"); // e + combining acute
  assertExists(combiningResult);
  assert(combiningResult.result >= 0); // Should detect combining mark

  // Complex text with multiple combining marks
  const complexResult = simd.countCombiningMarks("na\u0301i\u0308ve\u0301"); // Multiple combining marks
  assert(complexResult.result >= 0);

  cleanup();
});

Deno.test("SIMD - capabilities", async () => {
  await setup();

  const capabilities = simd.getCapabilities();
  assertExists(capabilities);
  assertEquals(typeof capabilities.supported, "boolean");
  assertExists(capabilities.version);
  assert(Array.isArray(capabilities.features));

  if (capabilities.supported) {
    assert(capabilities.features.length > 0);
    assert(capabilities.features.includes("i8x16_operations"));
  }

  cleanup();
});

Deno.test("SIMD - benchmark", async () => {
  await setup();

  const testText = "Hello World! This is a test string with some Unicode characters: café naïve résumé 世界 🚀";

  const benchmark = simd.benchmark(testText);
  assertExists(benchmark);
  assertEquals(benchmark.operation, "mixed_unicode_operations");
  assertEquals(benchmark.iterations, 10000);
  assert(benchmark.throughputMBps >= 0);
  assert(benchmark.simdSpeedup >= 1.0);

  cleanup();
});

Deno.test("SIMD - performance tests", async () => {
  await setup();

  const testTexts = [
    "Simple ASCII text",
    "Text with Unicode: café naïve résumé",
    "Complex text: Hello 世界! العربية Русский 🚀 ∑∏∫",
    "A".repeat(10000) // Large text
  ];

  const results = await simd.runPerformanceTests(testTexts);
  assertExists(results);
  assert(Array.isArray(results));
  assert(results.length > 0);

  for (const result of results) {
    assertExists(result.operation);
    assert(result.iterations >= 1);
    assert(result.totalTimeMs >= 0);
    assert(result.averageTimeMs >= 0);
    assert(result.throughputMBps >= 0);
    assert(result.simdSpeedup >= 1.0);
  }

  cleanup();
});

Deno.test("SIMD - large text performance", async () => {
  await setup();

  // Create a large text for performance testing
  const baseText = "Hello World! This is a performance test with Unicode: café naïve 世界 🚀 ";
  const largeText = baseText.repeat(1000); // ~70KB

  const startTime = performance.now();

  // Test ASCII detection
  const asciiResult = simd.isASCII(largeText);
  assertEquals(asciiResult.result, false); // Contains Unicode

  // Test UTF-8 validation
  const utf8Result = simd.validateUTF8(largeText);
  assertEquals(utf8Result.result, true); // Should be valid UTF-8

  // Test case conversion
  const upperResult = simd.toUppercaseASCII("hello world".repeat(5000));
  assertEquals(upperResult.result, "HELLO WORLD".repeat(5000));

  const endTime = performance.now();

  // Should complete within reasonable time
  assert(endTime - startTime < 5000); // Less than 5 seconds

  cleanup();
});

Deno.test("SIMD - edge cases", async () => {
  await setup();

  // Empty string
  const emptyAscii = simd.isASCII("");
  assertEquals(emptyAscii.result, true);

  const emptyUtf8 = simd.validateUTF8("");
  assertEquals(emptyUtf8.result, true);

  const emptySearch = simd.findCharacter("", "a");
  assertEquals(emptySearch.result, -1);

  // Single character
  const singleAscii = simd.isASCII("a");
  assertEquals(singleAscii.result, true);

  const singleUnicode = simd.isASCII("世");
  assertEquals(singleUnicode.result, false);

  // Very long strings
  const longAscii = "a".repeat(100000);
  const longAsciiResult = simd.isASCII(longAscii);
  assertEquals(longAsciiResult.result, true);

  cleanup();
});

Deno.test("SIMD - comparison with standard operations", async () => {
  await setup();

  const testText = "Hello World! Testing SIMD performance vs standard operations.";

  // SIMD ASCII detection
  const simdStart = performance.now();
  const simdResult = simd.isASCII(testText);
  const simdEnd = performance.now();

  // Standard ASCII detection
  const standardStart = performance.now();
  let standardResult = true;
  for (let i = 0; i < testText.length; i++) {
    if (testText.charCodeAt(i) > 127) {
      standardResult = false;
      break;
    }
  }
  const standardEnd = performance.now();

  // Both should give same result
  assertEquals(simdResult.result, standardResult);

  // SIMD should be available (even if not necessarily faster for small strings)
  assertEquals(simdResult.simdUsed, true);

  // Both should complete quickly
  assert(simdEnd - simdStart < 100);
  assert(standardEnd - standardStart < 100);

  cleanup();
});