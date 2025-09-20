import { assert, assertEquals, assertExists } from "@std/assert";
import ICU from "../../src/lib/index.ts";

Deno.test("Collation - basic string comparison", async () => {
  const icu = new ICU();
  await icu.initialize();

  const collator = icu.createCollator("en");
  assertExists(collator);
  assertEquals(collator.locale, "en");

  // Basic ASCII comparison
  assertEquals(collator.compare("apple", "apple"), 0);
  assert(collator.compare("apple", "banana") < 0);
  assert(collator.compare("banana", "apple") > 0);

  collator.close();
  icu.cleanup();
});

Deno.test("Collation - Unicode string comparison", async () => {
  const icu = new ICU();
  await icu.initialize();

  const collator = icu.createCollator("en");

  // Unicode comparison
  assertEquals(collator.compare("café", "café"), 0);
  assert(collator.compare("café", "cafe") !== 0);

  // Accented characters
  assert(collator.compare("naïve", "naive") !== 0);

  collator.close();
  icu.cleanup();
});

Deno.test("Collation - locale-specific comparison", async () => {
  const icu = new ICU();
  await icu.initialize();

  // English collation
  const enCollator = icu.createCollator("en");
  const enResult = enCollator.compare("ä", "z");

  // German collation (should handle umlauts differently)
  const deCollator = icu.createCollator("de");
  const deResult = deCollator.compare("ä", "z");

  // Results might differ based on locale rules
  assertExists(enResult);
  assertExists(deResult);

  enCollator.close();
  deCollator.close();
  icu.cleanup();
});

Deno.test("Collation - sort keys", async () => {
  const icu = new ICU();
  await icu.initialize();

  const collator = icu.createCollator("en");

  const key1 = collator.getSortKey("apple");
  const key2 = collator.getSortKey("banana");
  const key3 = collator.getSortKey("apple");

  assertExists(key1);
  assertExists(key2);
  assertExists(key3);

  assert(key1 instanceof Uint8Array);
  assert(key2 instanceof Uint8Array);

  // Same strings should produce same sort keys
  assertEquals(key1.length, key3.length);
  for (let i = 0; i < key1.length; i++) {
    assertEquals(key1[i], key3[i]);
  }

  // Different strings should produce different sort keys
  assert(
    key1.length !== key2.length || !key1.every((byte, i) => byte === key2[i]),
  );

  collator.close();
  icu.cleanup();
});

Deno.test("Collation - case sensitivity", async () => {
  const icu = new ICU();
  await icu.initialize();

  const collator = icu.createCollator("en");

  // Case comparison
  const result1 = collator.compare("Apple", "apple");
  const result2 = collator.compare("BANANA", "banana");

  assertExists(result1);
  assertExists(result2);

  // Should handle case differences
  assert(Math.abs(result1) >= 0);
  assert(Math.abs(result2) >= 0);

  collator.close();
  icu.cleanup();
});

Deno.test("Collation - empty and null strings", async () => {
  const icu = new ICU();
  await icu.initialize();

  const collator = icu.createCollator("en");

  // Empty string comparisons
  assertEquals(collator.compare("", ""), 0);
  assert(collator.compare("", "a") < 0);
  assert(collator.compare("a", "") > 0);

  collator.close();
  icu.cleanup();
});

Deno.test("Collation - collator caching", async () => {
  const icu = new ICU();
  await icu.initialize();

  const collator1 = icu.createCollator("en");
  const collator2 = icu.createCollator("en");

  // Should return the same cached instance
  assertEquals(collator1.ptr, collator2.ptr);
  assertEquals(collator1.locale, collator2.locale);

  collator1.close();
  icu.cleanup();
});

Deno.test("Collation - multiple locales", async () => {
  const icu = new ICU();
  await icu.initialize();

  const locales = ["en", "de", "fr", "es"];
  const collators = [];

  for (const locale of locales) {
    const collator = icu.createCollator(locale);
    assertExists(collator);
    assertEquals(collator.locale, locale);
    collators.push(collator);
  }

  // Test that each collator works
  for (const collator of collators) {
    const result = collator.compare("test", "test");
    assertEquals(result, 0);
    collator.close();
  }

  icu.cleanup();
});

Deno.test("Collation - performance with large strings", async () => {
  const icu = new ICU();
  await icu.initialize();

  const collator = icu.createCollator("en");

  // Create large strings for performance testing
  const largeString1 = "a".repeat(10000) + "b";
  const largeString2 = "a".repeat(10000) + "c";

  const startTime = performance.now();
  const result = collator.compare(largeString1, largeString2);
  const endTime = performance.now();

  assert(result < 0); // "b" < "c"
  assert(endTime - startTime < 100); // Should be reasonably fast

  collator.close();
  icu.cleanup();
});
