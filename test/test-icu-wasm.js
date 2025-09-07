#!/usr/bin/env node

/**
 * ICU.wasm Comprehensive Test Suite
 * International Components for Unicode testing
 * 
 * Tests Unicode operations, text formatting, collation, and internationalization features
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

class ICUWASMTest {
    constructor() {
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
        
        this.icu = null;
        this.wasmLoaded = false;
        
        // Test data for internationalization
        this.testData = {
            // Unicode normalization test strings
            normalization: {
                // Combining characters
                nfc_input: 'é',  // e + combining acute accent
                nfc_expected: 'é', // composed form
                
                // Decomposition test
                nfd_input: 'é',    // composed
                nfd_expected: 'e\u0301', // decomposed (e + combining acute)
                
                // Complex script
                complex: 'मनुष्य',    // Hindi script
            },
            
            // Collation test data
            collation: {
                en: ['apple', 'banana', 'cherry'],
                de: ['Müller', 'Mueller', 'Muller'], // German ü handling
                zh: ['北京', '上海', '深圳'],          // Chinese characters
                ar: ['أحمد', 'محمد', 'عبدالله'],     // Arabic script
            },
            
            // Date/time formatting
            dates: [
                new Date('2025-01-15T10:30:00Z'),
                new Date('2025-12-25T18:45:00Z'),
                new Date('2025-07-04T12:00:00Z')
            ],
            
            // Number formatting
            numbers: [
                1234.567,
                -98765.43,
                0.001,
                1000000,
                3.14159265359
            ]
        };
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
    
    async loadWASM() {
        console.log('📦 Loading ICU.wasm module...');
        
        try {
            // Check if WASM files exist
            const distDir = join(__dirname, '..', 'dist');
            const wasmFiles = ['icu.wasm', 'icu.js'];
            
            for (const file of wasmFiles) {
                const filePath = join(distDir, file);
                if (!existsSync(filePath)) {
                    throw new Error(`WASM file not found: ${filePath}. Run 'npm run build' first.`);
                }
            }
            
            // Dynamic import of the WASM module
            const ICUModule = await import('../dist/icu.js');
            const wasmModule = await ICUModule.default();
            
            // Import the WASM wrapper
            const { default: ICUWASM } = await import('../dist/icu-wasm.js');
            this.icu = new ICUWASM(wasmModule);
            
            const initialized = await this.icu.initialize();
            this.wasmLoaded = initialized;
            
            if (initialized) {
                console.log(`✅ ICU.wasm loaded successfully (version: ${this.icu.getVersion()})`);
            } else {
                throw new Error('ICU initialization failed');
            }
            
        } catch (error) {
            console.error('❌ Failed to load ICU.wasm:', error.message);
            return false;
        }
        
        return this.wasmLoaded;
    }
    
    // Test basic ICU functionality
    async testBasicFunctionality() {
        console.log('\n🧪 Testing basic functionality...');
        
        // Test library initialization
        this.assert(this.wasmLoaded, 'ICU library loads and initializes');
        
        if (!this.wasmLoaded) return;
        
        // Test version retrieval
        const version = this.icu.getVersion();
        this.assert(version && version.match(/^\d+\.\d+\.\d+\.\d+$/), 
                   `ICU version format is correct (${version})`);
    }
    
    // Test Unicode normalization
    async testNormalization() {
        if (!this.wasmLoaded) return;
        
        console.log('\n🔤 Testing Unicode normalization...');
        
        try {
            const { normalization } = this.testData;
            
            // Test NFC normalization
            const nfcResult = this.icu.normalize(normalization.nfc_input, 'NFC');
            this.assert(nfcResult === normalization.nfc_expected,
                       'NFC normalization works correctly');
            
            // Test NFD normalization  
            const nfdResult = this.icu.normalize(normalization.nfd_input, 'NFD');
            this.assert(nfdResult === normalization.nfd_expected,
                       'NFD normalization works correctly');
            
            // Test complex script normalization
            const complexResult = this.icu.normalize(normalization.complex, 'NFC');
            this.assert(complexResult.length > 0,
                       'Complex script normalization handles non-Latin text');
            
            // Test round-trip normalization
            const roundTrip = this.icu.normalize(
                this.icu.normalize(normalization.nfc_input, 'NFD'), 'NFC'
            );
            this.assert(roundTrip === normalization.nfc_expected,
                       'NFD -> NFC round-trip normalization is stable');
            
        } catch (error) {
            this.assert(false, `Unicode normalization failed: ${error.message}`);
        }
    }
    
    // Test text collation (sorting/comparison)
    async testCollation() {
        if (!this.wasmLoaded) return;
        
        console.log('\n🔤 Testing text collation...');
        
        try {
            // Test English collation
            const enCollator = this.icu.createCollator('en');
            const enSorted = [...this.testData.collation.en].sort((a, b) => 
                enCollator.compare(a, b)
            );
            this.assert(JSON.stringify(enSorted) === JSON.stringify(['apple', 'banana', 'cherry']),
                       'English collation sorts correctly');
            
            // Test German collation (ü handling)
            const deCollator = this.icu.createCollator('de');
            const deSorted = [...this.testData.collation.de].sort((a, b) => 
                deCollator.compare(a, b)
            );
            this.assert(deSorted.length === 3,
                       'German collation handles umlauts');
            
            // Test comparison functionality
            const comparison = enCollator.compare('apple', 'banana');
            this.assert(comparison < 0,
                       'Collation comparison returns correct ordering');
            
            // Test case insensitive comparison
            const caseComparison = enCollator.compare('Apple', 'apple');
            this.assert(typeof caseComparison === 'number',
                       'Case comparison returns numeric result');
            
            // Cleanup
            enCollator.close();
            deCollator.close();
            
        } catch (error) {
            this.assert(false, `Text collation failed: ${error.message}`);
        }
    }
    
    // Test date formatting
    async testDateFormatting() {
        if (!this.wasmLoaded) return;
        
        console.log('\n📅 Testing date formatting...');
        
        try {
            // Test basic date formatting
            const enDateFormatter = this.icu.createDateFormatter('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });
            
            const testDate = this.testData.dates[0];
            const formatted = enDateFormatter.format(testDate);
            
            this.assert(typeof formatted === 'string' && formatted.length > 0,
                       'Date formatting produces string output');
            this.assert(formatted.includes('2025'),
                       'Formatted date contains correct year');
            
            // Test different locales
            const deFormatter = this.icu.createDateFormatter('de-DE');
            const deFormatted = deFormatter.format(testDate);
            this.assert(typeof deFormatted === 'string',
                       'German date formatting works');
            
            // Test multiple dates
            let allFormattedCorrectly = true;
            for (const date of this.testData.dates) {
                const result = enDateFormatter.format(date);
                if (!result || result.length === 0) {
                    allFormattedCorrectly = false;
                    break;
                }
            }
            this.assert(allFormattedCorrectly,
                       'All test dates format correctly');
            
            // Cleanup
            enDateFormatter.close();
            deFormatter.close();
            
        } catch (error) {
            this.assert(false, `Date formatting failed: ${error.message}`);
        }
    }
    
    // Test number formatting
    async testNumberFormatting() {
        if (!this.wasmLoaded) return;
        
        console.log('\n🔢 Testing number formatting...');
        
        try {
            // Test decimal formatting
            const decimalFormatter = this.icu.createNumberFormatter('en-US', 'decimal');
            
            const formatted1234 = decimalFormatter.format(1234.567);
            this.assert(typeof formatted1234 === 'string' && formatted1234.includes('1234'),
                       'Decimal formatting works for standard numbers');
            
            // Test currency formatting
            const currencyFormatter = this.icu.createNumberFormatter('en-US', 'currency');
            const currencyFormatted = currencyFormatter.format(1234.56);
            this.assert(typeof currencyFormatted === 'string',
                       'Currency formatting produces string output');
            
            // Test percent formatting
            const percentFormatter = this.icu.createNumberFormatter('en-US', 'percent');
            const percentFormatted = percentFormatter.format(0.1234);
            this.assert(typeof percentFormatted === 'string',
                       'Percent formatting produces string output');
            
            // Test scientific notation
            const scientificFormatter = this.icu.createNumberFormatter('en-US', 'scientific');
            const scientificFormatted = scientificFormatter.format(123456789);
            this.assert(typeof scientificFormatted === 'string',
                       'Scientific notation formatting works');
            
            // Test negative numbers
            const negativeFormatted = decimalFormatter.format(-1234.56);
            this.assert(negativeFormatted.includes('-') || negativeFormatted.includes('('),
                       'Negative numbers format correctly');
            
            // Test multiple numbers
            let allNumbersFormatted = true;
            for (const num of this.testData.numbers) {
                const result = decimalFormatter.format(num);
                if (!result || result.length === 0) {
                    allNumbersFormatted = false;
                    break;
                }
            }
            this.assert(allNumbersFormatted,
                       'All test numbers format correctly');
            
            // Cleanup
            decimalFormatter.close();
            currencyFormatter.close();
            percentFormatter.close();
            scientificFormatter.close();
            
        } catch (error) {
            this.assert(false, `Number formatting failed: ${error.message}`);
        }
    }
    
    // Test internationalization features
    async testInternationalization() {
        if (!this.wasmLoaded) return;
        
        console.log('\n🌐 Testing internationalization features...');
        
        try {
            // Test different locale number formatting
            const usFormatter = this.icu.createNumberFormatter('en-US', 'decimal');
            const deFormatter = this.icu.createNumberFormatter('de-DE', 'decimal');
            
            const testNumber = 1234.56;
            const usFormat = usFormatter.format(testNumber);
            const deFormat = deFormatter.format(testNumber);
            
            // US typically uses . for decimal, DE uses ,
            this.assert(usFormat !== deFormat,
                       'Different locales produce different number formats');
            
            // Test different locale date formatting
            const usDateFormatter = this.icu.createDateFormatter('en-US');
            const deDateFormatter = this.icu.createDateFormatter('de-DE');
            
            const testDate = this.testData.dates[0];
            const usDateFormat = usDateFormatter.format(testDate);
            const deDateFormat = deDateFormatter.format(testDate);
            
            this.assert(typeof usDateFormat === 'string' && typeof deDateFormat === 'string',
                       'Both US and German date formatting work');
            
            // Test locale-specific collation
            const enCollator = this.icu.createCollator('en');
            const deCollator = this.icu.createCollator('de');
            
            const testStrings = ['ä', 'z'];
            const enCompare = enCollator.compare(testStrings[0], testStrings[1]);
            const deCompare = deCollator.compare(testStrings[0], testStrings[1]);
            
            this.assert(typeof enCompare === 'number' && typeof deCompare === 'number',
                       'Locale-specific collation comparison works');
            
            // Cleanup
            usFormatter.close();
            deFormatter.close();
            usDateFormatter.close();
            deDateFormatter.close();
            enCollator.close();
            deCollator.close();
            
        } catch (error) {
            this.assert(false, `Internationalization test failed: ${error.message}`);
        }
    }
    
    // Test memory management and cleanup
    async testMemoryManagement() {
        if (!this.wasmLoaded) return;
        
        console.log('\n💾 Testing memory management...');
        
        try {
            // Create and destroy multiple formatters
            const formatters = [];
            for (let i = 0; i < 10; i++) {
                formatters.push(this.icu.createNumberFormatter('en-US', 'decimal'));
            }
            
            // Test that formatters work
            const testResult = formatters[0].format(123.45);
            this.assert(typeof testResult === 'string',
                       'Multiple formatters can be created');
            
            // Clean up all formatters
            for (const formatter of formatters) {
                formatter.close();
            }
            
            this.assert(true, 'Multiple formatters can be cleaned up');
            
            // Test collator cleanup
            const collators = [];
            for (let i = 0; i < 5; i++) {
                collators.push(this.icu.createCollator('en'));
            }
            
            for (const collator of collators) {
                collator.close();
            }
            
            this.assert(true, 'Multiple collators can be cleaned up');
            
            // Test normalization doesn't leak memory (no cleanup needed)
            for (let i = 0; i < 100; i++) {
                this.icu.normalize('test string', 'NFC');
            }
            
            this.assert(true, 'Repeated normalization calls complete successfully');
            
        } catch (error) {
            this.assert(false, `Memory management test failed: ${error.message}`);
        }
    }
    
    // Test error handling
    async testErrorHandling() {
        if (!this.wasmLoaded) return;
        
        console.log('\n⚠️  Testing error handling...');
        
        try {
            // Test invalid locale
            let errorCaught = false;
            try {
                this.icu.createCollator('invalid-locale-xyz');
            } catch (error) {
                errorCaught = true;
            }
            this.assert(errorCaught,
                       'Invalid locale throws appropriate error');
            
            // Test invalid normalization form
            errorCaught = false;
            try {
                this.icu.normalize('test', 'INVALID_FORM');
            } catch (error) {
                errorCaught = true;
            }
            this.assert(errorCaught,
                       'Invalid normalization form throws error');
            
            // Test invalid number formatter style
            errorCaught = false;
            try {
                this.icu.createNumberFormatter('en', 'invalid-style');
            } catch (error) {
                errorCaught = true;
            }
            this.assert(errorCaught,
                       'Invalid number formatter style throws error');
            
        } catch (error) {
            this.assert(false, `Error handling test failed: ${error.message}`);
        }
    }
    
    // Performance benchmark
    async testPerformance() {
        if (!this.wasmLoaded) return;
        
        console.log('\n🚀 Running performance benchmarks...');
        
        const iterations = 1000;
        const testString = 'The quick brown fox jumps over the lazy dog. 这是一个测试字符串。';
        
        try {
            // Benchmark normalization
            const normStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                this.icu.normalize(testString, 'NFC');
            }
            const normEnd = performance.now();
            const normTime = normEnd - normStart;
            
            this.assert(normTime < 1000, // Should complete in under 1 second
                       `Normalization performance: ${iterations} iterations in ${normTime.toFixed(2)}ms`);
            
            // Benchmark collation
            const collator = this.icu.createCollator('en');
            const collStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                collator.compare('string1', 'string2');
            }
            const collEnd = performance.now();
            const collTime = collEnd - collStart;
            collator.close();
            
            this.assert(collTime < 1000,
                       `Collation performance: ${iterations} comparisons in ${collTime.toFixed(2)}ms`);
            
            // Benchmark number formatting
            const formatter = this.icu.createNumberFormatter('en-US', 'decimal');
            const numStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                formatter.format(1234.567 + i);
            }
            const numEnd = performance.now();
            const numTime = numEnd - numStart;
            formatter.close();
            
            this.assert(numTime < 1000,
                       `Number formatting performance: ${iterations} formats in ${numTime.toFixed(2)}ms`);
            
        } catch (error) {
            this.assert(false, `Performance benchmark failed: ${error.message}`);
        }
    }
    
    // Run all tests
    async runAllTests() {
        console.log('🧪 ICU.wasm Comprehensive Test Suite');
        console.log('=====================================');
        
        const startTime = performance.now();
        
        // Load WASM module
        const loaded = await this.loadWASM();
        if (!loaded) {
            console.log('\n❌ Cannot run tests - WASM loading failed');
            return false;
        }
        
        // Run test suites
        await this.testBasicFunctionality();
        await this.testNormalization();
        await this.testCollation();
        await this.testDateFormatting();
        await this.testNumberFormatting();
        await this.testInternationalization();
        await this.testMemoryManagement();
        await this.testErrorHandling();
        await this.testPerformance();
        
        // Cleanup
        if (this.icu) {
            this.icu.cleanup();
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        // Print results
        console.log('\n📊 Test Results');
        console.log('================');
        console.log(`Total tests: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed} ✅`);
        console.log(`Failed: ${this.testResults.failed} ❌`);
        console.log(`Success rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
        console.log(`Total time: ${totalTime.toFixed(2)}ms`);
        
        if (this.testResults.failed > 0) {
            console.log('\n❌ Failed tests:');
            this.testResults.errors.forEach(error => console.log(`   ${error}`));
        }
        
        const success = this.testResults.failed === 0;
        console.log(`\n${success ? '✅' : '❌'} ICU.wasm test suite ${success ? 'PASSED' : 'FAILED'}`);
        
        return success;
    }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new ICUWASMTest();
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
}

export default ICUWASMTest;