#!/usr/bin/env node

/**
 * Development server with COOP/COEP headers for SharedArrayBuffer support
 * Required for ICU.wasm threading functionality testing
 * 
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under the Unicode/ICU License
 */

import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// MIME type mapping
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.wasm': 'application/wasm',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function getMimeType(filePath) {
    const ext = extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

function createTestPage() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ICU.wasm Threading Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 2rem; }
        .status { padding: 1rem; margin: 1rem 0; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        pre { background: #f8f9fa; padding: 1rem; border-radius: 4px; overflow-x: auto; }
        button { padding: 0.5rem 1rem; margin: 0.5rem; cursor: pointer; }
    </style>
</head>
<body>
    <h1>ICU.wasm Threading Test Environment</h1>
    
    <div id="support-status"></div>
    
    <h2>Threading Support Check</h2>
    <button onclick="checkThreadingSupport()">Check Threading Support</button>
    <div id="threading-results"></div>
    
    <h2>ICU.wasm Tests</h2>
    <button onclick="loadICUWasm()">Load ICU.wasm</button>
    <button onclick="loadICUThreaded()" disabled>Load ICU.wasm Threaded</button>
    <button onclick="runThreadingTests()" disabled>Run Threading Tests</button>
    <div id="test-results"></div>
    
    <script>
        // Check basic threading support
        function checkThreadingSupport() {
            const results = document.getElementById('threading-results');
            let html = '<h3>Threading Support Analysis:</h3>';
            
            // SharedArrayBuffer support
            if (typeof SharedArrayBuffer !== 'undefined') {
                html += '<div class="status success">✅ SharedArrayBuffer: Supported</div>';
            } else {
                html += '<div class="status error">❌ SharedArrayBuffer: Not supported</div>';
            }
            
            // Atomics support
            if (typeof Atomics !== 'undefined') {
                html += '<div class="status success">✅ Atomics: Supported</div>';
            } else {
                html += '<div class="status error">❌ Atomics: Not supported</div>';
            }
            
            // Secure context
            if (window.isSecureContext) {
                html += '<div class="status success">✅ Secure Context: Yes (HTTPS or localhost)</div>';
            } else {
                html += '<div class="status warning">⚠️ Secure Context: No (may limit SharedArrayBuffer)</div>';
            }
            
            // Cross-origin isolation status
            if (crossOriginIsolated) {
                html += '<div class="status success">✅ Cross-Origin Isolated: Yes</div>';
                document.querySelector('button[onclick="loadICUThreaded()"]').disabled = false;
            } else {
                html += '<div class="status warning">⚠️ Cross-Origin Isolated: No</div>';
                html += '<div class="status warning">Threading may not work without COOP/COEP headers</div>';
            }
            
            // Web Workers
            if (typeof Worker !== 'undefined') {
                html += '<div class="status success">✅ Web Workers: Supported</div>';
            } else {
                html += '<div class="status error">❌ Web Workers: Not supported</div>';
            }
            
            results.innerHTML = html;
        }
        
        let icu = null;
        let icuThreaded = null;
        
        async function loadICUWasm() {
            const results = document.getElementById('test-results');
            try {
                results.innerHTML = '<p>Loading ICU.wasm...</p>';
                
                const ICUModule = await import('./dist/icu.js');
                const wasmModule = await ICUModule.default();
                
                const { default: ICUWASM } = await import('./dist/icu-wasm.js');
                icu = new ICUWASM(wasmModule);
                
                const initialized = await icu.initialize();
                if (initialized) {
                    results.innerHTML = '<div class="status success">✅ ICU.wasm loaded successfully<br>Version: ' + icu.getVersion() + '</div>';
                } else {
                    throw new Error('ICU initialization failed');
                }
            } catch (error) {
                results.innerHTML = '<div class="status error">❌ Failed to load ICU.wasm: ' + error.message + '</div>';
            }
        }
        
        async function loadICUThreaded() {
            const results = document.getElementById('test-results');
            try {
                results.innerHTML = '<p>Loading ICU.wasm Threaded...</p>';
                
                const ICUModuleThreaded = await import('./dist-threaded/icu-threaded.js');
                const wasmModule = await ICUModuleThreaded.default();
                
                const { default: ICUWASMThreaded } = await import('./dist-threaded/icu-wasm-threaded.js');
                icuThreaded = new ICUWASMThreaded(wasmModule);
                
                const initialized = await icuThreaded.initialize();
                if (initialized) {
                    const stats = icuThreaded.getStats();
                    results.innerHTML = '<div class="status success">✅ ICU.wasm Threaded loaded successfully<br>' +
                        'Version: ' + icuThreaded.getVersion() + '<br>' +
                        'Threading: ' + (stats.threadingEnabled ? '✅ Enabled' : '❌ Disabled') + '<br>' +
                        'Worker threads: ' + stats.workerThreads + '</div>';
                    
                    document.querySelector('button[onclick="runThreadingTests()"]').disabled = false;
                } else {
                    throw new Error('ICU Threaded initialization failed');
                }
            } catch (error) {
                results.innerHTML = '<div class="status error">❌ Failed to load ICU.wasm Threaded: ' + error.message + '</div>';
            }
        }
        
        async function runThreadingTests() {
            const results = document.getElementById('test-results');
            if (!icuThreaded) {
                results.innerHTML = '<div class="status error">❌ ICU.wasm Threaded not loaded</div>';
                return;
            }
            
            results.innerHTML = '<p>Running threading performance tests...</p>';
            
            try {
                // Test parallel normalization
                const texts = Array.from({length: 1000}, (_, i) => \`Sample text \${i} with Unicode: café résumé naïve\`);
                
                console.time('Sequential normalization');
                const sequentialResults = texts.map(text => icuThreaded.normalize(text, 'NFC'));
                console.timeEnd('Sequential normalization');
                
                console.time('Parallel normalization');
                const parallelResults = await icuThreaded.normalizeParallel(texts, 'NFC');
                console.timeEnd('Parallel normalization');
                
                const resultsMatch = sequentialResults.length === parallelResults.length &&
                                   sequentialResults.every((result, index) => result === parallelResults[index]);
                
                let html = '<div class="status ' + (resultsMatch ? 'success' : 'error') + '">';
                html += resultsMatch ? '✅ Parallel normalization test PASSED' : '❌ Parallel normalization test FAILED';
                html += '</div>';
                
                // Test bulk collation
                const collator = icuThreaded.createCollator('en');
                const stringPairs = Array.from({length: 2000}, (_, i) => [\`string_\${i}_a\`, \`string_\${i}_b\`]);
                
                console.time('Sequential collation');
                const sequentialComparisons = stringPairs.map(([str1, str2]) => collator.compare(str1, str2));
                console.timeEnd('Sequential collation');
                
                console.time('Bulk collation');
                const bulkComparisons = await collator.compareBulk(stringPairs);
                console.timeEnd('Bulk collation');
                
                const comparisonsMatch = sequentialComparisons.length === bulkComparisons.length &&
                                       sequentialComparisons.every((result, index) => result === bulkComparisons[index]);
                
                html += '<div class="status ' + (comparisonsMatch ? 'success' : 'error') + '">';
                html += comparisonsMatch ? '✅ Bulk collation test PASSED' : '❌ Bulk collation test FAILED';
                html += '</div>';
                
                collator.close();
                
                // Display stats
                const stats = icuThreaded.getStats();
                html += '<div class="status success">';
                html += '<strong>Performance Statistics:</strong><br>';
                html += \`Threading enabled: \${stats.threadingEnabled}<br>\`;
                html += \`Worker threads: \${stats.workerThreads}<br>\`;
                html += \`Parallel operations: \${stats.parallelOperations}<br>\`;
                html += \`Operations completed: \${stats.operationsCompleted}\`;
                html += '</div>';
                
                results.innerHTML = html;
                
            } catch (error) {
                results.innerHTML = '<div class="status error">❌ Threading tests failed: ' + error.message + '</div>';
                console.error('Threading test error:', error);
            }
        }
        
        // Initialize support status on page load
        window.addEventListener('load', () => {
            checkThreadingSupport();
        });
    </script>
</body>
</html>
`;
}

const server = createServer((req, res) => {
    const url = req.url === '/' ? '/index.html' : req.url;
    
    // Set COOP/COEP headers for SharedArrayBuffer support
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    
    // Additional security headers
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'no-cache');
    
    // Handle test page
    if (url === '/index.html' || url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(createTestPage());
        return;
    }
    
    // Serve files from project root
    const rootDir = join(__dirname, '..');
    let filePath = join(rootDir, url.replace(/^\//, ''));
    
    // Security check - prevent directory traversal
    if (!filePath.startsWith(rootDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }
    
    // Check if file exists
    if (!existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
    }
    
    // Check if it's a directory
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
        // Try index.html in directory
        const indexPath = join(filePath, 'index.html');
        if (existsSync(indexPath)) {
            filePath = indexPath;
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Directory listing not allowed');
            return;
        }
    }
    
    try {
        const content = readFileSync(filePath);
        const mimeType = getMimeType(filePath);
        
        // Additional headers for WASM files
        if (mimeType === 'application/wasm') {
            res.setHeader('Content-Encoding', 'identity');
        }
        
        res.writeHead(200, { 
            'Content-Type': mimeType,
            'Content-Length': content.length
        });
        res.end(content);
    } catch (error) {
        console.error('Error serving file:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
});

server.listen(PORT, HOST, () => {
    console.log(`🌐 ICU.wasm Threading Development Server`);
    console.log(`📍 Server: http://${HOST}:${PORT}`);
    console.log(`🔒 COOP/COEP: Enabled (SharedArrayBuffer support)`);
    console.log(`🧵 Threading: Ready for testing`);
    console.log('');
    console.log('📋 Test URLs:');
    console.log(`   • Main test page: http://${HOST}:${PORT}/`);
    console.log(`   • ICU.wasm build: http://${HOST}:${PORT}/dist/`);
    console.log(`   • ICU.wasm threaded: http://${HOST}:${PORT}/dist-threaded/`);
    console.log('');
    console.log('🧪 To test threading:');
    console.log('   1. Build threaded version: npm run build:threaded');
    console.log('   2. Open browser to test page');
    console.log('   3. Check threading support');
    console.log('   4. Load and test ICU.wasm Threaded');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});