#!/bin/bash
# build-simple-working.sh - Simple working build for icu.wasm
set -euo pipefail

INSTALL_PREFIX="${INSTALL_PREFIX:-./install}"

echo "Building simple working ICU WASM with proper exports..."

# Ensure output directory exists
mkdir -p "${INSTALL_PREFIX}/wasm"

# Build MAIN_MODULE with proper Emscripten exports
emcc -O3 -flto -msimd128 \
    -sMODULARIZE=1 \
    -sEXPORT_ES6=1 \
    -sEXPORT_NAME="ICUModule" \
    -sEXPORTED_FUNCTIONS='[
        "_malloc","_free",
        "_icu_init","_icu_cleanup","_icu_get_version",
        "_icu_string_compare","_icu_normalize_nfc","_icu_free_string",
        "_icu_collator_open","_icu_collator_close","_icu_collator_compare",
        "_icu_date_formatter_open","_icu_date_formatter_close","_icu_date_format",
        "_icu_number_formatter_open","_icu_number_formatter_close","_icu_number_format",
        "_icu_simd_available","_icu_is_ascii_simd","_icu_validate_utf8_simd",
        "_icu_string_compare_simd","_icu_to_upper_ascii_simd","_icu_to_lower_ascii_simd",
        "_icu_find_char_simd","_icu_count_combining_marks_simd","_icu_benchmark_comparison"
    ]' \
    -sEXPORTED_RUNTIME_METHODS='[
        "ccall","cwrap","UTF8ToString","stringToUTF8","stringToUTF8OnStack",
        "lengthBytesUTF8","HEAPU8","HEAP8","HEAP16","HEAP32","HEAPU16","HEAPU32"
    ]' \
    -sALLOW_MEMORY_GROWTH=1 \
    -sINITIAL_MEMORY=16777216 \
    -sMAXIMUM_MEMORY=268435456 \
    -sSTACK_SIZE=1048576 \
    wasm_wrapper/icu_wrapper.cpp \
    wasm/icu_simd.c \
    wasm/web_native_intl_capabilities.c \
    wasm/web_native_intl_delegation.c \
    wasm/web_native_intl_hybrid.c \
    -o "${INSTALL_PREFIX}/wasm/icu-main.js"

echo "Built: ${INSTALL_PREFIX}/wasm/icu-main.js"

# Build SIDE_MODULE for production use
emcc -O3 -flto -msimd128 \
    -sSIDE_MODULE=2 \
    -sEXPORTED_FUNCTIONS='[
        "_icu_simd_available","_icu_is_ascii_simd","_icu_validate_utf8_simd",
        "_icu_string_compare_simd","_icu_to_upper_ascii_simd","_icu_to_lower_ascii_simd",
        "_icu_find_char_simd","_icu_count_combining_marks_simd","_icu_benchmark_comparison",
        "_detect_intl_capabilities","_log_intl_capabilities","_can_delegate_number_format",
        "_can_delegate_date_format","_can_delegate_collation","_format_number_hybrid",
        "_format_date_hybrid","_compare_strings_hybrid","_get_plural_rule_hybrid","_format_list_hybrid"
    ]' \
    wasm/icu_simd.c \
    wasm/web_native_intl_capabilities.c \
    wasm/web_native_intl_delegation.c \
    wasm/web_native_intl_hybrid.c \
    -o "${INSTALL_PREFIX}/wasm/icu-side.wasm"

echo "Built: ${INSTALL_PREFIX}/wasm/icu-side.wasm"

ls -la "${INSTALL_PREFIX}/wasm/"
echo "Build completed successfully!"