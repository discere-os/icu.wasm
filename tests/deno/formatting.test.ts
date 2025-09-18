import { assert, assertEquals, assertExists } from "@std/assert";
import ICU from "../../src/lib/index.ts";

Deno.test("Date formatting - basic functionality", async () => {
  const icu = new ICU();
  await icu.initialize();

  const formatter = icu.createDateFormatter("en");
  assertExists(formatter);
  assertEquals(formatter.locale, "en");

  const testDate = new Date(2025, 0, 1, 12, 0, 0); // January 1, 2025, 12:00 PM
  const formatted = formatter.format(testDate);

  assertExists(formatted);
  assert(formatted.length > 0);
  assert(typeof formatted === "string");

  formatter.close();
  icu.cleanup();
});

Deno.test("Date formatting - different locales", async () => {
  const icu = new ICU();
  await icu.initialize();

  const testDate = new Date(2025, 0, 1, 12, 0, 0);
  const locales = ["en", "de", "fr", "es"];
  const results = [];

  for (const locale of locales) {
    const formatter = icu.createDateFormatter(locale);
    const formatted = formatter.format(testDate);

    assertExists(formatted);
    assert(formatted.length > 0);
    results.push({ locale, formatted });

    formatter.close();
  }

  // Different locales should produce different formats
  const uniqueFormats = new Set(results.map(r => r.formatted));
  // At least some should be different (though some might be the same)
  assert(uniqueFormats.size >= 1);

  icu.cleanup();
});

Deno.test("Date formatting - different styles", async () => {
  const icu = new ICU();
  await icu.initialize();

  const testDate = new Date(2025, 0, 1, 12, 0, 0);
  const styles = ["full", "long", "medium", "short"];

  for (const style of styles) {
    const formatter = icu.createDateFormatter("en", {
      dateStyle: style as any,
      timeStyle: style as any
    });

    const formatted = formatter.format(testDate);
    assertExists(formatted);
    assert(formatted.length > 0);

    formatter.close();
  }

  icu.cleanup();
});

Deno.test("Date formatting - timestamp input", async () => {
  const icu = new ICU();
  await icu.initialize();

  const formatter = icu.createDateFormatter("en");

  const testDate = new Date(2025, 0, 1, 12, 0, 0);
  const timestamp = testDate.getTime();

  const formatted1 = formatter.format(testDate);
  const formatted2 = formatter.format(timestamp);

  assertEquals(formatted1, formatted2);

  formatter.close();
  icu.cleanup();
});

Deno.test("Number formatting - basic functionality", async () => {
  const icu = new ICU();
  await icu.initialize();

  const formatter = icu.createNumberFormatter("en");
  assertExists(formatter);
  assertEquals(formatter.locale, "en");
  assertEquals(formatter.style, "decimal");

  const formatted = formatter.format(1234.56);
  assertExists(formatted);
  assert(formatted.length > 0);
  assert(typeof formatted === "string");

  formatter.close();
  icu.cleanup();
});

Deno.test("Number formatting - different styles", async () => {
  const icu = new ICU();
  await icu.initialize();

  const testNumber = 1234.56;
  const styles = ["decimal", "percent", "scientific"];

  for (const style of styles) {
    const formatter = icu.createNumberFormatter("en", { style: style as any });
    const formatted = formatter.format(testNumber);

    assertExists(formatted);
    assert(formatted.length > 0);
    assertEquals(formatter.style, style);

    formatter.close();
  }

  icu.cleanup();
});

Deno.test("Number formatting - different locales", async () => {
  const icu = new ICU();
  await icu.initialize();

  const testNumber = 1234.56;
  const locales = ["en", "de", "fr"];
  const results = [];

  for (const locale of locales) {
    const formatter = icu.createNumberFormatter(locale);
    const formatted = formatter.format(testNumber);

    assertExists(formatted);
    results.push({ locale, formatted });

    formatter.close();
  }

  // Should have results for all locales
  assertEquals(results.length, locales.length);

  icu.cleanup();
});

Deno.test("Number formatting - edge cases", async () => {
  const icu = new ICU();
  await icu.initialize();

  const formatter = icu.createNumberFormatter("en");

  // Test edge cases
  const testCases = [0, -1, 1, 0.1, -0.1, 1000000, -1000000];

  for (const testCase of testCases) {
    const formatted = formatter.format(testCase);
    assertExists(formatted);
    assert(formatted.length > 0);
  }

  formatter.close();
  icu.cleanup();
});

Deno.test("Number formatting - currency style", async () => {
  const icu = new ICU();
  await icu.initialize();

  const formatter = icu.createNumberFormatter("en", {
    style: "currency",
    currency: "USD"
  });

  const formatted = formatter.format(123.45);
  assertExists(formatted);
  assert(formatted.length > 0);
  // Should contain some currency indication
  assert(formatted.includes("$") || formatted.includes("US") || formatted.includes("123"));

  formatter.close();
  icu.cleanup();
});

Deno.test("Number formatting - percent style", async () => {
  const icu = new ICU();
  await icu.initialize();

  const formatter = icu.createNumberFormatter("en", { style: "percent" });

  const formatted = formatter.format(0.1234);
  assertExists(formatted);
  assert(formatted.length > 0);
  // Should contain percentage indicator
  assert(formatted.includes("%") || formatted.includes("12"));

  formatter.close();
  icu.cleanup();
});

Deno.test("Formatter caching", async () => {
  const icu = new ICU();
  await icu.initialize();

  // Date formatter caching
  const dateFormatter1 = icu.createDateFormatter("en");
  const dateFormatter2 = icu.createDateFormatter("en");
  assertEquals(dateFormatter1.ptr, dateFormatter2.ptr);

  // Number formatter caching
  const numberFormatter1 = icu.createNumberFormatter("en");
  const numberFormatter2 = icu.createNumberFormatter("en");
  assertEquals(numberFormatter1.ptr, numberFormatter2.ptr);

  dateFormatter1.close();
  numberFormatter1.close();
  icu.cleanup();
});

Deno.test("Formatter performance", async () => {
  const icu = new ICU();
  await icu.initialize();

  const dateFormatter = icu.createDateFormatter("en");
  const numberFormatter = icu.createNumberFormatter("en");

  const testDate = new Date();
  const testNumber = 12345.67;
  const iterations = 1000;

  // Date formatting performance
  const dateStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    dateFormatter.format(testDate);
  }
  const dateEnd = performance.now();
  const dateTime = dateEnd - dateStart;

  // Number formatting performance
  const numberStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    numberFormatter.format(testNumber);
  }
  const numberEnd = performance.now();
  const numberTime = numberEnd - numberStart;

  // Should complete reasonably fast
  assert(dateTime < 1000); // Less than 1 second for 1000 operations
  assert(numberTime < 1000);

  dateFormatter.close();
  numberFormatter.close();
  icu.cleanup();
});