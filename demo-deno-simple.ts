#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * ICU.wasm Simple Demo - Quick start example
 */

import ICU from "./src/lib/index.ts";

console.log("🌍 ICU.wasm Simple Demo");
console.log("=" + "=".repeat(30));

async function simpleDemo() {
  const icu = new ICU();
  await icu.initialize();

  console.log(`✅ ICU ${icu.getVersion().toString()} initialized`);

  // 1. Text Comparison
  console.log("\n1️⃣ Text Comparison");
  const collator = icu.createCollator("en");
  const result = collator.compare("apple", "banana");
  console.log(`   "apple" vs "banana": ${result} (${result < 0 ? "apple comes first" : "banana comes first"})`);
  collator.close();

  // 2. Date Formatting
  console.log("\n2️⃣ Date Formatting");
  const dateFormatter = icu.createDateFormatter("en", { dateStyle: "medium" });
  const formattedDate = dateFormatter.format(new Date());
  console.log(`   Today: ${formattedDate}`);
  dateFormatter.close();

  // 3. Number Formatting
  console.log("\n3️⃣ Number Formatting");
  const numberFormatter = icu.createNumberFormatter("en", { style: "currency", currency: "USD" });
  const formattedNumber = numberFormatter.format(1234.56);
  console.log(`   Price: ${formattedNumber}`);
  numberFormatter.close();

  // 4. Text Normalization
  console.log("\n4️⃣ Unicode Normalization");
  const text = "café"; // Single character é
  const decomposed = "cafe\u0301"; // e + combining accent
  const normalized = icu.normalize(decomposed, "NFC");
  console.log(`   "${text}" === "${normalized.normalized}": ${text === normalized.normalized}`);

  icu.cleanup();
  console.log("\n✅ Demo complete!");
}

if (import.meta.main) {
  await simpleDemo();
}