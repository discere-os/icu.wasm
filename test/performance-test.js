#!/usr/bin/env node

/**
 * ICU.wasm Performance Benchmark Suite
 * Comprehensive internationalization performance testing
 * 
 * Benchmarks Unicode operations, text processing, collation, and formatting
 * Compares WASM performance against native JavaScript Intl APIs
 * 
 * 
 * WASM Integration Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under the same license as the underlying ICU project (Unicode License V3)
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ICUWASMBenchmark {
    constructor() {
        this.icu = null;
        this.results = {
            environment: this.getEnvironmentInfo(),
            benchmarks: {},
            summary: {},
            timestamp: new Date().toISOString()
        };
        
        // Comprehensive test datasets for internationalization
        this.datasets = {
            // Unicode normalization test data
            normalization: {
                simple: 'Hello World',
                accented: 'café résumé naïve',
                combining: 'e\u0301\u0323\u0302', // e with multiple combining characters
                emoji: '👨‍👩‍👧‍👦🏳️‍🌈🧑🏽‍💻',
                mixed: 'ASCII café 中文 العربية ਪੰਜਾਬੀ русский',
                large: Array(1000).fill('café résumé naïve').join(' ')
            },
            
            // Text collation datasets
            collation: {
                english: ['apple', 'banana', 'cherry', 'date', 'elderberry'],
                german: ['Müller', 'Mueller', 'Muller', 'über', 'Österreich'],
                chinese: ['北京', '上海', '深圳', '广州', '杭州'],
                arabic: ['أحمد', 'محمد', 'عبدالله', 'فاطمة', 'خديجة'],
                mixed: ['apple', 'café', '中文', 'العربية', 'русский'],
                large: Array(1000).fill().map((_, i) => `item_${i}_café_${Math.random().toString(36)}`)
            },
            
            // Date formatting test data
            dates: {
                simple: [new Date('2025-01-15T10:30:00Z')],
                multiple: Array(100).fill().map((_, i) => 
                    new Date(2025, i % 12, (i % 28) + 1, i % 24, i % 60, i % 60)
                ),
                range: Array(1000).fill().map(() => 
                    new Date(Date.now() + (Math.random() - 0.5) * 365 * 24 * 60 * 60 * 1000)
                )
            },
            
            // Number formatting test data  
            numbers: {
                simple: [1234.56, -9876.54, 0.001, 1000000],
                decimals: Array(100).fill().map(() => (Math.random() - 0.5) * 1000000),
                scientific: [1.23e-10, 9.87e15, 3.14159265359, 2.71828182846],
                currencies: [0.01, 99.99, 1234567.89, -999.99],
                large: Array(1000).fill().map(() => Math.random() * 1000000)
            }
        };
        
        // Benchmark configurations
        this.benchmarkConfig = {
            warmupIterations: 10,
            measurementIterations: 100,
            largeDatasetIterations: 10,
            timeoutMs: 30000
        };
    }
    
    getEnvironmentInfo() {
        return {
            platform: process.platform,
            nodeVersion: process.version,
            arch: process.arch,
            memory: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
            cpu: process.env.CPU_MODEL || 'Unknown',
            timestamp: Date.now()
        };
    }
    
    async loadWASM() {
        console.log('📦 Loading ICU.wasm for benchmarking...');
        
        try {
            const distDir = join(__dirname, '..', 'dist');
            
            // Check if build exists
            if (!existsSync(join(distDir, 'icu.wasm'))) {
                throw new Error('ICU.wasm not found. Run ./build-wasm.sh first.');
            }
            
            // Load WASM module
            const ICUModule = await import('../dist/icu.js');
            const wasmModule = await ICUModule.default();
            
            // Load wrapper
            const { default: ICUWASM } = await import('../dist/icu-wasm.js');
            this.icu = new ICUWASM(wasmModule);
            
            const initialized = await this.icu.initialize();
            if (!initialized) {
                throw new Error('ICU initialization failed');
            }
            
            console.log(`✅ ICU.wasm loaded (version: ${this.icu.getVersion()})`);
            return true;
            
        } catch (error) {
            console.error('❌ Failed to load ICU.wasm:', error.message);
            return false;
        }
    }
    
    // Generic benchmark runner
    async runBenchmark(name, operation, iterations = null) {
        const actualIterations = iterations || this.benchmarkConfig.measurementIterations;
        
        // Warmup
        for (let i = 0; i < this.benchmarkConfig.warmupIterations; i++) {
            await operation();
        }
        
        // Measure
        const times = [];
        let totalMemoryDelta = 0;
        
        for (let i = 0; i < actualIterations; i++) {
            const memBefore = process.memoryUsage().heapUsed;
            const startTime = performance.now();
            
            await operation();
            
            const endTime = performance.now();
            const memAfter = process.memoryUsage().heapUsed;
            
            times.push(endTime - startTime);
            totalMemoryDelta += (memAfter - memBefore);
        }
        
        const results = {
            iterations: actualIterations,
            totalTime: times.reduce((a, b) => a + b, 0),
            avgTime: times.reduce((a, b) => a + b, 0) / times.length,
            minTime: Math.min(...times),
            maxTime: Math.max(...times),
            medianTime: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
            opsPerSecond: 1000 / (times.reduce((a, b) => a + b, 0) / times.length),
            avgMemoryDelta: totalMemoryDelta / actualIterations
        };
        
        console.log(`📊 ${name}: ${results.avgTime.toFixed(2)}ms avg, ${Math.round(results.opsPerSecond)} ops/sec`);
        return results;
    }
    
    // Benchmark Unicode normalization
    async benchmarkNormalization() {
        console.log('\n🔤 Benchmarking Unicode normalization...');
        
        const results = {};
        
        // Simple text normalization
        results.simple_nfc = await this.runBenchmark(
            'Simple NFC normalization',
            () => this.icu.normalize(this.datasets.normalization.simple, 'NFC')
        );
        
        results.accented_nfc = await this.runBenchmark(
            'Accented text NFC normalization', 
            () => this.icu.normalize(this.datasets.normalization.accented, 'NFC')
        );
        
        results.combining_nfd = await this.runBenchmark(
            'Combining characters NFD normalization',
            () => this.icu.normalize(this.datasets.normalization.combining, 'NFD')
        );
        
        results.emoji_nfc = await this.runBenchmark(
            'Emoji normalization',
            () => this.icu.normalize(this.datasets.normalization.emoji, 'NFC')
        );
        
        results.mixed_scripts = await this.runBenchmark(
            'Mixed scripts normalization',
            () => this.icu.normalize(this.datasets.normalization.mixed, 'NFC')
        );
        
        results.large_text = await this.runBenchmark(
            'Large text normalization',
            () => this.icu.normalize(this.datasets.normalization.large, 'NFC'),
            this.benchmarkConfig.largeDatasetIterations
        );
        
        // Compare with native JavaScript (when available)
        if (typeof Intl !== 'undefined' && Intl.Normalizer) {
            results.native_simple_nfc = await this.runBenchmark(
                'Native simple NFC normalization',
                () => this.datasets.normalization.simple.normalize('NFC')
            );
        }
        
        return results;
    }
    
    // Benchmark text collation
    async benchmarkCollation() {
        console.log('\n🔤 Benchmarking text collation...');
        
        const results = {};
        
        // Create collators for different locales
        const enCollator = this.icu.createCollator('en');
        const deCollator = this.icu.createCollator('de');
        
        try {
            // Simple comparisons
            results.english_compare = await this.runBenchmark(
                'English text comparison',
                () => enCollator.compare(this.datasets.collation.english[0], this.datasets.collation.english[1])
            );
            
            results.german_compare = await this.runBenchmark(
                'German text comparison',
                () => deCollator.compare(this.datasets.collation.german[0], this.datasets.collation.german[1])
            );
            
            // Sorting operations
            results.english_sort = await this.runBenchmark(
                'English array sorting',
                () => [...this.datasets.collation.english].sort((a, b) => enCollator.compare(a, b))
            );
            
            results.german_sort = await this.runBenchmark(
                'German array sorting',
                () => [...this.datasets.collation.german].sort((a, b) => deCollator.compare(a, b))
            );
            
            results.mixed_sort = await this.runBenchmark(
                'Mixed scripts sorting',
                () => [...this.datasets.collation.mixed].sort((a, b) => enCollator.compare(a, b))
            );
            
            results.large_sort = await this.runBenchmark(
                'Large array sorting',
                () => [...this.datasets.collation.large].sort((a, b) => enCollator.compare(a, b)),
                this.benchmarkConfig.largeDatasetIterations
            );
            
            // Compare with native JavaScript
            results.native_english_sort = await this.runBenchmark(
                'Native English array sorting',
                () => [...this.datasets.collation.english].sort()
            );
            
            results.native_locale_sort = await this.runBenchmark(
                'Native locale-aware sorting',
                () => [...this.datasets.collation.english].sort((a, b) => a.localeCompare(b, 'en'))
            );
            
        } finally {
            enCollator.close();
            deCollator.close();
        }
        
        return results;
    }
    
    // Benchmark date formatting
    async benchmarkDateFormatting() {
        console.log('\n📅 Benchmarking date formatting...');
        
        const results = {};
        
        // Create formatters
        const usFormatter = this.icu.createDateFormatter('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
        const deFormatter = this.icu.createDateFormatter('de-DE');
        
        try {
            // Simple date formatting
            results.us_single_date = await this.runBenchmark(
                'US single date formatting',
                () => usFormatter.format(this.datasets.dates.simple[0])
            );
            
            results.german_single_date = await this.runBenchmark(
                'German single date formatting',
                () => deFormatter.format(this.datasets.dates.simple[0])
            );
            
            // Multiple dates
            results.us_multiple_dates = await this.runBenchmark(
                'US multiple dates formatting',
                () => this.datasets.dates.multiple.forEach(date => usFormatter.format(date)),
                this.benchmarkConfig.largeDatasetIterations
            );
            
            results.large_date_range = await this.runBenchmark(
                'Large date range formatting',
                () => this.datasets.dates.range.forEach(date => usFormatter.format(date)),
                5 // Reduced iterations for large dataset
            );
            
            // Compare with native JavaScript
            const nativeFormatter = new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });
            
            results.native_us_single = await this.runBenchmark(
                'Native US single date formatting',
                () => nativeFormatter.format(this.datasets.dates.simple[0])
            );
            
            results.native_us_multiple = await this.runBenchmark(
                'Native US multiple dates formatting',
                () => this.datasets.dates.multiple.forEach(date => nativeFormatter.format(date)),
                this.benchmarkConfig.largeDatasetIterations
            );
            
        } finally {
            usFormatter.close();
            deFormatter.close();
        }
        
        return results;
    }
    
    // Benchmark number formatting
    async benchmarkNumberFormatting() {
        console.log('\n🔢 Benchmarking number formatting...');
        
        const results = {};
        
        // Create formatters
        const decimalFormatter = this.icu.createNumberFormatter('en-US', 'decimal');
        const currencyFormatter = this.icu.createNumberFormatter('en-US', 'currency');
        const percentFormatter = this.icu.createNumberFormatter('en-US', 'percent');
        const scientificFormatter = this.icu.createNumberFormatter('en-US', 'scientific');
        
        try {
            // Simple number formatting
            results.decimal_simple = await this.runBenchmark(
                'Decimal formatting (simple)',
                () => decimalFormatter.format(this.datasets.numbers.simple[0])
            );
            
            results.currency_simple = await this.runBenchmark(
                'Currency formatting (simple)',
                () => currencyFormatter.format(this.datasets.numbers.currencies[0])
            );
            
            results.percent_simple = await this.runBenchmark(
                'Percent formatting (simple)', 
                () => percentFormatter.format(0.1234)
            );
            
            results.scientific_simple = await this.runBenchmark(
                'Scientific formatting (simple)',
                () => scientificFormatter.format(this.datasets.numbers.scientific[0])
            );
            
            // Multiple numbers
            results.decimal_multiple = await this.runBenchmark(
                'Decimal formatting (multiple)',
                () => this.datasets.numbers.decimals.forEach(num => decimalFormatter.format(num)),
                this.benchmarkConfig.largeDatasetIterations
            );
            
            results.large_dataset = await this.runBenchmark(
                'Large number dataset formatting',
                () => this.datasets.numbers.large.forEach(num => decimalFormatter.format(num)),
                5 // Reduced iterations
            );
            
            // Compare with native JavaScript
            const nativeDecimal = new Intl.NumberFormat('en-US', { style: 'decimal' });
            const nativeCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
            const nativePercent = new Intl.NumberFormat('en-US', { style: 'percent' });
            
            results.native_decimal = await this.runBenchmark(
                'Native decimal formatting',
                () => nativeDecimal.format(this.datasets.numbers.simple[0])
            );
            
            results.native_currency = await this.runBenchmark(
                'Native currency formatting',
                () => nativeCurrency.format(this.datasets.numbers.currencies[0])
            );
            
            results.native_percent = await this.runBenchmark(
                'Native percent formatting',
                () => nativePercent.format(0.1234)
            );
            
            results.native_multiple = await this.runBenchmark(
                'Native multiple decimal formatting',
                () => this.datasets.numbers.decimals.forEach(num => nativeDecimal.format(num)),
                this.benchmarkConfig.largeDatasetIterations
            );
            
        } finally {
            decimalFormatter.close();
            currencyFormatter.close();
            percentFormatter.close();
            scientificFormatter.close();
        }
        
        return results;
    }
    
    // Benchmark memory usage patterns
    async benchmarkMemoryUsage() {
        console.log('\n💾 Benchmarking memory usage...');
        
        const results = {};
        
        // Memory usage for creating/destroying objects
        const measureMemoryUsage = async (operation, iterations = 100) => {
            const beforeMemory = process.memoryUsage();
            
            for (let i = 0; i < iterations; i++) {
                await operation();
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const afterMemory = process.memoryUsage();
            
            return {
                heapUsedDelta: afterMemory.heapUsed - beforeMemory.heapUsed,
                heapTotalDelta: afterMemory.heapTotal - beforeMemory.heapTotal,
                rss: afterMemory.rss
            };
        };
        
        // Test collator creation/destruction
        results.collator_lifecycle = await measureMemoryUsage(
            () => {
                const collator = this.icu.createCollator('en');
                collator.compare('test1', 'test2');
                collator.close();
            }
        );
        
        // Test formatter creation/destruction  
        results.formatter_lifecycle = await measureMemoryUsage(
            () => {
                const formatter = this.icu.createNumberFormatter('en-US', 'decimal');
                formatter.format(1234.56);
                formatter.close();
            }
        );
        
        // Test normalization memory usage
        results.normalization_memory = await measureMemoryUsage(
            () => {
                this.icu.normalize(this.datasets.normalization.mixed, 'NFC');
            }
        );
        
        return results;
    }
    
    // Generate performance comparison with native APIs
    generateComparisons() {
        const comparisons = {};
        
        // Normalization comparison
        if (this.results.benchmarks.normalization?.simple_nfc && 
            this.results.benchmarks.normalization?.native_simple_nfc) {
            
            const wasmTime = this.results.benchmarks.normalization.simple_nfc.avgTime;
            const nativeTime = this.results.benchmarks.normalization.native_simple_nfc.avgTime;
            comparisons.normalization_ratio = nativeTime / wasmTime;
        }
        
        // Date formatting comparison
        if (this.results.benchmarks.dateFormatting?.us_single_date && 
            this.results.benchmarks.dateFormatting?.native_us_single) {
            
            const wasmTime = this.results.benchmarks.dateFormatting.us_single_date.avgTime;
            const nativeTime = this.results.benchmarks.dateFormatting.native_us_single.avgTime;
            comparisons.dateFormatting_ratio = nativeTime / wasmTime;
        }
        
        // Number formatting comparison
        if (this.results.benchmarks.numberFormatting?.decimal_simple && 
            this.results.benchmarks.numberFormatting?.native_decimal) {
            
            const wasmTime = this.results.benchmarks.numberFormatting.decimal_simple.avgTime;
            const nativeTime = this.results.benchmarks.numberFormatting.native_decimal.avgTime;
            comparisons.numberFormatting_ratio = nativeTime / wasmTime;
        }
        
        // Collation comparison
        if (this.results.benchmarks.collation?.english_sort && 
            this.results.benchmarks.collation?.native_locale_sort) {
            
            const wasmTime = this.results.benchmarks.collation.english_sort.avgTime;
            const nativeTime = this.results.benchmarks.collation.native_locale_sort.avgTime;
            comparisons.collation_ratio = nativeTime / wasmTime;
        }
        
        return comparisons;
    }
    
    // Generate performance summary
    generateSummary() {
        const summary = {
            totalBenchmarks: 0,
            averagePerformance: {},
            memoryUsage: {},
            comparisons: this.generateComparisons()
        };
        
        // Count total benchmarks and calculate averages
        for (const category in this.results.benchmarks) {
            const categoryResults = this.results.benchmarks[category];
            summary.totalBenchmarks += Object.keys(categoryResults).length;
            
            const avgTimes = Object.values(categoryResults)
                .filter(result => result.avgTime)
                .map(result => result.avgTime);
            
            if (avgTimes.length > 0) {
                summary.averagePerformance[category] = {
                    avgTime: avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length,
                    minTime: Math.min(...avgTimes),
                    maxTime: Math.max(...avgTimes)
                };
            }
        }
        
        // Memory usage summary
        if (this.results.benchmarks.memoryUsage) {
            const memResults = this.results.benchmarks.memoryUsage;
            summary.memoryUsage = {
                avgHeapDelta: Object.values(memResults)
                    .map(r => r.heapUsedDelta)
                    .reduce((a, b) => a + b, 0) / Object.values(memResults).length,
                totalRSS: Math.max(...Object.values(memResults).map(r => r.rss))
            };
        }
        
        return summary;
    }
    
    // Run all benchmarks
    async runAllBenchmarks() {
        console.log('🚀 ICU.wasm Performance Benchmark Suite');
        console.log('=========================================');
        
        console.log(`Environment: ${this.results.environment.platform} ${this.results.environment.arch}`);
        console.log(`Node.js: ${this.results.environment.nodeVersion}`);
        console.log(`Memory: ${this.results.environment.memory}`);
        console.log('');
        
        const startTime = performance.now();
        
        // Load WASM module
        const loaded = await this.loadWASM();
        if (!loaded) {
            console.log('❌ Cannot run benchmarks - WASM loading failed');
            return false;
        }
        
        try {
            // Run all benchmark suites
            this.results.benchmarks.normalization = await this.benchmarkNormalization();
            this.results.benchmarks.collation = await this.benchmarkCollation();
            this.results.benchmarks.dateFormatting = await this.benchmarkDateFormatting();
            this.results.benchmarks.numberFormatting = await this.benchmarkNumberFormatting();
            this.results.benchmarks.memoryUsage = await this.benchmarkMemoryUsage();
            
            // Generate summary
            this.results.summary = this.generateSummary();
            
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            
            // Print results summary
            console.log('\n📊 Benchmark Results Summary');
            console.log('=============================');
            console.log(`Total benchmarks run: ${this.results.summary.totalBenchmarks}`);
            console.log(`Total benchmark time: ${totalTime.toFixed(2)}ms`);
            console.log('');
            
            // Performance comparisons with native APIs
            if (Object.keys(this.results.summary.comparisons).length > 0) {
                console.log('⚡ Performance vs Native JavaScript APIs:');
                for (const [comparison, ratio] of Object.entries(this.results.summary.comparisons)) {
                    const performance = ratio > 1 ? `${ratio.toFixed(2)}x faster` : `${(1/ratio).toFixed(2)}x slower`;
                    console.log(`   ${comparison}: ${performance}`);
                }
                console.log('');
            }
            
            // Category averages
            console.log('📈 Category Performance Averages:');
            for (const [category, perf] of Object.entries(this.results.summary.averagePerformance)) {
                console.log(`   ${category}: ${perf.avgTime.toFixed(2)}ms avg (${perf.minTime.toFixed(2)}-${perf.maxTime.toFixed(2)}ms range)`);
            }
            console.log('');
            
            // Memory usage
            if (this.results.summary.memoryUsage.avgHeapDelta !== undefined) {
                console.log('💾 Memory Usage:');
                console.log(`   Average heap delta: ${(this.results.summary.memoryUsage.avgHeapDelta / 1024 / 1024).toFixed(2)}MB`);
                console.log(`   Peak RSS: ${(this.results.summary.memoryUsage.totalRSS / 1024 / 1024).toFixed(2)}MB`);
                console.log('');
            }
            
            // Save detailed results
            const resultsFile = join(__dirname, '..', 'benchmark-results.json');
            writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
            console.log(`📁 Detailed results saved to: ${resultsFile}`);
            
            console.log('\n✅ ICU.wasm performance benchmarks completed successfully');
            
        } catch (error) {
            console.error('❌ Benchmark failed:', error);
            return false;
        } finally {
            // Cleanup
            if (this.icu) {
                this.icu.cleanup();
            }
        }
        
        return true;
    }
}

// Run benchmarks if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const benchmark = new ICUWASMBenchmark();
    const success = await benchmark.runAllBenchmarks();
    process.exit(success ? 0 : 1);
}

export default ICUWASMBenchmark;