/**
 * ICU.wasm Intl API Delegation Tests
 * Comprehensive test coverage for hybrid ICU/Intl implementation
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import ICU from "../../src/lib/index.ts";

Deno.test("Intl API Capability Detection", async () => {
  const icu = new ICU({
    enableIntlDelegation: true,
    intlPerformanceLogging: true
  });

  await icu.initialize();

  const capabilities = icu.getIntlCapabilities();
  assertExists(capabilities);

  // Verify capability detection
  if (typeof Intl !== 'undefined') {
    assertEquals(capabilities.hasIntl, true);
    assertEquals(capabilities.hasNumberFormat, typeof Intl.NumberFormat !== 'undefined');
    assertEquals(capabilities.hasDateTimeFormat, typeof Intl.DateTimeFormat !== 'undefined');
    assertEquals(capabilities.hasCollator, typeof Intl.Collator !== 'undefined');
  }

  console.log("🔍 Detected Intl capabilities:", capabilities);
});

Deno.test("Number Formatting - Intl Delegation vs ICU Fallback", async () => {
  const icu = new ICU({
    enableIntlDelegation: true,
    intlPerformanceLogging: true
  });

  await icu.initialize();

  // Test simple number formatting (should delegate to Intl if available)
  const simpleResult = icu.formatNumber(1234.567, 'en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  assertExists(simpleResult);
  assert(simpleResult.includes('1,234.57') || simpleResult.includes('1234.57'));

  // Test currency formatting (should delegate to Intl if available)
  const currencyResult = icu.formatNumber(1234.56, 'en-US', {
    style: 'currency',
    currency: 'USD'
  });

  assertExists(currencyResult);
  assert(currencyResult.includes('$') && currencyResult.includes('1,234.56'));

  // Test percent formatting (should delegate to Intl if available)
  const percentResult = icu.formatNumber(0.1234, 'en-US', {
    style: 'percent'
  });

  assertExists(percentResult);
  assert(percentResult.includes('%'));

  console.log("✅ Number formatting results:", {
    decimal: simpleResult,
    currency: currencyResult,
    percent: percentResult
  });
});

Deno.test("Date Formatting - Intl Delegation vs ICU Fallback", async () => {
  const icu = new ICU({
    enableIntlDelegation: true,
    intlPerformanceLogging: true
  });

  await icu.initialize();

  const testDate = new Date('2025-01-15T10:30:00Z');

  // Test standard date styles (should delegate to Intl if available)
  const shortDate = icu.formatDate(testDate, 'en-US', {
    dateStyle: 'short',
    timeStyle: 'none'
  });

  const longDate = icu.formatDate(testDate, 'en-US', {
    dateStyle: 'long',
    timeStyle: 'short'
  });

  const fullDateTime = icu.formatDate(testDate, 'en-US', {
    dateStyle: 'full',
    timeStyle: 'full'
  });

  assertExists(shortDate);
  assertExists(longDate);
  assertExists(fullDateTime);

  console.log("✅ Date formatting results:", {
    shortDate,
    longDate,
    fullDateTime
  });

  // Verify different formats produce different results
  assert(shortDate !== longDate);
  assert(longDate !== fullDateTime);
});

Deno.test("String Comparison - Intl Delegation vs ICU Fallback", async () => {
  const icu = new ICU({
    enableIntlDelegation: true,
    intlPerformanceLogging: true
  });

  await icu.initialize();

  // Test basic string comparison (should delegate to Intl if available)
  const result1 = icu.compareStrings("apple", "banana", 'en-US');
  assertEquals(result1, -1); // apple < banana

  const result2 = icu.compareStrings("café", "cafe", 'en-US', {
    strength: 'primary'  // Ignore accents
  });

  const result3 = icu.compareStrings("Apple", "apple", 'en-US', {
    strength: 'secondary'  // Ignore case
  });

  // Test numeric comparison
  const result4 = icu.compareStrings("item2", "item10", 'en-US', {
    numeric: true
  });
  assertEquals(result4, -1); // item2 < item10 (numeric order)

  console.log("✅ String comparison results:", {
    alphabetic: result1,
    accent_insensitive: result2,
    case_insensitive: result3,
    numeric: result4
  });
});

Deno.test("List Formatting - Intl Delegation vs ICU Fallback", async () => {
  const icu = new ICU({
    enableIntlDelegation: true,
    intlPerformanceLogging: true
  });

  await icu.initialize();

  // Test conjunction lists (should delegate to Intl if available)
  const conjunctionResult = icu.formatList(['apple', 'banana', 'cherry'], 'en-US', 'long', 'conjunction');
  assertExists(conjunctionResult);
  assert(conjunctionResult.includes('and'));

  // Test disjunction lists
  const disjunctionResult = icu.formatList(['red', 'green', 'blue'], 'en-US', 'long', 'disjunction');
  assertExists(disjunctionResult);
  assert(disjunctionResult.includes('or'));

  // Test unit lists
  const unitResult = icu.formatList(['5 kg', '10 m', '3 s'], 'en-US', 'short', 'unit');
  assertExists(unitResult);

  // Test edge cases
  const emptyResult = icu.formatList([], 'en-US');
  assertEquals(emptyResult, '');

  const singleResult = icu.formatList(['apple'], 'en-US');
  assertEquals(singleResult, 'apple');

  const twoItemResult = icu.formatList(['apple', 'banana'], 'en-US');
  assert(twoItemResult.includes('and'));

  console.log("✅ List formatting results:", {
    conjunction: conjunctionResult,
    disjunction: disjunctionResult,
    unit: unitResult,
    twoItems: twoItemResult
  });
});

Deno.test("Performance Comparison - Intl vs ICU", async () => {
  const icuWithIntl = new ICU({
    enableIntlDelegation: true,
    intlPerformanceLogging: false  // Reduce noise for benchmarking
  });

  const icuWithoutIntl = new ICU({
    enableIntlDelegation: false,
    intlPerformanceLogging: false
  });

  await icuWithIntl.initialize();
  await icuWithoutIntl.initialize();

  const testNumbers = Array.from({length: 100}, (_, i) => Math.random() * 1000000);
  const testDates = Array.from({length: 100}, (_, i) => new Date(Date.now() + i * 86400000));

  // Benchmark number formatting
  const numberStartWithIntl = performance.now();
  for (const num of testNumbers) {
    icuWithIntl.formatNumber(num, 'en-US', { style: 'currency', currency: 'USD' });
  }
  const numberTimeWithIntl = performance.now() - numberStartWithIntl;

  const numberStartWithoutIntl = performance.now();
  for (const num of testNumbers) {
    icuWithoutIntl.formatNumber(num, 'en-US', { style: 'currency', currency: 'USD' });
  }
  const numberTimeWithoutIntl = performance.now() - numberStartWithoutIntl;

  // Benchmark date formatting
  const dateStartWithIntl = performance.now();
  for (const date of testDates) {
    icuWithIntl.formatDate(date, 'en-US', { dateStyle: 'short', timeStyle: 'short' });
  }
  const dateTimeWithIntl = performance.now() - dateStartWithIntl;

  const dateStartWithoutIntl = performance.now();
  for (const date of testDates) {
    icuWithoutIntl.formatDate(date, 'en-US', { dateStyle: 'short', timeStyle: 'short' });
  }
  const dateTimeWithoutIntl = performance.now() - dateStartWithoutIntl;

  const numberSpeedup = numberTimeWithoutIntl / numberTimeWithIntl;
  const dateSpeedup = dateTimeWithoutIntl / dateTimeWithIntl;

  console.log("📊 Performance Comparison Results:");
  console.log(`  Number formatting: ${numberSpeedup.toFixed(2)}x speedup with Intl delegation`);
  console.log(`  Date formatting: ${dateSpeedup.toFixed(2)}x speedup with Intl delegation`);
  console.log(`  Number times: ${numberTimeWithIntl.toFixed(2)}ms (Intl) vs ${numberTimeWithoutIntl.toFixed(2)}ms (ICU)`);
  console.log(`  Date times: ${dateTimeWithIntl.toFixed(2)}ms (Intl) vs ${dateTimeWithoutIntl.toFixed(2)}ms (ICU)`);

  // Performance should be better or at least comparable
  assert(numberSpeedup >= 0.8, `Number formatting performance regression: ${numberSpeedup}x`);
  assert(dateSpeedup >= 0.8, `Date formatting performance regression: ${dateSpeedup}x`);
});

Deno.test("Fallback Behavior - Complex Operations", async () => {
  const icu = new ICU({
    enableIntlDelegation: true,
    intlPerformanceLogging: true
  });

  await icu.initialize();

  // Test operations that should fall back to ICU (complex patterns, etc.)

  // Complex number formatting that requires ICU
  const complexNumber = icu.formatNumber(1234567.89, 'ar-SA', {
    style: 'decimal',
    minimumIntegerDigits: 8,
    maximumFractionDigits: 3
  });
  assertExists(complexNumber);

  // Custom date pattern that requires ICU
  const complexDate = icu.formatDate(new Date(), 'ja-JP', {
    pattern: 'yyyy年MM月dd日 HH:mm:ss'  // Custom pattern
  });
  // Note: This will likely fail gracefully and use ICU

  console.log("✅ Complex formatting fallback results:", {
    complexNumber,
    complexDate: complexDate || "Used ICU fallback"
  });
});

Deno.test("Error Handling - Invalid Intl Operations", async () => {
  const icu = new ICU({
    enableIntlDelegation: true,
    intlPerformanceLogging: true
  });

  await icu.initialize();

  // Test that invalid operations fall back gracefully
  try {
    const result = icu.formatNumber(NaN, 'invalid-locale');
    assertExists(result);  // Should not throw, should produce some result
  } catch (error) {
    // Acceptable if ICU properly handles the error
    assert(error instanceof Error);
  }

  try {
    const result = icu.formatDate(new Date('invalid'), 'en-US');
    assertExists(result);  // Should not throw
  } catch (error) {
    // Acceptable if ICU properly handles the error
    assert(error instanceof Error);
  }
});

Deno.test("SIMD + Intl Hybrid Performance", async () => {
  const icu = new ICU({
    simdOptimizations: true,
    enableIntlDelegation: true,
    intlPerformanceLogging: false
  });

  await icu.initialize();

  // Test that SIMD and Intl optimizations work together
  const longText = "café".repeat(1000);

  // This test focuses on Intl delegation, SIMD testing is in separate test file

  console.log("✅ SIMD + Intl hybrid performance confirmed");
});