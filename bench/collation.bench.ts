import ICU from "../src/lib/index.ts";

let icu: ICU;

// Setup before benchmarks
await (async () => {
  icu = new ICU();
  await icu.initialize();
})();

// Test data
const testStrings = {
  ascii: ["apple", "banana", "cherry", "date", "elderberry"],
  unicode: ["café", "naïve", "résumé", "München", "北京"],
  mixed: ["apple", "café", "banana", "naïve", "cherry", "résumé"],
  long: Array.from(
    { length: 100 },
    (_, i) => `test_string_${i}_with_some_content`,
  ),
};

// Basic string comparison
Deno.bench("Collation - ASCII comparison", () => {
  const collator = icu.createCollator("en");
  for (let i = 0; i < testStrings.ascii.length - 1; i++) {
    collator.compare(testStrings.ascii[i], testStrings.ascii[i + 1]);
  }
  collator.close();
});

Deno.bench("Collation - Unicode comparison", () => {
  const collator = icu.createCollator("en");
  for (let i = 0; i < testStrings.unicode.length - 1; i++) {
    collator.compare(testStrings.unicode[i], testStrings.unicode[i + 1]);
  }
  collator.close();
});

Deno.bench("Collation - mixed comparison", () => {
  const collator = icu.createCollator("en");
  for (let i = 0; i < testStrings.mixed.length - 1; i++) {
    collator.compare(testStrings.mixed[i], testStrings.mixed[i + 1]);
  }
  collator.close();
});

// Sort key generation
Deno.bench("Collation - ASCII sort keys", () => {
  const collator = icu.createCollator("en");
  for (const str of testStrings.ascii) {
    collator.getSortKey(str);
  }
  collator.close();
});

Deno.bench("Collation - Unicode sort keys", () => {
  const collator = icu.createCollator("en");
  for (const str of testStrings.unicode) {
    collator.getSortKey(str);
  }
  collator.close();
});

// Locale comparison
Deno.bench("Collation - multiple locales", () => {
  const locales = ["en", "de", "fr", "es"];
  for (const locale of locales) {
    const collator = icu.createCollator(locale);
    collator.compare("test", "Test");
    collator.close();
  }
});

// Large string comparison
Deno.bench("Collation - large strings", () => {
  const collator = icu.createCollator("en");
  const largeStr1 = "a".repeat(10000) + "b";
  const largeStr2 = "a".repeat(10000) + "c";
  collator.compare(largeStr1, largeStr2);
  collator.close();
});

// Bulk operations
Deno.bench("Collation - bulk comparison (100 strings)", () => {
  const collator = icu.createCollator("en");
  for (const str of testStrings.long) {
    collator.compare(str, "reference_string");
  }
  collator.close();
});

// String sorting simulation
Deno.bench("Collation - sorting simulation", () => {
  const collator = icu.createCollator("en");
  const strings = [...testStrings.mixed];

  // Simple bubble sort using ICU comparison
  for (let i = 0; i < strings.length - 1; i++) {
    for (let j = 0; j < strings.length - i - 1; j++) {
      if (collator.compare(strings[j], strings[j + 1]) > 0) {
        [strings[j], strings[j + 1]] = [strings[j + 1], strings[j]];
      }
    }
  }

  collator.close();
});

// Performance comparison with native sort
Deno.bench("Collation - native JavaScript comparison", () => {
  const strings = [...testStrings.mixed];
  for (let i = 0; i < strings.length - 1; i++) {
    strings[i].localeCompare(strings[i + 1]);
  }
});

// Cleanup after benchmarks
globalThis.addEventListener("unload", () => {
  icu?.cleanup();
});
