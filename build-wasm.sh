#!/bin/bash

# ICU.wasm Production Build System
# System Tier 2: Core internationalization services with high-performance WASM optimizations
# Copyright 2025 Superstruct Ltd, New Zealand
# Licensed under the Unicode/ICU License

set -euo pipefail

# Build configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
DIST_DIR="$SCRIPT_DIR/dist"
SOURCE_DIR="$SCRIPT_DIR/icu4c/source"

# System Tier 2 configuration
ECOSYSTEM_TIER=2
INITIAL_MEMORY="64MB"
MAXIMUM_MEMORY="512MB"

# ICU configuration - prioritize most common internationalization needs
ICU_CONFIG=(
    # Core components (required)
    "--enable-common"          # Core Unicode utilities
    "--enable-stubdata"        # Custom data loading
    "--enable-i18n"           # Internationalization services
    
    # Essential features
    "--enable-collation"       # Text sorting and comparison
    "--enable-formatting"      # Date/time/number formatting
    "--enable-normalization"   # Unicode normalization
    "--enable-regex"          # Regular expressions
    "--enable-stringprep"     # String preparation
    "--enable-transliteration" # Text transliteration
    
    # Disable optional features for WASM
    "--disable-io"            # File I/O operations not needed
    "--disable-layoutex"      # Deprecated layout extensions
    "--disable-tools"         # Command-line tools
    "--disable-tests"         # Test programs
    "--disable-samples"       # Sample applications
    "--disable-extras"        # Extra utilities
    "--disable-dyload"        # Dynamic loading
    "--disable-plugins"       # Plugin system
    
    # WASM-specific optimizations
    "--disable-shared"        # Static linking only
    "--enable-static"         # Static libraries
    "--disable-rpath"         # No runtime paths
    "--with-library-suffix=_wasm"  # Distinguish WASM libraries
)

# Check for required tools
check_requirements() {
    echo "🔍 Checking build requirements..."
    
    local missing_tools=()
    
    if ! command -v emcc &> /dev/null; then
        missing_tools+=("emcc (Emscripten)")
    fi
    
    if ! command -v cmake &> /dev/null; then
        missing_tools+=("cmake")
    fi
    
    if ! command -v python3 &> /dev/null; then
        missing_tools+=("python3")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo "❌ Missing required tools:"
        printf '   - %s\n' "${missing_tools[@]}"
        exit 1
    fi
    
    # Check Emscripten version
    local emcc_version
    emcc_version=$(emcc --version | head -n1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "unknown")
    echo "✅ Emscripten version: $emcc_version"
    
    # Verify ICU source exists
    if [ ! -d "$SOURCE_DIR" ]; then
        echo "❌ ICU source directory not found: $SOURCE_DIR"
        echo "   Please ensure ICU4C source is available"
        exit 1
    fi
    
    local icu_version
    icu_version=$(grep -o 'U_ICU_VERSION_MAJOR_NUM=[0-9]\+' "$SOURCE_DIR/common/unicode/uvernum.h" 2>/dev/null | cut -d= -f2 || echo "unknown")
    echo "✅ ICU version: $icu_version.x"
}

# Clean previous builds
clean_build() {
    echo "🧹 Cleaning previous build..."
    rm -rf "$BUILD_DIR"
    rm -rf "$DIST_DIR"
    mkdir -p "$BUILD_DIR"
    mkdir -p "$DIST_DIR"
}

# Configure ICU for Emscripten cross-compilation
configure_icu() {
    echo "⚙️  Configuring ICU for WASM compilation..."
    
    cd "$BUILD_DIR"
    
    # Emscripten environment setup
    export CC="emcc"
    export CXX="em++"
    export AR="emar"
    export RANLIB="emranlib"
    export STRIP="emstrip"
    
    # Compiler flags for WASM optimization
    export CFLAGS=(
        "-O3"                    # Maximum optimization
        "-flto"                  # Link-time optimization
        "-fno-exceptions"        # ICU doesn't use C++ exceptions
        "-fno-rtti"             # Reduce binary size
        "-DNDEBUG"              # Release build
        "-DU_DISABLE_RENAMING=1" # Disable ICU symbol renaming
        "-DU_USING_ICU_NAMESPACE=0" # Avoid namespace issues
        "-DU_STATIC_IMPLEMENTATION=1" # Static library build
    )
    
    export CXXFLAGS="${CFLAGS[*]}"
    
    # Linker flags for WASM
    export LDFLAGS=(
        "-O3"
        "-flto"
        "-s WASM=1"
        "-s MODULARIZE=1"
        "-s EXPORT_ES6=1"
        "-s EXPORT_NAME=\"ICU\""
        "-s ALLOW_MEMORY_GROWTH=1"
        "-s INITIAL_MEMORY=$INITIAL_MEMORY"
        "-s MAXIMUM_MEMORY=$MAXIMUM_MEMORY"
        "-s MALLOC=mimalloc"     # Better allocator for ICU
        "-s EXIT_RUNTIME=0"      # Keep runtime alive
        "-s ASSERTIONS=0"        # Disable for performance
        "-s STACK_SIZE=2MB"      # Adequate for ICU operations
        # Threading support (optional, adds complexity)
        # "-pthread"
        # "-s PTHREAD_POOL_SIZE=2"
        # "-s PROXY_TO_PTHREAD=1"
    )
    
    # Configure ICU with cross-compilation settings
    "$SOURCE_DIR/runConfigureICU" Linux/gcc \
        --host=wasm32-unknown-emscripten \
        --build=x86_64-pc-linux-gnu \
        --prefix="$BUILD_DIR/install" \
        "${ICU_CONFIG[@]}" \
        CFLAGS="${CFLAGS[*]}" \
        CXXFLAGS="${CXXFLAGS[*]}" \
        LDFLAGS="${LDFLAGS[*]}"
}

# Build ICU libraries
build_icu() {
    echo "🔨 Building ICU libraries..."
    
    cd "$BUILD_DIR"
    
    # Build ICU with parallel processing
    local cpu_count
    cpu_count=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
    
    make -j"$cpu_count" || {
        echo "❌ ICU build failed"
        echo "This is a complex build process - check the error messages above"
        exit 1
    }
    
    # Install to local prefix
    make install
    
    echo "✅ ICU libraries built successfully"
}

# Create modular WASM builds
create_wasm_modules() {
    echo "📦 Creating WASM modules..."
    
    local install_dir="$BUILD_DIR/install"
    local lib_dir="$install_dir/lib"
    
    # Common Emscripten settings for all modules
    local common_flags=(
        "-O3"
        "-flto" 
        "-s WASM=1"
        "-s MODULARIZE=1"
        "-s EXPORT_ES6=1"
        "-s ALLOW_MEMORY_GROWTH=1"
        "-s INITIAL_MEMORY=$INITIAL_MEMORY"
        "-s MAXIMUM_MEMORY=$MAXIMUM_MEMORY"
        "-s MALLOC=mimalloc"
        "-s EXIT_RUNTIME=0"
        "-s ASSERTIONS=0"
        "-s STACK_SIZE=2MB"
        "--closure=1"
    )
    
    # ICU Core Module (essential Unicode operations)
    echo "  📋 Building ICU Core module..."
    emcc "${common_flags[@]}" \
        -s EXPORT_NAME="ICUCore" \
        -s EXPORTED_FUNCTIONS='["_malloc","_free","_u_getVersion","_u_init","_u_cleanup","_ustring_compare","_unorm2_getInstance","_unorm2_normalize"]' \
        -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","stringToUTF8","lengthBytesUTF8"]' \
        "$lib_dir/libicuuc.a" \
        "$lib_dir/libicudata.a" \
        -o "$DIST_DIR/icu-core.js"
    
    # ICU i18n Module (internationalization services)
    echo "  🌐 Building ICU i18n module..."
    emcc "${common_flags[@]}" \
        -s EXPORT_NAME="ICUi18n" \
        -s EXPORTED_FUNCTIONS='["_malloc","_free","_ucol_open","_ucol_close","_ucol_compare","_udat_open","_udat_close","_udat_format","_unum_open","_unum_close","_unum_formatDouble"]' \
        -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","stringToUTF8","lengthBytesUTF8"]' \
        "$lib_dir/libicui18n.a" \
        "$lib_dir/libicuuc.a" \
        "$lib_dir/libicudata.a" \
        -o "$DIST_DIR/icu-i18n.js"
    
    # Combined ICU Module (full functionality)
    echo "  🔗 Building combined ICU module..."
    emcc "${common_flags[@]}" \
        -s EXPORT_NAME="ICU" \
        -s EXPORTED_FUNCTIONS='["_malloc","_free","_u_getVersion","_u_init","_u_cleanup","_ustring_compare","_ucol_open","_ucol_close","_ucol_compare","_udat_open","_udat_close","_udat_format","_unum_open","_unum_close","_unum_formatDouble","_unorm2_getInstance","_unorm2_normalize"]' \
        -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","stringToUTF8","lengthBytesUTF8"]' \
        "$lib_dir/libicui18n.a" \
        "$lib_dir/libicuuc.a" \
        "$lib_dir/libicudata.a" \
        -o "$DIST_DIR/icu.js"
}

# Create JavaScript API wrapper
create_js_wrapper() {
    echo "📝 Creating JavaScript API wrapper..."
    
    cat > "$DIST_DIR/icu-wasm.js" << 'EOF'
/**
 * ICU.wasm - International Components for Unicode WebAssembly
 * System Tier 2: High-performance internationalization library
 * 
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under the Unicode/ICU License
 */

class ICUWASM {
    constructor(wasmModule) {
        this.Module = wasmModule;
        this.initialized = false;
        this.collators = new Map();
        this.formatters = new Map();
    }
    
    /**
     * Initialize ICU library
     */
    async initialize() {
        if (this.initialized) return true;
        
        try {
            // Initialize ICU library
            this.Module.ccall('u_init', null, [], []);
            this.initialized = true;
            console.log('✅ ICU.wasm initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ ICU initialization failed:', error);
            return false;
        }
    }
    
    /**
     * Get ICU version information
     */
    getVersion() {
        const versionBuffer = this.Module._malloc(4);
        this.Module.ccall('u_getVersion', null, ['number'], [versionBuffer]);
        
        const version = new Uint8Array(this.Module.HEAPU8.buffer, versionBuffer, 4);
        const versionString = `${version[0]}.${version[1]}.${version[2]}.${version[3]}`;
        
        this.Module._free(versionBuffer);
        return versionString;
    }
    
    /**
     * Create a collator for text comparison and sorting
     */
    createCollator(locale = 'en', options = {}) {
        const collatorId = `${locale}_${JSON.stringify(options)}`;
        
        if (this.collators.has(collatorId)) {
            return this.collators.get(collatorId);
        }
        
        const localePtr = this.Module.stringToUTF8OnStack(locale);
        const collatorPtr = this.Module.ccall('ucol_open', 'number', ['number', 'number'], [localePtr, 0]);
        
        if (collatorPtr === 0) {
            throw new Error(`Failed to create collator for locale: ${locale}`);
        }
        
        const collator = {
            ptr: collatorPtr,
            locale: locale,
            
            compare: (str1, str2) => {
                const str1Ptr = this.Module.stringToUTF8OnStack(str1);
                const str2Ptr = this.Module.stringToUTF8OnStack(str2);
                
                return this.Module.ccall('ucol_compare', 'number', 
                    ['number', 'number', 'number', 'number', 'number'],
                    [collatorPtr, str1Ptr, -1, str2Ptr, -1]
                );
            },
            
            close: () => {
                this.Module.ccall('ucol_close', null, ['number'], [collatorPtr]);
                this.collators.delete(collatorId);
            }
        };
        
        this.collators.set(collatorId, collator);
        return collator;
    }
    
    /**
     * Create a date formatter
     */
    createDateFormatter(locale = 'en', options = {}) {
        const formatterId = `${locale}_date_${JSON.stringify(options)}`;
        
        if (this.formatters.has(formatterId)) {
            return this.formatters.get(formatterId);
        }
        
        const localePtr = this.Module.stringToUTF8OnStack(locale);
        const dateStyle = options.dateStyle || 0; // UDAT_DEFAULT
        const timeStyle = options.timeStyle || 0; // UDAT_DEFAULT
        
        const formatterPtr = this.Module.ccall('udat_open', 'number',
            ['number', 'number', 'number', 'number', 'number', 'number', 'number', 'number'],
            [timeStyle, dateStyle, localePtr, 0, 0, -1, 0, 0]
        );
        
        if (formatterPtr === 0) {
            throw new Error(`Failed to create date formatter for locale: ${locale}`);
        }
        
        const formatter = {
            ptr: formatterPtr,
            locale: locale,
            
            format: (date) => {
                const timestamp = date instanceof Date ? date.getTime() : date;
                const resultBuffer = this.Module._malloc(256);
                
                const length = this.Module.ccall('udat_format', 'number',
                    ['number', 'number', 'number', 'number', 'number', 'number'],
                    [formatterPtr, timestamp, resultBuffer, 128, 0, 0]
                );
                
                if (length > 0) {
                    const result = this.Module.UTF8ToString(resultBuffer, length * 2);
                    this.Module._free(resultBuffer);
                    return result;
                } else {
                    this.Module._free(resultBuffer);
                    throw new Error('Date formatting failed');
                }
            },
            
            close: () => {
                this.Module.ccall('udat_close', null, ['number'], [formatterPtr]);
                this.formatters.delete(formatterId);
            }
        };
        
        this.formatters.set(formatterId, formatter);
        return formatter;
    }
    
    /**
     * Create a number formatter
     */
    createNumberFormatter(locale = 'en', style = 'decimal') {
        const formatterId = `${locale}_number_${style}`;
        
        if (this.formatters.has(formatterId)) {
            return this.formatters.get(formatterId);
        }
        
        const localePtr = this.Module.stringToUTF8OnStack(locale);
        const styleMap = {
            'decimal': 1,    // UNUM_DECIMAL
            'currency': 2,   // UNUM_CURRENCY
            'percent': 3,    // UNUM_PERCENT
            'scientific': 4  // UNUM_SCIENTIFIC
        };
        
        const numStyle = styleMap[style] || 1;
        
        const formatterPtr = this.Module.ccall('unum_open', 'number',
            ['number', 'number', 'number', 'number', 'number', 'number'],
            [numStyle, 0, 0, localePtr, 0, 0]
        );
        
        if (formatterPtr === 0) {
            throw new Error(`Failed to create number formatter for locale: ${locale}`);
        }
        
        const formatter = {
            ptr: formatterPtr,
            locale: locale,
            style: style,
            
            format: (number) => {
                const resultBuffer = this.Module._malloc(256);
                
                const length = this.Module.ccall('unum_formatDouble', 'number',
                    ['number', 'number', 'number', 'number', 'number', 'number'],
                    [formatterPtr, number, resultBuffer, 128, 0, 0]
                );
                
                if (length > 0) {
                    const result = this.Module.UTF8ToString(resultBuffer, length * 2);
                    this.Module._free(resultBuffer);
                    return result;
                } else {
                    this.Module._free(resultBuffer);
                    throw new Error('Number formatting failed');
                }
            },
            
            close: () => {
                this.Module.ccall('unum_close', null, ['number'], [formatterPtr]);
                this.formatters.delete(formatterId);
            }
        };
        
        this.formatters.set(formatterId, formatter);
        return formatter;
    }
    
    /**
     * Normalize Unicode text
     */
    normalize(text, form = 'NFC') {
        const formMap = {
            'NFC': 'nfc',
            'NFD': 'nfd', 
            'NFKC': 'nfkc',
            'NFKD': 'nfkd'
        };
        
        const normForm = formMap[form];
        if (!normForm) {
            throw new Error(`Unsupported normalization form: ${form}`);
        }
        
        const normalizerPtr = this.Module.ccall('unorm2_getInstance', 'number',
            ['number', 'string', 'number', 'number'],
            [0, normForm, 0, 0]
        );
        
        if (normalizerPtr === 0) {
            throw new Error(`Failed to get normalizer for form: ${form}`);
        }
        
        const srcLength = this.Module.lengthBytesUTF8(text);
        const srcBuffer = this.Module._malloc(srcLength + 1);
        this.Module.stringToUTF8(text, srcBuffer, srcLength + 1);
        
        const destBuffer = this.Module._malloc((srcLength * 2) + 1);
        
        const resultLength = this.Module.ccall('unorm2_normalize', 'number',
            ['number', 'number', 'number', 'number', 'number', 'number'],
            [normalizerPtr, srcBuffer, -1, destBuffer, srcLength * 2, 0]
        );
        
        if (resultLength >= 0) {
            const result = this.Module.UTF8ToString(destBuffer);
            this.Module._free(srcBuffer);
            this.Module._free(destBuffer);
            return result;
        } else {
            this.Module._free(srcBuffer);
            this.Module._free(destBuffer);
            throw new Error('Text normalization failed');
        }
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
        // Close all collators
        for (const collator of this.collators.values()) {
            collator.close();
        }
        
        // Close all formatters
        for (const formatter of this.formatters.values()) {
            formatter.close();
        }
        
        // Cleanup ICU library
        if (this.initialized) {
            this.Module.ccall('u_cleanup', null, [], []);
            this.initialized = false;
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ICUWASM;
} else if (typeof define === 'function' && define.amd) {
    define([], function() { return ICUWASM; });
} else {
    if (typeof window !== 'undefined') {
        window.ICUWASM = ICUWASM;
    } else if (typeof global !== 'undefined') {
        global.ICUWASM = ICUWASM;
    }
}
EOF
}

# Create TypeScript definitions
create_typescript_definitions() {
    echo "🏷️  Creating TypeScript definitions..."
    
    cat > "$DIST_DIR/icu-wasm.d.ts" << 'EOF'
/**
 * ICU.wasm TypeScript Definitions
 * System Tier 2: International Components for Unicode
 * 
 * Copyright 2025 Superstruct Ltd, New Zealand
 * Licensed under the Unicode/ICU License
 */

export interface CollatorOptions {
    strength?: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'identical';
    numeric?: boolean;
    caseLevel?: boolean;
    caseFirst?: 'upper' | 'lower' | 'off';
}

export interface Collator {
    readonly ptr: number;
    readonly locale: string;
    compare(str1: string, str2: string): number;
    close(): void;
}

export interface DateFormatterOptions {
    dateStyle?: 'full' | 'long' | 'medium' | 'short' | 'none';
    timeStyle?: 'full' | 'long' | 'medium' | 'short' | 'none';
    timeZone?: string;
}

export interface DateFormatter {
    readonly ptr: number;
    readonly locale: string;
    format(date: Date | number): string;
    close(): void;
}

export interface NumberFormatter {
    readonly ptr: number;
    readonly locale: string;
    readonly style: string;
    format(number: number): string;
    close(): void;
}

export type NormalizationForm = 'NFC' | 'NFD' | 'NFKC' | 'NFKD';

export interface WASMModule {
    ccall(ident: string, returnType: string | null, argTypes: string[], args: any[]): any;
    cwrap(ident: string, returnType: string | null, argTypes: string[]): (...args: any[]) => any;
    stringToUTF8OnStack(str: string): number;
    UTF8ToString(ptr: number, maxBytesToRead?: number): string;
    stringToUTF8(str: string, outPtr: number, maxBytesToWrite: number): number;
    lengthBytesUTF8(str: string): number;
    _malloc(size: number): number;
    _free(ptr: number): void;
    HEAPU8: Uint8Array;
}

export default class ICUWASM {
    readonly Module: WASMModule;
    readonly initialized: boolean;
    
    constructor(wasmModule: WASMModule);
    
    /**
     * Initialize ICU library
     */
    initialize(): Promise<boolean>;
    
    /**
     * Get ICU version information
     */
    getVersion(): string;
    
    /**
     * Create a collator for text comparison and sorting
     */
    createCollator(locale?: string, options?: CollatorOptions): Collator;
    
    /**
     * Create a date formatter
     */
    createDateFormatter(locale?: string, options?: DateFormatterOptions): DateFormatter;
    
    /**
     * Create a number formatter
     */
    createNumberFormatter(locale?: string, style?: 'decimal' | 'currency' | 'percent' | 'scientific'): NumberFormatter;
    
    /**
     * Normalize Unicode text
     */
    normalize(text: string, form?: NormalizationForm): string;
    
    /**
     * Clean up resources
     */
    cleanup(): void;
}

/**
 * Module loader functions
 */
export interface ICUModule {
    (): Promise<WASMModule>;
}

declare const ICUCore: ICUModule;
declare const ICUi18n: ICUModule;
declare const ICU: ICUModule;

export { ICUCore, ICUi18n, ICU };
EOF
}

# Analyze build results
analyze_build() {
    echo "📊 Analyzing build results..."
    
    if [ ! -f "$DIST_DIR/icu.wasm" ]; then
        echo "❌ Main ICU WASM module not found"
        return 1
    fi
    
    # File size analysis
    local core_size=$(stat -c%s "$DIST_DIR/icu-core.wasm" 2>/dev/null || echo "0")
    local i18n_size=$(stat -c%s "$DIST_DIR/icu-i18n.wasm" 2>/dev/null || echo "0") 
    local full_size=$(stat -c%s "$DIST_DIR/icu.wasm" 2>/dev/null || echo "0")
    
    echo "📏 Module sizes:"
    echo "   ICU Core:  $(numfmt --to=iec-i --suffix=B $core_size)"
    echo "   ICU i18n:  $(numfmt --to=iec-i --suffix=B $i18n_size)"
    echo "   ICU Full:  $(numfmt --to=iec-i --suffix=B $full_size)"
    
    # Verify WASM modules
    for module in icu-core.wasm icu-i18n.wasm icu.wasm; do
        if [ -f "$DIST_DIR/$module" ]; then
            local magic=$(xxd -l 4 -p "$DIST_DIR/$module" 2>/dev/null || echo "")
            if [ "$magic" = "0061736d" ]; then
                echo "✅ $module: Valid WASM binary"
            else
                echo "❌ $module: Invalid WASM binary (magic: $magic)"
            fi
        fi
    done
    
    # List generated files
    echo "📂 Generated files:"
    find "$DIST_DIR" -type f -exec basename {} \; | sort | sed 's/^/   /'
}

# Main build process
main() {
    echo "🚀 Starting ICU.wasm production build..."
    echo "   System Tier 2: Core internationalization services"
    echo "   Target: High-performance Unicode processing"
    echo ""
    
    check_requirements
    clean_build
    configure_icu
    build_icu
    create_wasm_modules
    create_js_wrapper
    create_typescript_definitions
    analyze_build
    
    echo ""
    echo "✅ ICU.wasm build completed successfully!"
    echo "📍 Output directory: $DIST_DIR"
    echo ""
    echo "🧪 Next steps:"
    echo "   1. Run tests: npm test"
    echo "   2. Run benchmarks: npm run benchmark"
    echo "   3. Test in browser: npm run serve"
}

# Handle script termination
cleanup_on_exit() {
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Build failed. Check the error messages above."
        echo "💡 Common issues:"
        echo "   - Missing Emscripten installation"
        echo "   - ICU4C source not available"
        echo "   - Insufficient memory for compilation"
    fi
}

trap cleanup_on_exit EXIT

# Run main if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi