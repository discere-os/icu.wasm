/**
 * ICU.wasm Intl API Performance Benchmarks
 * Measures performance improvements from browser Intl API delegation
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 */

import ICU from "../src/lib/index.ts";

// Initialize ICU instances for comparison
const icuWithIntl = new ICU({
  enableIntlDelegation: true,
  intlPerformanceLogging: false
});

const icuWithoutIntl = new ICU({
  enableIntlDelegation: false,
  intlPerformanceLogging: false
});

// Setup before benchmarks
await icuWithIntl.initialize();
await icuWithoutIntl.initialize();

console.log("🏃 ICU.wasm Intl API Performance Benchmarks");
console.log("Comparing Intl delegation vs pure ICU implementation");

const testNumbers = Array.from({length: 1000}, (_, i) => Math.random() * 1000000 + i);
const testDates = Array.from({length: 1000}, (_, i) => new Date(Date.now() + i * 86400000));
const testStrings = Array.from({length: 1000}, (_, i) => `test_string_${i}_café_${Math.random().toString(36)}`);

// Number Formatting Benchmarks
Deno.bench("Number Format - Decimal (Intl Delegation)", () => {
  for (const num of testNumbers.slice(0, 100)) {
    icuWithIntl.formatNumber(num, 'en-US', { style: 'decimal' });
  }
});

Deno.bench("Number Format - Decimal (Pure ICU)", () => {
  for (const num of testNumbers.slice(0, 100)) {
    icuWithoutIntl.formatNumber(num, 'en-US', { style: 'decimal' });
  }
});

Deno.bench("Number Format - Currency (Intl Delegation)", () => {
  for (const num of testNumbers.slice(0, 100)) {
    icuWithIntl.formatNumber(num, 'en-US', { style: 'currency', currency: 'USD' });
  }
});

Deno.bench("Number Format - Currency (Pure ICU)", () => {
  for (const num of testNumbers.slice(0, 100)) {
    icuWithoutIntl.formatNumber(num, 'en-US', { style: 'currency', currency: 'USD' });
  }
});

Deno.bench("Number Format - Percent (Intl Delegation)", () => {
  for (const num of testNumbers.slice(0, 100)) {
    icuWithIntl.formatNumber(num / 100, 'en-US', { style: 'percent' });
  }
});

Deno.bench("Number Format - Percent (Pure ICU)", () => {
  for (const num of testNumbers.slice(0, 100)) {
    icuWithoutIntl.formatNumber(num / 100, 'en-US', { style: 'percent' });
  }
});

// Date Formatting Benchmarks
Deno.bench("Date Format - Short Style (Intl Delegation)", () => {
  for (const date of testDates.slice(0, 100)) {
    icuWithIntl.formatDate(date, 'en-US', { dateStyle: 'short', timeStyle: 'short' });
  }
});

Deno.bench("Date Format - Short Style (Pure ICU)", () => {
  for (const date of testDates.slice(0, 100)) {
    icuWithoutIntl.formatDate(date, 'en-US', { dateStyle: 'short', timeStyle: 'short' });
  }
});

Deno.bench("Date Format - Long Style (Intl Delegation)", () => {
  for (const date of testDates.slice(0, 100)) {
    icuWithIntl.formatDate(date, 'en-US', { dateStyle: 'long', timeStyle: 'medium' });
  }
});

Deno.bench("Date Format - Long Style (Pure ICU)", () => {
  for (const date of testDates.slice(0, 100)) {
    icuWithoutIntl.formatDate(date, 'en-US', { dateStyle: 'long', timeStyle: 'medium' });
  }
});

// String Comparison Benchmarks
Deno.bench("String Compare - Basic (Intl Delegation)", () => {
  for (let i = 0; i < 100; i++) {
    const str1 = testStrings[i];
    const str2 = testStrings[i + 1];
    icuWithIntl.compareStrings(str1, str2, 'en-US');
  }
});

Deno.bench("String Compare - Basic (Pure ICU)", () => {
  for (let i = 0; i < 100; i++) {
    const str1 = testStrings[i];
    const str2 = testStrings[i + 1];
    icuWithoutIntl.compareStrings(str1, str2, 'en-US');
  }
});

Deno.bench("String Compare - Numeric (Intl Delegation)", () => {
  const numericStrings = ['item1', 'item2', 'item10', 'item20'];
  for (let i = 0; i < 25; i++) {
    for (let j = 0; j < numericStrings.length - 1; j++) {
      icuWithIntl.compareStrings(numericStrings[j], numericStrings[j + 1], 'en-US', { numeric: true });
    }
  }
});

Deno.bench("String Compare - Numeric (Pure ICU)", () => {
  const numericStrings = ['item1', 'item2', 'item10', 'item20'];
  for (let i = 0; i < 25; i++) {
    for (let j = 0; j < numericStrings.length - 1; j++) {
      icuWithoutIntl.compareStrings(numericStrings[j], numericStrings[j + 1], 'en-US', { numeric: true });
    }
  }
});

// List Formatting Benchmarks
Deno.bench("List Format - Conjunction (Intl Delegation)", () => {
  const testItems = ['apple', 'banana', 'cherry', 'date'];
  for (let i = 0; i < 250; i++) {
    icuWithIntl.formatList(testItems, 'en-US', 'long', 'conjunction');
  }
});

Deno.bench("List Format - Conjunction (Pure ICU)", () => {
  const testItems = ['apple', 'banana', 'cherry', 'date'];
  for (let i = 0; i < 250; i++) {
    icuWithoutIntl.formatList(testItems, 'en-US', 'long', 'conjunction');
  }
});

// Mixed Locale Benchmarks
Deno.bench("Multi-Locale Number Format (Intl Delegation)", () => {
  const locales = ['en-US', 'de-DE', 'fr-FR', 'ja-JP'];
  for (let i = 0; i < 25; i++) {
    for (const locale of locales) {
      icuWithIntl.formatNumber(testNumbers[i], locale, { style: 'decimal' });
    }
  }
});

Deno.bench("Multi-Locale Number Format (Pure ICU)", () => {
  const locales = ['en-US', 'de-DE', 'fr-FR', 'ja-JP'];
  for (let i = 0; i < 25; i++) {
    for (const locale of locales) {
      icuWithoutIntl.formatNumber(testNumbers[i], locale, { style: 'decimal' });
    }
  }
});

// Cleanup after benchmarks
globalThis.addEventListener("unload", () => {
  // ICU instances will be cleaned up automatically
});