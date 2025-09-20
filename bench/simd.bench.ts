import ICU from "../src/lib/index.ts";
import { ICUSIMDOptimizations } from "../src/lib/simd.ts";

let icu: ICU;
let simd: ICUSIMDOptimizations;

// Setup before benchmarks
await (async () => {
  icu = new ICU({ simdOptimizations: true });
  await icu.initialize();
  // @ts-ignore - Access private module for benchmarking
  simd = new ICUSIMDOptimizations(icu.module);
})();

// Test data
const testTexts = {
  ascii: "Hello World! This is a simple ASCII text for testing performance.",
  unicode:
    "Hello 世界! This contains Unicode: café naïve résumé العربية Русский",
  mixed:
    "Mixed content: Hello World 123! Unicode: café naïve 世界 🚀 ∑∏∫ العربية",
  large: "Performance test string with Unicode content. ".repeat(1000), // ~50KB
  huge: "A".repeat(100000), // 100KB ASCII
  combining: "cafe\u0301 nai\u0308ve re\u0301sume\u0301".repeat(100), // Text with combining marks
};

// ASCII Detection Benchmarks
Deno.bench("SIMD - ASCII detection (small)", () => {
  simd.isASCII(testTexts.ascii);
});

Deno.bench("SIMD - ASCII detection (Unicode)", () => {
  simd.isASCII(testTexts.unicode);
});

Deno.bench("SIMD - ASCII detection (large)", () => {
  simd.isASCII(testTexts.large);
});

Deno.bench("SIMD - ASCII detection (huge ASCII)", () => {
  simd.isASCII(testTexts.huge);
});

// UTF-8 Validation Benchmarks
Deno.bench("SIMD - UTF-8 validation (ASCII)", () => {
  simd.validateUTF8(testTexts.ascii);
});

Deno.bench("SIMD - UTF-8 validation (Unicode)", () => {
  simd.validateUTF8(testTexts.unicode);
});

Deno.bench("SIMD - UTF-8 validation (mixed)", () => {
  simd.validateUTF8(testTexts.mixed);
});

Deno.bench("SIMD - UTF-8 validation (large)", () => {
  simd.validateUTF8(testTexts.large);
});

// String Comparison Benchmarks
Deno.bench("SIMD - String comparison (equal)", () => {
  simd.compareStrings(testTexts.ascii, testTexts.ascii);
});

Deno.bench("SIMD - String comparison (different)", () => {
  simd.compareStrings(testTexts.ascii, testTexts.unicode);
});

Deno.bench("SIMD - String comparison (large)", () => {
  const large1 = testTexts.large + "A";
  const large2 = testTexts.large + "B";
  simd.compareStrings(large1, large2);
});

// Case Conversion Benchmarks
Deno.bench("SIMD - Uppercase conversion (ASCII)", () => {
  simd.toUppercaseASCII("hello world this is a test string");
});

Deno.bench("SIMD - Lowercase conversion (ASCII)", () => {
  simd.toLowercaseASCII("HELLO WORLD THIS IS A TEST STRING");
});

Deno.bench("SIMD - Case conversion (large ASCII)", () => {
  const largeAscii = "hello world ".repeat(1000);
  simd.toUppercaseASCII(largeAscii);
});

// Character Search Benchmarks
Deno.bench("SIMD - Character search (found)", () => {
  simd.findCharacter(testTexts.ascii, "o");
});

Deno.bench("SIMD - Character search (not found)", () => {
  simd.findCharacter(testTexts.ascii, "z");
});

Deno.bench("SIMD - Character search (large text)", () => {
  simd.findCharacter(testTexts.large, "U");
});

// Combining Marks Benchmarks
Deno.bench("SIMD - Combining marks (no marks)", () => {
  simd.countCombiningMarks(testTexts.ascii);
});

Deno.bench("SIMD - Combining marks (with marks)", () => {
  simd.countCombiningMarks(testTexts.combining);
});

Deno.bench("SIMD - Combining marks (mixed text)", () => {
  simd.countCombiningMarks(testTexts.unicode);
});

// Comparison with Standard JavaScript Operations

// ASCII Detection: SIMD vs Standard
Deno.bench("Standard - ASCII detection", () => {
  const text = testTexts.ascii;
  let _isASCII = true;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) {
      _isASCII = false;
      break;
    }
  }
});

// String Comparison: SIMD vs Standard
Deno.bench("Standard - String comparison", () => {
  testTexts.ascii.localeCompare(testTexts.unicode);
});

// Case Conversion: SIMD vs Standard
Deno.bench("Standard - Uppercase conversion", () => {
  "hello world this is a test string".toUpperCase();
});

// Character Search: SIMD vs Standard
Deno.bench("Standard - Character search", () => {
  testTexts.ascii.indexOf("o");
});

// Bulk Operations Benchmarks
Deno.bench("SIMD - Bulk ASCII detection (100 strings)", () => {
  const strings = Array.from({ length: 100 }, (_, i) => `test string ${i}`);
  for (const str of strings) {
    simd.isASCII(str);
  }
});

Deno.bench("SIMD - Bulk UTF-8 validation (100 strings)", () => {
  const strings = Array.from({ length: 100 }, (_, i) => `test café ${i} 世界`);
  for (const str of strings) {
    simd.validateUTF8(str);
  }
});

Deno.bench("SIMD - Bulk case conversion (100 strings)", () => {
  const strings = Array.from({ length: 100 }, (_, i) => `test string ${i}`);
  for (const str of strings) {
    simd.toUppercaseASCII(str);
  }
});

// Complex Mixed Operations
Deno.bench("SIMD - Mixed operations pipeline", () => {
  const text = testTexts.mixed;

  // Simulate a text processing pipeline
  simd.isASCII(text);
  simd.validateUTF8(text);
  simd.findCharacter(text, "U");
  simd.countCombiningMarks(text);
  simd.compareStrings(text, testTexts.ascii);
});

// Memory Intensive Operations
Deno.bench("SIMD - Memory intensive (1MB text)", { group: "memory" }, () => {
  const megabyteText = testTexts.mixed.repeat(20000); // ~1MB
  simd.isASCII(megabyteText);
});

Deno.bench(
  "Standard - Memory intensive (1MB text)",
  { group: "memory" },
  () => {
    const megabyteText = testTexts.mixed.repeat(20000); // ~1MB
    let _isASCII = true;
    for (let i = 0; i < megabyteText.length; i++) {
      if (megabyteText.charCodeAt(i) > 127) {
        _isASCII = false;
        break;
      }
    }
  },
);

// Real-world Simulation Benchmarks
Deno.bench("SIMD - Text validation pipeline", () => {
  const userInput = "User input with émojis 🚀 and café";

  // Simulate validating user input
  const isASCII = simd.isASCII(userInput);
  if (!isASCII.result) {
    simd.validateUTF8(userInput);
    simd.countCombiningMarks(userInput);
  }
});

Deno.bench("SIMD - Search and replace simulation", () => {
  const document = testTexts.large;

  // Simulate searching for various characters
  simd.findCharacter(document, "a");
  simd.findCharacter(document, "e");
  simd.findCharacter(document, "i");
  simd.findCharacter(document, "o");
  simd.findCharacter(document, "u");
});

// Cleanup after benchmarks
globalThis.addEventListener("unload", () => {
  icu?.cleanup();
});
