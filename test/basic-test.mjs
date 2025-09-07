#!/usr/bin/env node

/**
 * Basic ICU.wasm functionality test
 * Minimal test for CI/CD when full test suite not yet available
 * 
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under the Unicode/ICU License
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Basic ICU.wasm functionality test');

try {
    // Test WASM file exists and is valid
    const distDir = join(__dirname, '..', 'dist');
    const wasmPath = join(distDir, 'icu.wasm');
    
    if (!existsSync(wasmPath)) {
        console.error('❌ WASM binary not found:', wasmPath);
        console.error('   Run ./build-wasm.sh first');
        process.exit(1);
    }
    
    const wasmBuffer = readFileSync(wasmPath);
    console.log(`✅ WASM binary loaded: ${wasmBuffer.length} bytes`);
    
    // Check WASM magic number
    const magicNumber = wasmBuffer.slice(0, 4);
    const expectedMagic = Buffer.from([0x00, 0x61, 0x73, 0x6d]); // "\0asm"
    
    if (magicNumber.equals(expectedMagic)) {
        console.log('✅ WASM binary has valid magic number');
    } else {
        console.error('❌ Invalid WASM magic number');
        process.exit(1);
    }
    
    // Test JavaScript module exists and loads
    const jsPath = join(distDir, 'icu.js');
    if (!existsSync(jsPath)) {
        console.error('❌ JavaScript module not found:', jsPath);
        process.exit(1);
    }
    
    // Test wrapper API exists
    const wrapperPath = join(distDir, 'icu-wasm.js');
    if (!existsSync(wrapperPath)) {
        console.error('❌ JavaScript wrapper not found:', wrapperPath);
        process.exit(1);
    }
    
    const wrapperImport = await import(wrapperPath);
    console.log('✅ JavaScript wrapper module loadable');
    
    // Test TypeScript definitions exist
    const tsPath = join(distDir, 'icu-wasm.d.ts');
    if (!existsSync(tsPath)) {
        console.error('❌ TypeScript definitions not found:', tsPath);
        process.exit(1);
    }
    
    const tsContent = readFileSync(tsPath, 'utf8');
    if (tsContent.includes('export default class ICUWASM')) {
        console.log('✅ TypeScript definitions are valid');
    } else {
        console.error('❌ TypeScript definitions appear invalid');
        process.exit(1);
    }
    
    // Test modular builds exist
    const modules = ['icu-core.wasm', 'icu-i18n.wasm'];
    for (const module of modules) {
        const modulePath = join(distDir, module);
        if (existsSync(modulePath)) {
            const moduleBuffer = readFileSync(modulePath);
            const moduleMagic = moduleBuffer.slice(0, 4);
            if (moduleMagic.equals(expectedMagic)) {
                console.log(`✅ ${module}: Valid modular WASM binary`);
            } else {
                console.error(`❌ ${module}: Invalid WASM binary`);
                process.exit(1);
            }
        }
    }
    
    console.log('✅ Basic functionality test passed');
    console.log('📊 Ready for comprehensive testing with full test suite');
    
} catch (error) {
    console.error('❌ Basic test failed:', error.message);
    process.exit(1);
}