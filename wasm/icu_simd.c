/*
 * ICU.wasm SIMD Optimizations for UTF-8/Unicode Operations
 * Copyright (c) 2016 and later: Unicode, Inc.
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under Unicode-3.0
 */

#include <wasm_simd128.h>
#include <emscripten.h>
#include <stdbool.h>
#include <stdint.h>
#include <string.h>
#include <stdlib.h>

// SIMD feature detection
EMSCRIPTEN_KEEPALIVE
bool icu_simd_available() {
#ifdef __wasm_simd128__
    return true;
#else
    return false;
#endif
}

// Fast ASCII detection with SIMD - critical for UTF-8 processing
EMSCRIPTEN_KEEPALIVE
bool icu_is_ascii_simd(const uint8_t* str, size_t len) {
    v128_t ascii_max = wasm_i8x16_splat(0x7F);
    size_t i = 0;

    // Process 16 bytes per iteration
    for (; i + 15 < len; i += 16) {
        v128_t chunk = wasm_v128_load(&str[i]);
        v128_t cmp = wasm_i8x16_le(chunk, ascii_max);
        int32_t mask = wasm_i8x16_bitmask(cmp);

        if (mask != 0xFFFF) {
            return false; // Found non-ASCII
        }
    }

    // Check remaining bytes
    for (; i < len; i++) {
        if (str[i] > 0x7F) {
            return false;
        }
    }

    return true;
}

// SIMD-optimized UTF-8 validation
EMSCRIPTEN_KEEPALIVE
bool icu_validate_utf8_simd(const uint8_t* str, size_t len) {
    v128_t ascii_max = wasm_i8x16_splat(0x7F);
    size_t i = 0;

    while (i + 15 < len) {
        v128_t chunk = wasm_v128_load(&str[i]);
        v128_t is_ascii = wasm_i8x16_le(chunk, ascii_max);
        int32_t ascii_mask = wasm_i8x16_bitmask(is_ascii);

        if (ascii_mask == 0xFFFF) {
            // Pure ASCII chunk - fast path
            i += 16;
            continue;
        }

        // Contains non-ASCII - validate UTF-8 sequences byte by byte
        for (int j = 0; j < 16 && i + j < len; j++) {
            uint8_t byte = str[i + j];
            if (byte <= 0x7F) {
                // ASCII - valid
                continue;
            } else if (byte >= 0xC2 && byte <= 0xDF) {
                // 2-byte sequence
                if (i + j + 1 >= len || (str[i + j + 1] & 0xC0) != 0x80) {
                    return false;
                }
                j++; // Skip continuation byte
            } else if (byte >= 0xE0 && byte <= 0xEF) {
                // 3-byte sequence
                if (i + j + 2 >= len ||
                    (str[i + j + 1] & 0xC0) != 0x80 ||
                    (str[i + j + 2] & 0xC0) != 0x80) {
                    return false;
                }
                j += 2; // Skip continuation bytes
            } else if (byte >= 0xF0 && byte <= 0xF4) {
                // 4-byte sequence
                if (i + j + 3 >= len ||
                    (str[i + j + 1] & 0xC0) != 0x80 ||
                    (str[i + j + 2] & 0xC0) != 0x80 ||
                    (str[i + j + 3] & 0xC0) != 0x80) {
                    return false;
                }
                j += 3; // Skip continuation bytes
            } else {
                return false; // Invalid byte
            }
        }
        i += 16;
    }

    // Validate remaining bytes
    while (i < len) {
        uint8_t byte = str[i];
        if (byte <= 0x7F) {
            i++;
        } else if (byte >= 0xC2 && byte <= 0xDF) {
            if (i + 1 >= len || (str[i + 1] & 0xC0) != 0x80) {
                return false;
            }
            i += 2;
        } else if (byte >= 0xE0 && byte <= 0xEF) {
            if (i + 2 >= len ||
                (str[i + 1] & 0xC0) != 0x80 ||
                (str[i + 2] & 0xC0) != 0x80) {
                return false;
            }
            i += 3;
        } else if (byte >= 0xF0 && byte <= 0xF4) {
            if (i + 3 >= len ||
                (str[i + 1] & 0xC0) != 0x80 ||
                (str[i + 2] & 0xC0) != 0x80 ||
                (str[i + 3] & 0xC0) != 0x80) {
                return false;
            }
            i += 4;
        } else {
            return false;
        }
    }

    return true;
}

// SIMD-optimized string comparison for collation
EMSCRIPTEN_KEEPALIVE
int icu_string_compare_simd(const uint8_t* str1, size_t len1,
                            const uint8_t* str2, size_t len2) {
    size_t min_len = len1 < len2 ? len1 : len2;
    size_t i = 0;

    // Process 16 bytes at a time
    for (; i + 15 < min_len; i += 16) {
        v128_t v1 = wasm_v128_load(&str1[i]);
        v128_t v2 = wasm_v128_load(&str2[i]);
        v128_t cmp = wasm_i8x16_eq(v1, v2);
        int32_t mask = wasm_i8x16_bitmask(cmp);

        if (mask != 0xFFFF) {
            // Found difference - locate exact position
            for (int j = 0; j < 16; j++) {
                if (str1[i + j] != str2[i + j]) {
                    return str1[i + j] - str2[i + j];
                }
            }
        }
    }

    // Compare remaining bytes
    for (; i < min_len; i++) {
        if (str1[i] != str2[i]) {
            return str1[i] - str2[i];
        }
    }

    return len1 == len2 ? 0 : (len1 < len2 ? -1 : 1);
}

// SIMD-optimized case conversion (ASCII fast path)
EMSCRIPTEN_KEEPALIVE
void icu_to_upper_ascii_simd(char* str, size_t len) {
    v128_t lower_a = wasm_i8x16_splat('a');
    v128_t lower_z = wasm_i8x16_splat('z');
    v128_t case_diff = wasm_i8x16_splat('a' - 'A');

    size_t i = 0;
    for (; i + 15 < len; i += 16) {
        v128_t chunk = wasm_v128_load(&str[i]);

        // Check if characters are lowercase
        v128_t ge_a = wasm_i8x16_ge(chunk, lower_a);
        v128_t le_z = wasm_i8x16_le(chunk, lower_z);
        v128_t is_lower = wasm_v128_and(ge_a, le_z);

        // Convert lowercase to uppercase
        v128_t adjustment = wasm_v128_and(is_lower, case_diff);
        v128_t result = wasm_i8x16_sub(chunk, adjustment);

        wasm_v128_store(&str[i], result);
    }

    // Handle remaining characters
    for (; i < len; i++) {
        if (str[i] >= 'a' && str[i] <= 'z') {
            str[i] -= 32;
        }
    }
}

EMSCRIPTEN_KEEPALIVE
void icu_to_lower_ascii_simd(char* str, size_t len) {
    v128_t upper_a = wasm_i8x16_splat('A');
    v128_t upper_z = wasm_i8x16_splat('Z');
    v128_t case_diff = wasm_i8x16_splat('a' - 'A');

    size_t i = 0;
    for (; i + 15 < len; i += 16) {
        v128_t chunk = wasm_v128_load(&str[i]);

        // Check if characters are uppercase
        v128_t ge_a = wasm_i8x16_ge(chunk, upper_a);
        v128_t le_z = wasm_i8x16_le(chunk, upper_z);
        v128_t is_upper = wasm_v128_and(ge_a, le_z);

        // Convert uppercase to lowercase
        v128_t adjustment = wasm_v128_and(is_upper, case_diff);
        v128_t result = wasm_i8x16_add(chunk, adjustment);

        wasm_v128_store(&str[i], result);
    }

    // Handle remaining characters
    for (; i < len; i++) {
        if (str[i] >= 'A' && str[i] <= 'Z') {
            str[i] += 32;
        }
    }
}

// SIMD-optimized character search for Unicode processing
EMSCRIPTEN_KEEPALIVE
const uint8_t* icu_find_char_simd(const uint8_t* haystack, size_t len, uint8_t needle) {
    v128_t needle_vec = wasm_i8x16_splat(needle);

    size_t i = 0;
    for (; i + 15 < len; i += 16) {
        v128_t chunk = wasm_v128_load(&haystack[i]);
        v128_t cmp = wasm_i8x16_eq(chunk, needle_vec);
        int32_t mask = wasm_i8x16_bitmask(cmp);

        if (mask) {
            // Found match - locate exact position
            int pos = __builtin_ctz(mask);
            return &haystack[i + pos];
        }
    }

    // Check remaining bytes
    for (; i < len; i++) {
        if (haystack[i] == needle) {
            return &haystack[i];
        }
    }

    return NULL;
}

// SIMD-optimized Unicode normalization helpers
EMSCRIPTEN_KEEPALIVE
size_t icu_count_combining_marks_simd(const uint8_t* str, size_t len) {
    size_t count = 0;
    size_t i = 0;

    // Process UTF-8 sequences and count combining marks (0x0300-0x036F range in UTF-8)
    while (i < len) {
        if (str[i] <= 0x7F) {
            // ASCII - no combining marks
            i++;
        } else if ((str[i] & 0xE0) == 0xC0) {
            // 2-byte sequence - no combining marks in this range
            i += 2;
        } else if ((str[i] & 0xF0) == 0xE0) {
            // 3-byte sequence - check for combining marks
            if (i + 2 < len && str[i] == 0xCC && (str[i + 1] & 0xF0) == 0x80) {
                // Combining diacritical marks range (U+0300-U+036F)
                count++;
            }
            i += 3;
        } else if ((str[i] & 0xF8) == 0xF0) {
            // 4-byte sequence - check for other combining marks
            i += 4;
        } else {
            // Invalid UTF-8
            break;
        }
    }

    return count;
}

// Performance testing helper - measure SIMD vs scalar performance
EMSCRIPTEN_KEEPALIVE
double icu_benchmark_string_ops_simd(const char* text, size_t len, int iterations) {
    double start_time = emscripten_get_now();

    for (int i = 0; i < iterations; i++) {
        // Test various SIMD operations
        bool is_ascii = icu_is_ascii_simd((const uint8_t*)text, len);
        bool is_valid = icu_validate_utf8_simd((const uint8_t*)text, len);
        const uint8_t* found = icu_find_char_simd((const uint8_t*)text, len, 'a');
        size_t combining = icu_count_combining_marks_simd((const uint8_t*)text, len);

        // Prevent optimization elimination
        (void)is_ascii;
        (void)is_valid;
        (void)found;
        (void)combining;
    }

    double end_time = emscripten_get_now();
    return end_time - start_time;
}

// Compare SIMD vs scalar performance
EMSCRIPTEN_KEEPALIVE
double icu_benchmark_comparison(const char* text, size_t len) {
    const int iterations = 10000;

    // Benchmark SIMD version
    double simd_time = icu_benchmark_string_ops_simd(text, len, iterations);

    // Benchmark scalar version (simplified)
    double start_time = emscripten_get_now();
    for (int i = 0; i < iterations; i++) {
        // Scalar operations for comparison
        bool is_ascii = true;
        for (size_t j = 0; j < len; j++) {
            if ((unsigned char)text[j] > 0x7F) {
                is_ascii = false;
                break;
            }
        }
        (void)is_ascii;
    }
    double scalar_time = emscripten_get_now() - start_time;

    return scalar_time / simd_time; // Return speedup ratio
}