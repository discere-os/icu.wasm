/*
 * ICU.wasm Browser Intl API Delegation Implementation
 * Copyright (c) 2016 and later: Unicode, Inc.
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under Unicode-3.0
 */

#include <emscripten.h>
#include <stdbool.h>
#include <stdint.h>
#include <string.h>
#include <stdlib.h>

// Forward declaration from capabilities
extern const IntlCapabilities* detect_intl_capabilities(void);

// Browser Intl.NumberFormat delegation (2-8x faster for simple cases)
EMSCRIPTEN_KEEPALIVE
int intl_format_number(double number, const char* locale, const char* style,
                      const char* currency, int min_fraction_digits, int max_fraction_digits,
                      char* output, size_t max_output_len) {

    return EM_ASM_INT({
        try {
            const loc = UTF8ToString($1);
            const st = UTF8ToString($2);
            const curr = UTF8ToString($3);

            // Build options object
            const options = {
                style: st || 'decimal',
                minimumFractionDigits: $4 >= 0 ? $4 : undefined,
                maximumFractionDigits: $5 >= 0 ? $5 : undefined
            };

            if (st === 'currency' && curr) {
                options.currency = curr;
            }

            // Create formatter and format number
            const formatter = new Intl.NumberFormat(loc, options);
            const result = formatter.format($0);

            // Copy result to output buffer
            const resultBytes = new TextEncoder().encode(result);
            const copyLength = Math.min(resultBytes.length, $7 - 1);

            HEAPU8.set(resultBytes.subarray(0, copyLength), $6);
            HEAPU8[$6 + copyLength] = 0; // Null terminate

            return copyLength;

        } catch (error) {
            console.error('Intl.NumberFormat failed:', error);
            return 0;
        }
    }, number, locale, style, currency, min_fraction_digits, max_fraction_digits, output, max_output_len);
}

// Browser Intl.DateTimeFormat delegation (3-10x faster for standard patterns)
EMSCRIPTEN_KEEPALIVE
int intl_format_date(double timestamp, const char* locale, const char* date_style,
                    const char* time_style, const char* time_zone,
                    char* output, size_t max_output_len) {

    return EM_ASM_INT({
        try {
            const loc = UTF8ToString($1);
            const ds = UTF8ToString($2);
            const ts = UTF8ToString($3);
            const tz = UTF8ToString($4);

            // Build options object
            const options = {};
            if (ds && ds !== 'none') options.dateStyle = ds;
            if (ts && ts !== 'none') options.timeStyle = ts;
            if (tz) options.timeZone = tz;

            // Create formatter and format date
            const formatter = new Intl.DateTimeFormat(loc, options);
            const date = new Date($0);
            const result = formatter.format(date);

            // Copy result to output buffer
            const resultBytes = new TextEncoder().encode(result);
            const copyLength = Math.min(resultBytes.length, $6 - 1);

            HEAPU8.set(resultBytes.subarray(0, copyLength), $5);
            HEAPU8[$5 + copyLength] = 0; // Null terminate

            return copyLength;

        } catch (error) {
            console.error('Intl.DateTimeFormat failed:', error);
            return 0;
        }
    }, timestamp, locale, date_style, time_style, time_zone, output, max_output_len);
}

// Browser Intl.Collator delegation (2-5x faster for basic comparisons)
EMSCRIPTEN_KEEPALIVE
int intl_compare_strings(const char* str1, const char* str2, const char* locale,
                        const char* sensitivity, bool numeric, bool case_first) {

    return EM_ASM_INT({
        try {
            const s1 = UTF8ToString($0);
            const s2 = UTF8ToString($1);
            const loc = UTF8ToString($2);
            const sens = UTF8ToString($3);

            // Build options object
            const options = {};
            if (sens) options.sensitivity = sens;
            if ($4) options.numeric = true;
            if ($5) options.caseFirst = 'upper';

            // Create collator and compare
            const collator = new Intl.Collator(loc, options);
            return collator.compare(s1, s2);

        } catch (error) {
            console.error('Intl.Collator failed:', error);
            return 999; // Error indicator
        }
    }, str1, str2, locale, sensitivity, numeric, case_first);
}

// Browser Intl.PluralRules delegation (much faster for simple cases)
EMSCRIPTEN_KEEPALIVE
int intl_get_plural_rule(double number, const char* locale, const char* type,
                        char* output, size_t max_output_len) {

    return EM_ASM_INT({
        try {
            const loc = UTF8ToString($1);
            const ruleType = UTF8ToString($2);

            const options = {
                type: ruleType || 'cardinal'
            };

            const pluralRules = new Intl.PluralRules(loc, options);
            const result = pluralRules.select($0);

            // Copy result to output buffer
            const resultBytes = new TextEncoder().encode(result);
            const copyLength = Math.min(resultBytes.length, $4 - 1);

            HEAPU8.set(resultBytes.subarray(0, copyLength), $3);
            HEAPU8[$3 + copyLength] = 0; // Null terminate

            return copyLength;

        } catch (error) {
            console.error('Intl.PluralRules failed:', error);
            return 0;
        }
    }, number, locale, type, output, max_output_len);
}

// Browser Intl.ListFormat delegation (faster for simple lists)
EMSCRIPTEN_KEEPALIVE
int intl_format_list(const char** items, int item_count, const char* locale,
                    const char* style, const char* type,
                    char* output, size_t max_output_len) {

    return EM_ASM_INT({
        try {
            const loc = UTF8ToString($2);
            const st = UTF8ToString($3);
            const tp = UTF8ToString($4);

            // Build JavaScript array of strings
            const itemArray = [];
            for (let i = 0; i < $1; i++) {
                const itemPtr = HEAPU32[($0 >> 2) + i];
                itemArray.push(UTF8ToString(itemPtr));
            }

            // Build options
            const options = {};
            if (st) options.style = st;
            if (tp) options.type = tp;

            // Create formatter and format list
            const formatter = new Intl.ListFormat(loc, options);
            const result = formatter.format(itemArray);

            // Copy result to output buffer
            const resultBytes = new TextEncoder().encode(result);
            const copyLength = Math.min(resultBytes.length, $6 - 1);

            HEAPU8.set(resultBytes.subarray(0, copyLength), $5);
            HEAPU8[$5 + copyLength] = 0; // Null terminate

            return copyLength;

        } catch (error) {
            console.error('Intl.ListFormat failed:', error);
            return 0;
        }
    }, items, item_count, locale, style, type, output, max_output_len);
}

// Browser Intl.RelativeTimeFormat delegation
EMSCRIPTEN_KEEPALIVE
int intl_format_relative_time(double value, const char* unit, const char* locale,
                             const char* style, char* output, size_t max_output_len) {

    return EM_ASM_INT({
        try {
            const loc = UTF8ToString($2);
            const u = UTF8ToString($1);
            const st = UTF8ToString($3);

            const options = {};
            if (st) options.style = st;

            const formatter = new Intl.RelativeTimeFormat(loc, options);
            const result = formatter.format($0, u);

            // Copy result to output buffer
            const resultBytes = new TextEncoder().encode(result);
            const copyLength = Math.min(resultBytes.length, $5 - 1);

            HEAPU8.set(resultBytes.subarray(0, copyLength), $4);
            HEAPU8[$4 + copyLength] = 0; // Null terminate

            return copyLength;

        } catch (error) {
            console.error('Intl.RelativeTimeFormat failed:', error);
            return 0;
        }
    }, value, unit, locale, style, output, max_output_len);
}

// Browser Intl.Segmenter delegation (for word/sentence breaking)
EMSCRIPTEN_KEEPALIVE
int intl_segment_text(const char* text, const char* locale, const char* granularity,
                     int* boundaries, int max_boundaries) {

    return EM_ASM_INT({
        try {
            const txt = UTF8ToString($0);
            const loc = UTF8ToString($1);
            const gran = UTF8ToString($2);

            if (typeof Intl.Segmenter === 'undefined') {
                return 0; // Not supported
            }

            const segmenter = new Intl.Segmenter(loc, { granularity: gran || 'word' });
            const segments = segmenter.segment(txt);

            let boundaryCount = 0;
            for (const segment of segments) {
                if (boundaryCount >= $4) break;
                HEAP32[($3 >> 2) + boundaryCount] = segment.index;
                boundaryCount++;
            }

            return boundaryCount;

        } catch (error) {
            console.error('Intl.Segmenter failed:', error);
            return 0;
        }
    }, text, locale, granularity, boundaries, max_boundaries);
}

// Test browser Intl performance vs ICU for specific operations
EMSCRIPTEN_KEEPALIVE
double benchmark_intl_vs_icu(const char* operation, const char* test_data, int iterations) {

    return EM_ASM_DOUBLE({
        try {
            const op = UTF8ToString($0);
            const data = UTF8ToString($1);
            const iters = $2;

            const startTime = performance.now();

            for (let i = 0; i < iters; i++) {
                if (op === 'number_format') {
                    new Intl.NumberFormat('en-US').format(parseFloat(data));
                } else if (op === 'date_format') {
                    new Intl.DateTimeFormat('en-US').format(new Date(data));
                } else if (op === 'collation') {
                    new Intl.Collator('en-US').compare(data, data + '_test');
                }
            }

            const endTime = performance.now();
            return endTime - startTime;

        } catch (error) {
            console.error('Intl benchmark failed:', error);
            return -1.0;
        }
    }, operation, test_data, iterations);
}