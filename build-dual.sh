#!/bin/bash
# build-dual.sh - Dual build system for icu.wasm
#
# Copyright (c) 2016 and later: Unicode, Inc.
# Copyright (c) 2025 Superstruct Ltd, New Zealand
# Licensed under Unicode-3.0

set -euo pipefail

VARIANT="${1:-all}"
BUILD_DIR="${BUILD_DIR:-./build-dual}"
INSTALL_PREFIX="${INSTALL_PREFIX:-./install}"
SOURCE_DIR="./icu4c/source"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Build native ICU tools for cross-compilation
build_native_tools() {
    log_info "Building native ICU tools for cross-compilation..."

    if [ -d "${BUILD_DIR}-native" ]; then
        log_info "Native tools already built, skipping..."
        return 0
    fi

    mkdir -p "${BUILD_DIR}-native"
    cd "${BUILD_DIR}-native"

    # Configure for native build
    "../$SOURCE_DIR/configure" \
        --prefix="$(pwd)/install-native" \
        --enable-static \
        --disable-shared \
        --disable-tests \
        --disable-samples \
        --disable-layoutex \
        --with-data-packaging=static

    # Build native ICU (tools only)
    make -j$(nproc 2>/dev/null || echo 4)
    make install

    cd - > /dev/null
    log_success "Native ICU tools built successfully"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking build prerequisites..."

    if ! command -v emcc &> /dev/null; then
        log_error "Emscripten not found. Please install and activate EMSDK."
        exit 1
    fi

    if ! command -v python3 &> /dev/null; then
        log_error "Python3 not found. Required for ICU build system."
        exit 1
    fi

    if [ ! -d "$SOURCE_DIR" ]; then
        log_error "ICU source directory not found: $SOURCE_DIR"
        log_error "Please ensure ICU4C source is available"
        exit 1
    fi

    local icu_version
    icu_version=$(grep -o 'U_ICU_VERSION_MAJOR_NUM=[0-9]\+' "$SOURCE_DIR/common/unicode/uvernum.h" 2>/dev/null | cut -d= -f2 || echo "unknown")
    log_success "ICU version: $icu_version.x"
    log_success "Prerequisites check completed"
}

# ICU configuration for WASM builds
get_icu_config() {
    echo \
        --enable-static \
        --disable-shared \
        --disable-tests \
        --disable-samples \
        --disable-tools \
        --disable-extras \
        --disable-dyload \
        --disable-plugins \
        --disable-layoutex \
        --with-library-suffix=_wasm \
        --with-data-packaging=static
}

# Build SIDE_MODULE (production)
build_side_module() {
    log_info "Building icu-side.wasm for production..."
    mkdir -p "${BUILD_DIR}-side"
    cd "${BUILD_DIR}-side"

    # Environment setup for SIDE_MODULE
    export CC="emcc"
    export CXX="em++"
    export AR="emar"
    export RANLIB="emranlib"
    export STRIP="emstrip"

    # SIDE_MODULE specific flags with SIMD
    export CFLAGS="-O3 -flto -fPIC -msimd128 -DNDEBUG -DU_STATIC_IMPLEMENTATION=1 -DU_DISABLE_RENAMING=1"
    export CXXFLAGS="$CFLAGS -fno-exceptions -fno-rtti"
    export LDFLAGS="-O3 -flto -msimd128 -sSIDE_MODULE=2"

    # Fix cross-compilation environment
    export ac_cv_c_compiler_gnu=yes
    export ac_cv_c_bigendian=no
    export ac_cv_sizeof_void_p=4
    export ac_cv_sizeof_wchar_t=4

    # Configure ICU for SIDE_MODULE with proper cross-compilation settings
    emconfigure "../$SOURCE_DIR/configure" \
        --host=wasm32-unknown-emscripten \
        --build=x86_64-pc-linux-gnu \
        --prefix="$(pwd)/install-side" \
        --with-cross-build="../${BUILD_DIR}-native" \
        --enable-static \
        --disable-shared \
        --disable-tests \
        --disable-samples \
        --disable-tools \
        --disable-extras \
        --disable-dyload \
        --disable-plugins \
        --disable-layoutex \
        --with-data-packaging=static \
        --with-library-suffix=_wasm

    # Build with parallel processing
    local cpu_count=$(nproc 2>/dev/null || echo 4)
    emmake make -j"$cpu_count"
    emmake make install

    # Create SIDE_MODULE WASM with SIMD optimizations
    local install_dir="$(pwd)/install-side"
    emcc -O3 -flto -msimd128 -sSIDE_MODULE=2 -sSTANDALONE_WASM=1 \
        -sEXPORTED_FUNCTIONS='["_u_init","_u_cleanup","_u_getVersion","_ucol_open","_ucol_close","_ucol_compare","_udat_open","_udat_close","_udat_format","_unum_open","_unum_close","_unum_formatDouble","_unorm2_getInstance","_unorm2_normalize","_ustring_compare","_icu_simd_available","_icu_is_ascii_simd","_icu_validate_utf8_simd","_icu_string_compare_simd","_icu_to_upper_ascii_simd","_icu_to_lower_ascii_simd","_icu_find_char_simd","_icu_count_combining_marks_simd","_icu_benchmark_string_ops_simd","_icu_benchmark_comparison","_detect_intl_capabilities","_log_intl_capabilities","_can_delegate_number_format","_can_delegate_date_format","_can_delegate_collation","_format_number_hybrid","_format_date_hybrid","_compare_strings_hybrid","_get_plural_rule_hybrid","_format_list_hybrid"]' \
        "$install_dir/lib/libicui18n_wasm.a" \
        "$install_dir/lib/libicuuc_wasm.a" \
        "$install_dir/lib/libicudata_wasm.a" \
        "../wasm/icu_simd.c" \
        "../wasm/web_native_intl_capabilities.c" \
        "../wasm/web_native_intl_delegation.c" \
        "../wasm/web_native_intl_hybrid.c" \
        -o "${INSTALL_PREFIX}/wasm/icu-side.wasm"

    log_success "SIDE_MODULE: ${INSTALL_PREFIX}/wasm/icu-side.wasm"
    cd - > /dev/null
}

# Build MAIN_MODULE (testing/NPM)
build_main_module() {
    log_info "Building icu-main.js for testing..."
    mkdir -p "${BUILD_DIR}-main"
    cd "${BUILD_DIR}-main"

    # Environment setup for MAIN_MODULE
    export CC="emcc"
    export CXX="em++"
    export AR="emar"
    export RANLIB="emranlib"
    export STRIP="emstrip"

    # MAIN_MODULE specific flags with SIMD
    export CFLAGS="-O3 -flto -msimd128 -DNDEBUG -DU_STATIC_IMPLEMENTATION=1 -DU_DISABLE_RENAMING=1"
    export CXXFLAGS="$CFLAGS -fno-exceptions -fno-rtti"
    export LDFLAGS="-O3 -flto -msimd128 -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=ICUModule -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=67108864 -sMAXIMUM_MEMORY=536870912"

    # Fix cross-compilation environment
    export ac_cv_c_compiler_gnu=yes
    export ac_cv_c_bigendian=no
    export ac_cv_sizeof_void_p=4
    export ac_cv_sizeof_wchar_t=4

    # Configure ICU for MAIN_MODULE with proper cross-compilation settings
    emconfigure "../$SOURCE_DIR/configure" \
        --host=wasm32-unknown-emscripten \
        --build=x86_64-pc-linux-gnu \
        --prefix="$(pwd)/install-main" \
        --with-cross-build="../${BUILD_DIR}-native" \
        --enable-static \
        --disable-shared \
        --disable-tests \
        --disable-samples \
        --disable-tools \
        --disable-extras \
        --disable-dyload \
        --disable-plugins \
        --disable-layoutex \
        --with-data-packaging=static \
        --with-library-suffix=_wasm

    # Build with parallel processing
    local cpu_count=$(nproc 2>/dev/null || echo 4)
    emmake make -j"$cpu_count"
    emmake make install

    # Create MAIN_MODULE WASM with SIMD optimizations
    local install_dir="$(pwd)/install-main"
    emcc -O3 -flto -msimd128 \
        -sMODULARIZE=1 \
        -sEXPORT_ES6=1 \
        -sEXPORT_NAME="ICUModule" \
        -sEXPORTED_FUNCTIONS='["_malloc","_free","_u_init","_u_cleanup","_u_getVersion","_ucol_open","_ucol_close","_ucol_compare","_udat_open","_udat_close","_udat_format","_unum_open","_unum_close","_unum_formatDouble","_unorm2_getInstance","_unorm2_normalize","_ustring_compare","_icu_simd_available","_icu_is_ascii_simd","_icu_validate_utf8_simd","_icu_string_compare_simd","_icu_to_upper_ascii_simd","_icu_to_lower_ascii_simd","_icu_find_char_simd","_icu_count_combining_marks_simd","_icu_benchmark_string_ops_simd","_icu_benchmark_comparison"]' \
        -sEXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","stringToUTF8","stringToUTF8OnStack","lengthBytesUTF8","HEAPU8","HEAP8","HEAP16","HEAP32","HEAPU16","HEAPU32"]' \
        -sALLOW_MEMORY_GROWTH=1 \
        -sINITIAL_MEMORY=67108864 \
        -sMAXIMUM_MEMORY=536870912 \
        "$install_dir/lib/libicui18n_wasm.a" \
        "$install_dir/lib/libicuuc_wasm.a" \
        "$install_dir/lib/libicudata_wasm.a" \
        "../wasm/icu_simd.c" \
        "../wasm/web_native_intl_capabilities.c" \
        "../wasm/web_native_intl_delegation.c" \
        "../wasm/web_native_intl_hybrid.c" \
        -o "${INSTALL_PREFIX}/wasm/icu-main.js"

    log_success "MAIN_MODULE: ${INSTALL_PREFIX}/wasm/icu-main.js"
    cd - > /dev/null
}

# Clean up build directories
clean_build() {
    log_info "Cleaning build directories..."
    rm -rf "${BUILD_DIR}-side" "${BUILD_DIR}-main"
    mkdir -p "${INSTALL_PREFIX}/wasm"
}

# Main build logic
case "$VARIANT" in
    side)
        check_prerequisites
        build_native_tools
        clean_build
        build_side_module
        ;;
    main)
        check_prerequisites
        build_native_tools
        clean_build
        build_main_module
        ;;
    all)
        check_prerequisites
        build_native_tools
        clean_build
        build_side_module
        build_main_module
        ;;
    clean)
        log_info "Cleaning all build artifacts..."
        rm -rf "${BUILD_DIR}-side" "${BUILD_DIR}-main" "${BUILD_DIR}-native" "${INSTALL_PREFIX}"
        ;;
    *)
        echo "Usage: $0 [side|main|all|clean]"
        exit 1
        ;;
esac

log_success "Build variant '$VARIANT' completed successfully!"