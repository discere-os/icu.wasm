#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Test the new Intl delegation methods
 */

import ICU from "./src/lib/index.ts";

console.log("🧪 Testing ICU.wasm Intl API Delegation");
console.log("=" + "=".repeat(50));

const icu = new ICU({
  enableIntlDelegation: true,
  intlPerformanceLogging: true
});

try {
  await icu.initialize();
  console.log("✅ ICU initialized successfully");

  // Test enhanced number formatting
  console.log("\n💰 Enhanced Number Formatting:");
  const price = icu.formatNumber(1234.56, 'en-US', { style: 'currency', currency: 'USD' });
  console.log(`Price: ${price}`);

  const percent = icu.formatNumber(0.1234, 'en-US', { style: 'percent' });
  console.log(`Percentage: ${percent}`);

  const decimal = icu.formatNumber(1234567.89, 'de-DE', { style: 'decimal' });
  console.log(`German decimal: ${decimal}`);

  // Test enhanced date formatting
  console.log("\n📅 Enhanced Date Formatting:");
  const now = new Date();

  const shortDate = icu.formatDate(now, 'en-US', { dateStyle: 'short', timeStyle: 'short' });
  console.log(`Short: ${shortDate}`);

  const longDate = icu.formatDate(now, 'fr-FR', { dateStyle: 'long', timeStyle: 'medium' });
  console.log(`French long: ${longDate}`);

  // Test enhanced string comparison
  console.log("\n🔤 Enhanced String Comparison:");
  const cmp1 = icu.compareStrings("apple", "banana", 'en-US');
  console.log(`"apple" vs "banana": ${cmp1}`);

  const cmp2 = icu.compareStrings("item2", "item10", 'en-US', { numeric: true });
  console.log(`"item2" vs "item10" (numeric): ${cmp2}`);

  // Test enhanced list formatting
  console.log("\n📝 Enhanced List Formatting:");
  const fruits = ['apple', 'banana', 'cherry'];
  const fruitList = icu.formatList(fruits, 'en-US', 'long', 'conjunction');
  console.log(`Fruits: ${fruitList}`);

  const colors = ['red', 'green', 'blue'];
  const colorChoice = icu.formatList(colors, 'en-US', 'long', 'disjunction');
  console.log(`Color choice: ${colorChoice}`);

  // Test Intl capabilities
  console.log("\n🌐 Browser Intl Capabilities:");
  const capabilities = icu.getIntlCapabilities();
  if (capabilities) {
    console.log(`Browser: ${capabilities.isChromeBased ? 'Chrome-based' : capabilities.isFirefox ? 'Firefox' : capabilities.isSafari ? 'Safari' : 'Unknown'} v${capabilities.browserVersion}`);
    console.log(`Intl APIs: NumberFormat=${capabilities.hasNumberFormat}, DateTimeFormat=${capabilities.hasDateTimeFormat}, Collator=${capabilities.hasCollator}`);
    console.log(`Advanced: ListFormat=${capabilities.hasListFormat}, PluralRules=${capabilities.hasPluralRules}, Segmenter=${capabilities.hasSegmenter}`);
    console.log(`Supported locales: ${capabilities.supportedLocalesCount}/8 test locales`);
  } else {
    console.log("No Intl capabilities detected - using ICU-only mode");
  }

  console.log("\n✅ All tests completed successfully!");

} catch (error) {
  console.error("❌ Test failed:", error);
  Deno.exit(1);
}