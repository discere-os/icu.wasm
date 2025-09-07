#!/usr/bin/env node

/**
 * ICU.wasm Threaded Performance Test Suite
 * Multi-threaded internationalization testing with parallel processing
 * 
 * Tests threading capabilities, parallel operations, and performance scaling
 * 
 * 
 * WASM Integration Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying ICU project (Unicode License V3)
 */

import { readFileSync, existsSync } from 'fs';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ICUWASMThreadedTest {
    constructor() {
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: [],
            threadingResults: {
                threadingSupported: false,
                workerThreads: 0,
                parallelOperations: 0,
                performanceGains: {}
            }
        };
        
        this.icu = null;
        this.wasmLoaded = false;
        
        // Large test datasets for threading validation
        this.threadingTestData = {
            // Large text collections for parallel normalization
            largeTexts: this.generateLargeTextDataset(),
            
            // Bulk collation test data
            bulkCollation: this.generateBulkCollationDataset(),
            
            // Mass number formatting
            bulkNumbers: this.generateBulkNumberDataset(),
            
            // Performance comparison baselines
            performanceBaselines: {}
        };
    }
    
    generateLargeTextDataset() {
        const texts = [];
        const scripts = [
            'Hello world! Café résumé naïve',
            'مرحبا بالعالم! القهوة والسيرة الذاتية',
            '你好世界！咖啡简历天真',
            'こんにちは世界！カフェ履歴書ナイーブ',
            'Привет мир! Кафе резюме наивный',
            'Hola mundo! Café currículum ingenuo',
            'Bonjour le monde! Café CV naïf',
            'Hallo Welt! Café Lebenslauf naiv'
        ];
        
        // Generate 10,000 text samples for threading tests
        for (let i = 0; i < 10000; i++) {
            const script = scripts[i % scripts.length];
            texts.push(`${script} - Sample ${i}`);
        }
        
        return texts;
    }
    
    generateBulkCollationDataset() {
        const words = [];
        const locales = ['en', 'de', 'fr', 'es', 'zh', 'ja', 'ar', 'ru'];
        
        // Generate 50,000 string pairs for bulk comparison
        for (let i = 0; i < 50000; i++) {
            const locale = locales[i % locales.length];
            words.push([
                `word_${i}_${locale}_a_${Math.random().toString(36)}`,
                `word_${i}_${locale}_b_${Math.random().toString(36)}`
            ]);
        }
        
        return words;
    }
    
    generateBulkNumberDataset() {
        const numbers = [];
        
        // Generate 100,000 numbers for bulk formatting tests
        for (let i = 0; i < 100000; i++) {
            numbers.push((Math.random() - 0.5) * 1000000);
        }
        
        return numbers;
    }
    
    // Helper methods
    assert(condition, message) {
        this.testResults.total++;
        if (condition) {
            this.testResults.passed++;
            console.log(`✅ ${message}`);
            return true;
        } else {
            this.testResults.failed++;
            const error = `❌ ${message}`;
            console.log(error);
            this.testResults.errors.push(error);
            return false;
        }
    }
    
    async loadWASMThreaded() {
        console.log('📦 Loading ICU.wasm Threaded module...');
        
        try {
            // Check if threaded WASM files exist
            const distDir = join(__dirname, '..', 'dist-threaded');
            const wasmFiles = ['icu-threaded.wasm', 'icu-threaded.js'];
            
            for (const file of wasmFiles) {
                const filePath = join(distDir, file);
                if (!existsSync(filePath)) {
                    console.log(`⚠️  Threaded WASM file not found: ${filePath}`);
                    console.log('   Falling back to single-threaded test');
                    return false;
                }
            }
            
            // Check SharedArrayBuffer support
            if (typeof SharedArrayBuffer === 'undefined') {
                console.log('⚠️  SharedArrayBuffer not available - threading tests disabled');
                console.log('   Run with --experimental-wasm-threads or in a compatible browser');
                return false;
            }
            
            // Dynamic import of the threaded WASM module
            const ICUModuleThreaded = await import('../dist-threaded/icu-threaded.js');
            const wasmModule = await ICUModuleThreaded.default();
            
            // Import the threaded WASM wrapper
            const { default: ICUWASMThreaded } = await import('../dist-threaded/icu-wasm-threaded.js');
            this.icu = new ICUWASMThreaded(wasmModule);
            
            const initialized = await this.icu.initialize();
            this.wasmLoaded = initialized;
            
            if (initialized) {
                const stats = this.icu.getStats();
                this.testResults.threadingResults.threadingSupported = stats.threadingEnabled;
                this.testResults.threadingResults.workerThreads = stats.workerThreads;
                
                console.log(`✅ ICU.wasm Threaded loaded successfully`);
                console.log(`   Version: ${this.icu.getVersion()}`);
                console.log(`   Threading: ${stats.threadingEnabled ? '✅ Enabled' : '❌ Disabled'}`);
                console.log(`   Worker threads: ${stats.workerThreads}`);
            } else {
                throw new Error('ICU threaded initialization failed');
            }
            
        } catch (error) {
            console.error('❌ Failed to load ICU.wasm Threaded:', error.message);
            return false;
        }
        
        return this.wasmLoaded;
    }
    
    // Test threading support detection
    async testThreadingSupportDetection() {
        console.log('\n🧵 Testing threading support detection...');
        
        if (!this.wasmLoaded) return;
        
        const stats = this.icu.getStats();
        
        this.assert(typeof stats.threadingEnabled === 'boolean',
                   'Threading support detection returns boolean');
        
        if (stats.threadingEnabled) {
            this.assert(stats.workerThreads > 0,
                       `Worker threads available: ${stats.workerThreads}`);
            
            this.assert(typeof SharedArrayBuffer !== 'undefined',
                       'SharedArrayBuffer support confirmed');
            
            this.assert(typeof Atomics !== 'undefined',
                       'Atomics support confirmed');
        } else {
            console.log('ℹ️  Threading not available in this environment');
        }
    }
    
    // Test parallel text normalization
    async testParallelNormalization() {
        if (!this.wasmLoaded) return;
        
        console.log('\n🔤 Testing parallel text normalization...');
        
        const stats = this.icu.getStats();
        
        try {
            // Test with moderate dataset (1000 texts)
            const testTexts = this.threadingTestData.largeTexts.slice(0, 1000);
            
            // Measure sequential processing
            const sequentialStart = performance.now();
            const sequentialResults = [];
            for (const text of testTexts) {
                sequentialResults.push(this.icu.normalize(text, 'NFC'));
            }
            const sequentialTime = performance.now() - sequentialStart;
            
            // Measure parallel processing
            const parallelStart = performance.now();
            const parallelResults = await this.icu.normalizeParallel(testTexts, 'NFC');
            const parallelTime = performance.now() - parallelStart;
            
            // Verify results are identical
            const resultsMatch = sequentialResults.length === parallelResults.length &&
                                 sequentialResults.every((result, index) => result === parallelResults[index]);
            
            this.assert(resultsMatch,
                       'Parallel normalization produces identical results to sequential');
            
            // Performance comparison
            if (stats.threadingEnabled && testTexts.length >= 100) {
                const speedup = sequentialTime / parallelTime;
                this.assert(speedup > 0.8, // Allow for threading overhead
                           `Parallel normalization performance: ${speedup.toFixed(2)}x (${parallelTime.toFixed(2)}ms vs ${sequentialTime.toFixed(2)}ms)`);
                
                this.testResults.threadingResults.performanceGains.normalization = speedup;
            } else {
                console.log(`ℹ️  Sequential normalization: ${sequentialTime.toFixed(2)}ms`);
                console.log(`ℹ️  Parallel normalization: ${parallelTime.toFixed(2)}ms`);
            }
            
        } catch (error) {
            this.assert(false, `Parallel normalization failed: ${error.message}`);
        }
    }
    
    // Test bulk collation operations
    async testBulkCollation() {
        if (!this.wasmLoaded) return;
        
        console.log('\n🔤 Testing bulk collation operations...');
        
        const stats = this.icu.getStats();
        
        try {
            // Create threaded collator
            const collator = this.icu.createCollator('en');
            
            // Test with moderate dataset (5000 pairs)
            const testPairs = this.threadingTestData.bulkCollation.slice(0, 5000);
            
            // Sequential comparison
            const sequentialStart = performance.now();
            const sequentialResults = testPairs.map(([str1, str2]) => collator.compare(str1, str2));
            const sequentialTime = performance.now() - sequentialStart;
            
            // Bulk comparison
            const bulkStart = performance.now();
            const bulkResults = await collator.compareBulk(testPairs);
            const bulkTime = performance.now() - bulkStart;
            
            // Verify results
            const resultsMatch = sequentialResults.length === bulkResults.length &&
                                 sequentialResults.every((result, index) => result === bulkResults[index]);
            
            this.assert(resultsMatch,
                       'Bulk collation produces identical results to sequential');
            
            // Performance comparison
            if (stats.threadingEnabled && testPairs.length >= 1000) {
                const speedup = sequentialTime / bulkTime;
                this.assert(speedup > 0.8,
                           `Bulk collation performance: ${speedup.toFixed(2)}x (${bulkTime.toFixed(2)}ms vs ${sequentialTime.toFixed(2)}ms)`);
                
                this.testResults.threadingResults.performanceGains.collation = speedup;
            } else {
                console.log(`ℹ️  Sequential collation: ${sequentialTime.toFixed(2)}ms`);
                console.log(`ℹ️  Bulk collation: ${bulkTime.toFixed(2)}ms`);
            }
            
            collator.close();
            
        } catch (error) {
            this.assert(false, `Bulk collation failed: ${error.message}`);
        }
    }
    
    // Test parallel large array sorting
    async testParallelSorting() {
        if (!this.wasmLoaded) return;
        
        console.log('\n🔤 Testing parallel large array sorting...');
        
        const stats = this.icu.getStats();
        
        try {
            const collator = this.icu.createCollator('en');
            
            // Generate large unsorted array
            const largeArray = [];
            for (let i = 0; i < 10000; i++) {
                largeArray.push(`item_${Math.floor(Math.random() * 100000)}_${i}`);
            }
            
            // Sequential sorting
            const sequentialArray = [...largeArray];
            const sequentialStart = performance.now();
            sequentialArray.sort((a, b) => collator.compare(a, b));
            const sequentialTime = performance.now() - sequentialStart;
            
            // Parallel sorting (if available)
            const parallelStart = performance.now();
            const parallelArray = await collator.sortLarge(largeArray);
            const parallelTime = performance.now() - parallelStart;
            
            // Verify sorting correctness
            const sortedCorrectly = parallelArray.every((item, index) => 
                index === 0 || collator.compare(parallelArray[index - 1], item) <= 0
            );
            
            this.assert(sortedCorrectly,
                       'Parallel sorting produces correctly sorted array');
            
            // Performance comparison
            if (stats.threadingEnabled && largeArray.length >= 1000) {
                const speedup = sequentialTime / parallelTime;
                this.assert(speedup > 0.5, // Sorting has more overhead
                           `Parallel sorting performance: ${speedup.toFixed(2)}x (${parallelTime.toFixed(2)}ms vs ${sequentialTime.toFixed(2)}ms)`);
                
                this.testResults.threadingResults.performanceGains.sorting = speedup;
            } else {
                console.log(`ℹ️  Sequential sorting: ${sequentialTime.toFixed(2)}ms`);
                console.log(`ℹ️  Parallel sorting: ${parallelTime.toFixed(2)}ms`);
            }
            
            collator.close();
            
        } catch (error) {
            this.assert(false, `Parallel sorting failed: ${error.message}`);
        }
    }
    
    // Test bulk number formatting
    async testBulkNumberFormatting() {
        if (!this.wasmLoaded) return;
        
        console.log('\n🔢 Testing bulk number formatting...');
        
        const stats = this.icu.getStats();
        
        try {
            const formatter = this.icu.createNumberFormatter('en-US', 'decimal');
            
            // Test with moderate dataset (10000 numbers)
            const testNumbers = this.threadingTestData.bulkNumbers.slice(0, 10000);
            
            // Sequential formatting
            const sequentialStart = performance.now();
            const sequentialResults = testNumbers.map(num => formatter.format(num));
            const sequentialTime = performance.now() - sequentialStart;
            
            // Bulk formatting
            const bulkStart = performance.now();
            const bulkResults = await formatter.formatBulk(testNumbers);
            const bulkTime = performance.now() - bulkStart;
            
            // Verify results
            const resultsMatch = sequentialResults.length === bulkResults.length &&
                                 sequentialResults.every((result, index) => result === bulkResults[index]);
            
            this.assert(resultsMatch,
                       'Bulk number formatting produces identical results');
            
            // Performance comparison
            if (stats.threadingEnabled && testNumbers.length >= 1000) {
                const speedup = sequentialTime / bulkTime;
                this.assert(speedup > 0.8,
                           `Bulk number formatting performance: ${speedup.toFixed(2)}x (${bulkTime.toFixed(2)}ms vs ${sequentialTime.toFixed(2)}ms)`);
                
                this.testResults.threadingResults.performanceGains.numberFormatting = speedup;
            } else {
                console.log(`ℹ️  Sequential formatting: ${sequentialTime.toFixed(2)}ms`);
                console.log(`ℹ️  Bulk formatting: ${bulkTime.toFixed(2)}ms`);
            }
            
            formatter.close();
            
        } catch (error) {
            this.assert(false, `Bulk number formatting failed: ${error.message}`);
        }
    }
    
    // Test threading statistics and monitoring
    async testThreadingStatistics() {
        if (!this.wasmLoaded) return;
        
        console.log('\n📊 Testing threading statistics...');
        
        try {
            const stats = this.icu.getStats();
            
            this.assert(typeof stats.threadingEnabled === 'boolean',
                       'Threading enabled status available');
            
            this.assert(typeof stats.workerThreads === 'number',
                       'Worker thread count available');
            
            this.assert(typeof stats.operationsCompleted === 'number',
                       'Operations completed counter available');
            
            this.assert(typeof stats.parallelOperations === 'number',
                       'Parallel operations counter available');
            
            this.assert(typeof stats.averageProcessingTime === 'number',
                       'Average processing time available');
            
            if (stats.threadingEnabled) {
                this.assert(stats.workerThreads > 0,
                           `Active worker threads: ${stats.workerThreads}`);
            }
            
        } catch (error) {
            this.assert(false, `Threading statistics failed: ${error.message}`);
        }
    }
    
    // Test resource management with threading
    async testThreadedResourceManagement() {
        if (!this.wasmLoaded) return;
        
        console.log('\n💾 Testing threaded resource management...');
        
        try {
            // Create multiple resources across threads
            const collators = [];
            const formatters = [];
            
            for (let i = 0; i < 20; i++) {
                collators.push(this.icu.createCollator('en'));
                formatters.push(this.icu.createNumberFormatter('en-US', 'decimal'));
            }
            
            // Test parallel operations with multiple resources
            const tasks = [];
            for (let i = 0; i < collators.length; i++) {
                tasks.push(collators[i].compare('test1', 'test2'));
                tasks.push(formatters[i].format(1234.56));
            }
            
            const results = await Promise.all(tasks);
            this.assert(results.length === 40,
                       'Multiple threaded resources can operate concurrently');
            
            // Cleanup all resources
            for (const collator of collators) {
                collator.close();
            }
            for (const formatter of formatters) {
                formatter.close();
            }
            
            this.assert(true, 'Threaded resource cleanup completed successfully');
            
        } catch (error) {
            this.assert(false, `Threaded resource management failed: ${error.message}`);
        }
    }
    
    // Comprehensive threading performance benchmark
    async benchmarkThreadingPerformance() {
        if (!this.wasmLoaded) return;
        
        console.log('\n🚀 Running comprehensive threading performance benchmark...');
        
        const stats = this.icu.getStats();
        
        if (!stats.threadingEnabled) {
            console.log('ℹ️  Threading not available - skipping performance benchmark');
            return;
        }
        
        try {
            const benchmarkResults = {
                normalization: {},
                collation: {},
                sorting: {},
                numberFormatting: {}
            };
            
            // Normalization benchmark
            console.log('  📝 Benchmarking text normalization...');
            const normTexts = this.threadingTestData.largeTexts.slice(0, 5000);
            
            const normSeqStart = performance.now();
            for (const text of normTexts) {
                this.icu.normalize(text, 'NFC');
            }
            benchmarkResults.normalization.sequential = performance.now() - normSeqStart;
            
            const normParStart = performance.now();
            await this.icu.normalizeParallel(normTexts, 'NFC');
            benchmarkResults.normalization.parallel = performance.now() - normParStart;
            benchmarkResults.normalization.speedup = benchmarkResults.normalization.sequential / benchmarkResults.normalization.parallel;
            
            // Collation benchmark
            console.log('  🔤 Benchmarking text collation...');
            const collator = this.icu.createCollator('en');
            const collPairs = this.threadingTestData.bulkCollation.slice(0, 10000);
            
            const collSeqStart = performance.now();
            collPairs.forEach(([str1, str2]) => collator.compare(str1, str2));
            benchmarkResults.collation.sequential = performance.now() - collSeqStart;
            
            const collBulkStart = performance.now();
            await collator.compareBulk(collPairs);
            benchmarkResults.collation.parallel = performance.now() - collBulkStart;
            benchmarkResults.collation.speedup = benchmarkResults.collation.sequential / benchmarkResults.collation.parallel;
            
            collator.close();
            
            // Number formatting benchmark
            console.log('  🔢 Benchmarking number formatting...');
            const formatter = this.icu.createNumberFormatter('en-US', 'decimal');
            const numbers = this.threadingTestData.bulkNumbers.slice(0, 20000);
            
            const numSeqStart = performance.now();
            numbers.forEach(num => formatter.format(num));
            benchmarkResults.numberFormatting.sequential = performance.now() - numSeqStart;
            
            const numBulkStart = performance.now();
            await formatter.formatBulk(numbers);
            benchmarkResults.numberFormatting.parallel = performance.now() - numBulkStart;
            benchmarkResults.numberFormatting.speedup = benchmarkResults.numberFormatting.sequential / benchmarkResults.numberFormatting.parallel;
            
            formatter.close();
            
            // Store results
            this.testResults.threadingResults.performanceGains = benchmarkResults;
            
            console.log('  ✅ Threading performance benchmark completed');
            
        } catch (error) {
            this.assert(false, `Threading performance benchmark failed: ${error.message}`);
        }
    }
    
    // Run all threaded tests
    async runAllThreadedTests() {
        console.log('🧵 ICU.wasm Threaded Test Suite');
        console.log('==================================');
        
        const startTime = performance.now();
        
        // Load threaded WASM module
        const loaded = await this.loadWASMThreaded();
        if (!loaded) {
            console.log('\n⚠️  Cannot run threading tests - falling back to basic functionality');
            console.log('   Threading requires SharedArrayBuffer support and proper build');
            
            // Run basic tests with fallback message
            this.testResults.threadingResults.threadingSupported = false;
            return false;
        }
        
        // Run threading test suites
        await this.testThreadingSupportDetection();
        await this.testParallelNormalization();
        await this.testBulkCollation();
        await this.testParallelSorting();
        await this.testBulkNumberFormatting();
        await this.testThreadingStatistics();
        await this.testThreadedResourceManagement();
        await this.benchmarkThreadingPerformance();
        
        // Cleanup
        if (this.icu) {
            this.icu.cleanup();
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        // Print results
        console.log('\n📊 Threading Test Results');
        console.log('==========================');
        console.log(`Total tests: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed} ✅`);
        console.log(`Failed: ${this.testResults.failed} ❌`);
        console.log(`Success rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
        console.log(`Total time: ${totalTime.toFixed(2)}ms`);
        
        const threadingResults = this.testResults.threadingResults;
        console.log(`\n🧵 Threading Summary:`);
        console.log(`Threading supported: ${threadingResults.threadingSupported ? '✅' : '❌'}`);
        console.log(`Worker threads: ${threadingResults.workerThreads}`);
        
        if (threadingResults.performanceGains && Object.keys(threadingResults.performanceGains).length > 0) {
            console.log('\n⚡ Performance Gains:');
            for (const [operation, gain] of Object.entries(threadingResults.performanceGains)) {
                if (gain.speedup) {
                    console.log(`   ${operation}: ${gain.speedup.toFixed(2)}x speedup`);
                }
            }
        }
        
        if (this.testResults.failed > 0) {
            console.log('\n❌ Failed tests:');
            this.testResults.errors.forEach(error => console.log(`   ${error}`));
        }
        
        const success = this.testResults.failed === 0;
        console.log(`\n${success ? '✅' : '❌'} ICU.wasm threading test suite ${success ? 'PASSED' : 'FAILED'}`);
        
        return success;
    }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new ICUWASMThreadedTest();
    const success = await tester.runAllThreadedTests();
    process.exit(success ? 0 : 1);
}

export default ICUWASMThreadedTest;