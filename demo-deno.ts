#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * ICU.wasm Demo - International Components for Unicode
 * Comprehensive demonstration of Unicode processing capabilities
 */

import ICU from "./src/lib/index.ts";
import { ICUSIMDOptimizations } from "./src/lib/simd.ts";

console.log("🌍 ICU.wasm Demo - International Components for Unicode");
console.log("=" + "=".repeat(60));

const icu = new ICU({
  simdOptimizations: true,
  maxMemoryMB: 128
});

try {
  await icu.initialize();
  console.log("✅ ICU initialized successfully");

  // Display version information
  const version = icu.getVersion();
  console.log(`📋 ICU Version: ${version.toString()}`);

  console.log("\n🔤 Text Collation & Comparison");
  console.log("-".repeat(40));

  // Collation demo
  const collator = icu.createCollator("en");
  const texts = ["apple", "Banana", "café", "naïve", "zebra"];

  console.log("Original order:", texts.join(", "));

  // Sort using ICU collation
  const sorted = [...texts].sort((a, b) => collator.compare(a, b));
  console.log("ICU sorted:   ", sorted.join(", "));

  // Compare with native sort
  const nativeSorted = [...texts].sort();
  console.log("Native sorted:", nativeSorted.join(", "));

  // Demonstrate sort keys
  console.log("\n🔑 Sort Keys:");
  for (const text of texts.slice(0, 3)) {
    const key = collator.getSortKey(text);
    console.log(`  "${text}": [${key.slice(0, 8).join(", ")}...]`);
  }

  collator.close();

  console.log("\n📅 Date & Time Formatting");
  console.log("-".repeat(40));

  const testDate = new Date(2025, 0, 15, 14, 30, 0);
  const locales = ["en", "de", "fr", "ja"];

  for (const locale of locales) {
    const formatter = icu.createDateFormatter(locale, {
      dateStyle: "full",
      timeStyle: "short"
    });
    const formatted = formatter.format(testDate);
    console.log(`  ${locale}: ${formatted}`);
    formatter.close();
  }

  console.log("\n💰 Number Formatting");
  console.log("-".repeat(40));

  const testNumber = 1234567.89;
  const numberStyles = [
    { style: "decimal", locale: "en" },
    { style: "decimal", locale: "de" },
    { style: "currency", locale: "en", currency: "USD" },
    { style: "percent", locale: "en" }
  ];

  for (const config of numberStyles) {
    const formatter = icu.createNumberFormatter(config.locale, {
      style: config.style as any,
      currency: config.currency
    });
    const formatted = formatter.format(config.style === "percent" ? 0.123456 : testNumber);
    console.log(`  ${config.locale} ${config.style}: ${formatted}`);
    formatter.close();
  }

  console.log("\n🔄 Unicode Normalization");
  console.log("-".repeat(40));

  const testTexts = [
    "café",           // é as single character
    "cafe\u0301",     // e + combining acute accent
    "ﬁle",            // fi ligature
    "Zürich"
  ];

  for (const text of testTexts) {
    console.log(`\nText: "${text}" (${text.length} chars)`);
    for (const form of ["NFC", "NFD", "NFKC", "NFKD"] as const) {
      const result = icu.normalize(text, form);
      console.log(`  ${form}: "${result.normalized}" (${result.normalized.length} chars) ${result.isNormalized ? '✓' : '✗'}`);
    }
  }

  // SIMD Optimizations Demo
  console.log("\n⚡ SIMD Optimizations");
  console.log("-".repeat(40));

  // @ts-ignore - Access private module for demo
  const simd = new ICUSIMDOptimizations(icu.module);

  if (simd.isAvailable()) {
    console.log("✅ SIMD optimizations available");

    const capabilities = simd.getCapabilities();
    console.log(`📊 SIMD Version: ${capabilities.version}`);
    console.log(`🎯 Features: ${capabilities.features.join(", ")}`);

    // ASCII detection performance
    const testText = "Hello World! This is a test string for SIMD optimization demo.";
    const unicodeText = "Hello 世界! This contains Unicode: café naïve résumé 🚀";

    console.log("\n🔍 ASCII Detection:");
    const asciiResult = simd.isASCII(testText);
    console.log(`  "${testText.slice(0, 30)}..."`);
    console.log(`  Result: ${asciiResult.result} (${asciiResult.performance.averageLatencyMs.toFixed(2)}ms)`);

    const unicodeResult = simd.isASCII(unicodeText);
    console.log(`  "${unicodeText.slice(0, 30)}..."`);
    console.log(`  Result: ${unicodeResult.result} (${unicodeResult.performance.averageLatencyMs.toFixed(2)}ms)`);

    // UTF-8 validation
    console.log("\n✅ UTF-8 Validation:");
    const validationResult = simd.validateUTF8(unicodeText);
    console.log(`  Valid UTF-8: ${validationResult.result} (${validationResult.performance.averageLatencyMs.toFixed(2)}ms)`);

    // Case conversion
    console.log("\n🔄 Case Conversion:");
    const caseResult = simd.toUppercaseASCII("hello world simd optimization");
    console.log(`  Original: "hello world simd optimization"`);
    console.log(`  Uppercase: "${caseResult.result}"`);
    console.log(`  Performance: ${caseResult.performance.averageLatencyMs.toFixed(2)}ms`);

    // Character search
    console.log("\n🔎 Character Search:");
    const searchResult = simd.findCharacter(testText, "o");
    console.log(`  Searching for 'o' in: "${testText}"`);
    console.log(`  Found at position: ${searchResult.result} (${searchResult.performance.averageLatencyMs.toFixed(2)}ms)`);

    // Performance benchmark
    console.log("\n⏱️  Performance Benchmark:");
    const benchmark = simd.benchmark(unicodeText);
    console.log(`  Operation: ${benchmark.operation}`);
    console.log(`  Iterations: ${benchmark.iterations.toLocaleString()}`);
    console.log(`  SIMD Speedup: ${benchmark.simdSpeedup?.toFixed(1)}x`);
    console.log(`  Throughput: ${benchmark.throughputMBps?.toFixed(1)} MB/s`);

  } else {
    console.log("❌ SIMD optimizations not available");
  }

  // Performance metrics
  console.log("\n📊 Performance Metrics");
  console.log("-".repeat(40));

  const metrics = icu.getPerformanceMetrics();
  console.log(`Memory Usage: ${metrics.memoryUsageMB} MB`);
  console.log(`SIMD Enabled: ${metrics.simdUsed ? '✅' : '❌'}`);

  // Real-world example
  console.log("\n🌐 Real-World Example: Multi-language Content Processing");
  console.log("-".repeat(60));

  const multilingualContent = [
    "English: Hello World!",
    "Spanish: ¡Hola Mundo!",
    "French: Salut le Monde!",
    "German: Hallo Welt!",
    "Chinese: 你好世界！",
    "Arabic: مرحبا بالعالم!",
    "Russian: Привет мир!",
    "Japanese: こんにちは世界！"
  ];

  console.log("Processing multilingual content:");
  for (const content of multilingualContent) {
    const normalizedNFC = icu.normalize(content, "NFC");
    const isAscii = simd.isASCII(content);
    const isValidUtf8 = simd.validateUTF8(content);

    console.log(`  ${content}`);
    console.log(`    ASCII: ${isAscii.result ? '✅' : '❌'}, UTF-8: ${isValidUtf8.result ? '✅' : '❌'}, Normalized: ${normalizedNFC.isNormalized ? '✅' : '🔄'}`);
  }

  console.log("\n🎯 Use Cases Demonstrated:");
  console.log("  • Text collation and sorting with locale awareness");
  console.log("  • Date and number formatting for internationalization");
  console.log("  • Unicode normalization for text processing");
  console.log("  • SIMD-optimized string operations for performance");
  console.log("  • Multi-language content validation and processing");

} catch (error) {
  console.error("❌ Error during demo:", error);
} finally {
  console.log("\n🧹 Cleanup");
  console.log("-".repeat(40));
  icu.cleanup();
  console.log("✅ ICU cleaned up successfully");

  console.log("\n🚀 Demo completed!");
  console.log("\n💡 Next steps:");
  console.log("  • Run tests: deno task test");
  console.log("  • Run benchmarks: deno task bench");
  console.log("  • Try SIMD demo: deno task demo:simd");
}

if (import.meta.main) {
  // This script is being run directly
}