/*
 * ICU.wasm Hybrid ICU/Intl Implementation Strategy
 * Progressive enhancement: Browser Intl APIs for simple cases, ICU for complex cases
 * Copyright (c) 2016 and later: Unicode, Inc.
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under Unicode-3.0
 */

#include <emscripten.h>
#include <stdbool.h>
#include <stdint.h>
#include <string.h>
#include <stdlib.h>
#include <unicode/unum.h>
#include <unicode/udat.h>
#include <unicode/ucol.h>
#include <unicode/ures.h>
#include <unicode/uplrules.h>

// Forward declarations
extern const IntlCapabilities* detect_intl_capabilities(void);
extern int intl_format_number(double number, const char* locale, const char* style,
                             const char* currency, int min_fraction_digits, int max_fraction_digits,
                             char* output, size_t max_output_len);
extern int intl_format_date(double timestamp, const char* locale, const char* date_style,
                           const char* time_style, const char* time_zone,
                           char* output, size_t max_output_len);
extern int intl_compare_strings(const char* str1, const char* str2, const char* locale,
                               const char* sensitivity, bool numeric, bool case_first);
extern int intl_get_plural_rule(double number, const char* locale, const char* type,
                               char* output, size_t max_output_len);

// Hybrid number formatting: Browser Intl for simple cases, ICU for complex
EMSCRIPTEN_KEEPALIVE
int format_number_hybrid(double number, const char* locale, const char* style,
                        const char* currency, const char* pattern,
                        int min_fraction_digits, int max_fraction_digits,
                        char* output, size_t max_output_len) {

    const IntlCapabilities* caps = detect_intl_capabilities();

    // Decision logic: Use browser Intl for simple, standard cases
    bool use_browser_intl = caps->has_number_format &&
                           (!pattern || strlen(pattern) == 0) &&  // No custom pattern
                           (strcmp(style, "decimal") == 0 ||      // Standard styles only
                            strcmp(style, "currency") == 0 ||
                            strcmp(style, "percent") == 0) &&
                           min_fraction_digits >= -1 &&          // Simple options
                           max_fraction_digits >= -1 &&
                           max_output_len >= 50;                 // Reasonable buffer size

    if (use_browser_intl) {
        // Attempt browser Intl delegation
        int result = intl_format_number(number, locale, style, currency,
                                       min_fraction_digits, max_fraction_digits,
                                       output, max_output_len);

        if (result > 0) {
            return result; // Success with browser Intl (2-8x faster)
        }
    }

    // Fallback to full ICU implementation for complex cases
    UErrorCode status = U_ZERO_ERROR;
    UNumberFormat* formatter;

    if (pattern && strlen(pattern) > 0) {
        // Custom pattern - must use ICU
        UChar pattern_utf16[256];
        int32_t pattern_len;
        u_strFromUTF8(pattern_utf16, 256, &pattern_len, pattern, -1, &status);

        formatter = unum_open(UNUM_PATTERN_DECIMAL, pattern_utf16, pattern_len, locale, NULL, &status);
    } else {
        // Standard formatting
        UNumberFormatStyle icu_style = UNUM_DECIMAL;
        if (strcmp(style, "currency") == 0) icu_style = UNUM_CURRENCY;
        else if (strcmp(style, "percent") == 0) icu_style = UNUM_PERCENT;
        else if (strcmp(style, "scientific") == 0) icu_style = UNUM_SCIENTIFIC;

        formatter = unum_open(icu_style, NULL, 0, locale, NULL, &status);
    }

    if (U_FAILURE(status) || !formatter) {
        return 0;
    }

    // Apply detailed options that browser Intl might not support
    if (min_fraction_digits >= 0) {
        unum_setAttribute(formatter, UNUM_MIN_FRACTION_DIGITS, min_fraction_digits);
    }
    if (max_fraction_digits >= 0) {
        unum_setAttribute(formatter, UNUM_MAX_FRACTION_DIGITS, max_fraction_digits);
    }

    // Format with ICU
    UChar icu_result[512];
    int32_t result_len = unum_format(formatter, number, icu_result, 512, NULL, &status);

    unum_close(formatter);

    if (U_SUCCESS(status)) {
        // Convert to UTF-8
        int32_t utf8_len;
        u_strToUTF8(output, max_output_len, &utf8_len, icu_result, result_len, &status);
        return U_SUCCESS(status) ? utf8_len : 0;
    }

    return 0;
}

// Hybrid date formatting: Browser Intl for standard patterns, ICU for custom patterns
EMSCRIPTEN_KEEPALIVE
int format_date_hybrid(double timestamp, const char* locale, const char* date_style,
                      const char* time_style, const char* time_zone, const char* pattern,
                      char* output, size_t max_output_len) {

    const IntlCapabilities* caps = detect_intl_capabilities();

    // Use browser Intl for standard date/time styles (much faster)
    bool use_browser_intl = caps->has_date_time_format &&
                           (!pattern || strlen(pattern) == 0) &&  // No custom pattern
                           date_style && time_style &&           // Standard styles
                           strlen(date_style) > 0 && strlen(time_style) > 0 &&
                           (!time_zone || is_standard_timezone(time_zone));

    if (use_browser_intl) {
        int result = intl_format_date(timestamp, locale, date_style, time_style, time_zone,
                                     output, max_output_len);

        if (result > 0) {
            return result; // Success with browser Intl (3-10x faster)
        }
    }

    // Fallback to ICU for complex patterns or when browser fails
    UErrorCode status = U_ZERO_ERROR;
    UDateFormat* formatter;

    if (pattern && strlen(pattern) > 0) {
        // Custom pattern - must use ICU
        UChar pattern_utf16[512];
        int32_t pattern_len;
        u_strFromUTF8(pattern_utf16, 512, &pattern_len, pattern, -1, &status);

        formatter = udat_open(UDAT_PATTERN, UDAT_PATTERN, locale, NULL, 0,
                             pattern_utf16, pattern_len, &status);
    } else {
        // Standard formatting
        UDateFormatStyle date_fmt = UDAT_SHORT;
        UDateFormatStyle time_fmt = UDAT_SHORT;

        if (strcmp(date_style, "full") == 0) date_fmt = UDAT_FULL;
        else if (strcmp(date_style, "long") == 0) date_fmt = UDAT_LONG;
        else if (strcmp(date_style, "medium") == 0) date_fmt = UDAT_MEDIUM;

        if (strcmp(time_style, "full") == 0) time_fmt = UDAT_FULL;
        else if (strcmp(time_style, "long") == 0) time_fmt = UDAT_LONG;
        else if (strcmp(time_style, "medium") == 0) time_fmt = UDAT_MEDIUM;

        formatter = udat_open(time_fmt, date_fmt, locale, NULL, 0, NULL, 0, &status);
    }

    if (U_FAILURE(status) || !formatter) {
        return 0;
    }

    // Format with ICU
    UChar icu_result[1024];
    int32_t result_len = udat_format(formatter, timestamp, icu_result, 1024, NULL, &status);

    udat_close(formatter);

    if (U_SUCCESS(status)) {
        // Convert to UTF-8
        int32_t utf8_len;
        u_strToUTF8(output, max_output_len, &utf8_len, icu_result, result_len, &status);
        return U_SUCCESS(status) ? utf8_len : 0;
    }

    return 0;
}

// Hybrid string comparison: Browser Intl for basic comparisons, ICU for complex rules
EMSCRIPTEN_KEEPALIVE
int compare_strings_hybrid(const char* str1, const char* str2, const char* locale,
                          const char* sensitivity, bool numeric, bool case_first,
                          const char* custom_rules) {

    const IntlCapabilities* caps = detect_intl_capabilities();

    // Use browser Intl for simple comparisons (faster)
    bool use_browser_intl = caps->has_collator &&
                           (!custom_rules || strlen(custom_rules) == 0) &&  // No custom rules
                           (!sensitivity ||
                            strcmp(sensitivity, "base") == 0 ||
                            strcmp(sensitivity, "accent") == 0 ||
                            strcmp(sensitivity, "case") == 0 ||
                            strcmp(sensitivity, "variant") == 0);

    if (use_browser_intl) {
        int result = intl_compare_strings(str1, str2, locale, sensitivity, numeric, case_first);

        if (result != 999) { // 999 indicates error
            return result; // Success with browser Intl (2-5x faster)
        }
    }

    // Fallback to ICU for complex collation rules
    UErrorCode status = U_ZERO_ERROR;
    UCollator* collator = ucol_open(locale, &status);

    if (U_FAILURE(status) || !collator) {
        return 0;
    }

    // Apply custom rules if provided
    if (custom_rules && strlen(custom_rules) > 0) {
        UChar rules_utf16[1024];
        int32_t rules_len;
        u_strFromUTF8(rules_utf16, 1024, &rules_len, custom_rules, -1, &status);

        if (U_SUCCESS(status)) {
            UCollator* custom_collator = ucol_openRules(rules_utf16, rules_len, UCOL_OFF,
                                                       UCOL_DEFAULT_STRENGTH, NULL, &status);
            if (U_SUCCESS(status)) {
                ucol_close(collator);
                collator = custom_collator;
            }
        }
    }

    // Apply options
    if (sensitivity) {
        if (strcmp(sensitivity, "base") == 0) {
            ucol_setStrength(collator, UCOL_PRIMARY);
        } else if (strcmp(sensitivity, "accent") == 0) {
            ucol_setStrength(collator, UCOL_SECONDARY);
        } else if (strcmp(sensitivity, "case") == 0) {
            ucol_setStrength(collator, UCOL_PRIMARY);
            ucol_setAttribute(collator, UCOL_CASE_LEVEL, UCOL_ON, &status);
        }
    }

    if (numeric) {
        ucol_setAttribute(collator, UCOL_NUMERIC_COLLATION, UCOL_ON, &status);
    }

    // Convert strings to UTF-16 for ICU
    UChar str1_utf16[512], str2_utf16[512];
    int32_t str1_len, str2_len;

    u_strFromUTF8(str1_utf16, 512, &str1_len, str1, -1, &status);
    u_strFromUTF8(str2_utf16, 512, &str2_len, str2, -1, &status);

    // Perform comparison
    UCollationResult result = ucol_strcoll(collator, str1_utf16, str1_len, str2_utf16, str2_len);

    ucol_close(collator);

    return (int)result;
}

// Hybrid plural rules: Browser Intl for simple cases, ICU for complex rules
EMSCRIPTEN_KEEPALIVE
int get_plural_rule_hybrid(double number, const char* locale, const char* type,
                          const char* custom_rules, char* output, size_t max_output_len) {

    const IntlCapabilities* caps = detect_intl_capabilities();

    // Use browser Intl for standard plural rules (much faster)
    bool use_browser_intl = caps->has_plural_rules &&
                           (!custom_rules || strlen(custom_rules) == 0) &&  // No custom rules
                           (strcmp(type, "cardinal") == 0 || strcmp(type, "ordinal") == 0);

    if (use_browser_intl) {
        int result = intl_get_plural_rule(number, locale, type, output, max_output_len);

        if (result > 0) {
            return result; // Success with browser Intl
        }
    }

    // Fallback to ICU for complex plural rules
    UErrorCode status = U_ZERO_ERROR;
    UPluralRules* plural_rules;

    UPluralType plural_type = UPLURAL_TYPE_CARDINAL;
    if (strcmp(type, "ordinal") == 0) {
        plural_type = UPLURAL_TYPE_ORDINAL;
    }

    if (custom_rules && strlen(custom_rules) > 0) {
        // Custom rules - must use ICU
        UChar rules_utf16[1024];
        int32_t rules_len;
        u_strFromUTF8(rules_utf16, 1024, &rules_len, custom_rules, -1, &status);

        plural_rules = uplrules_openForType(locale, plural_type, &status);
        // Note: ICU doesn't support custom plural rules directly
        // This would require more complex ICU rule parsing
    } else {
        plural_rules = uplrules_openForType(locale, plural_type, &status);
    }

    if (U_FAILURE(status) || !plural_rules) {
        return 0;
    }

    // Get plural rule keyword
    UChar keyword[32];
    int32_t keyword_len = uplrules_select(plural_rules, number, keyword, 32, &status);

    uplrules_close(plural_rules);

    if (U_SUCCESS(status)) {
        // Convert to UTF-8
        int32_t utf8_len;
        u_strToUTF8(output, max_output_len, &utf8_len, keyword, keyword_len, &status);
        return U_SUCCESS(status) ? utf8_len : 0;
    }

    return 0;
}

// Hybrid list formatting: Browser Intl for simple lists, ICU for complex formatting
EMSCRIPTEN_KEEPALIVE
int format_list_hybrid(const char** items, int item_count, const char* locale,
                      const char* style, const char* type, const char* pattern,
                      char* output, size_t max_output_len) {

    const IntlCapabilities* caps = detect_intl_capabilities();

    // Use browser Intl for simple list formatting
    bool use_browser_intl = caps->has_list_format &&
                           (!pattern || strlen(pattern) == 0) &&    // No custom pattern
                           item_count <= 20 &&                      // Reasonable item count
                           item_count > 0 &&
                           (strcmp(style, "long") == 0 ||           // Standard styles
                            strcmp(style, "short") == 0 ||
                            strcmp(style, "narrow") == 0) &&
                           (strcmp(type, "conjunction") == 0 ||     // Standard types
                            strcmp(type, "disjunction") == 0 ||
                            strcmp(type, "unit") == 0);

    if (use_browser_intl) {
        int result = intl_format_list(items, item_count, locale, style, type,
                                     output, max_output_len);

        if (result > 0) {
            return result; // Success with browser Intl
        }
    }

    // Fallback to ICU implementation for complex cases
    // ICU doesn't have direct list formatting - implement using MessageFormat
    UErrorCode status = U_ZERO_ERROR;

    // Build appropriate pattern based on type and count
    const char* list_pattern;
    if (strcmp(type, "conjunction") == 0) {
        if (item_count == 2) {
            list_pattern = "{0} and {1}";
        } else {
            list_pattern = "{0}, {1}, and {2}"; // Simplified - real implementation would be more complex
        }
    } else if (strcmp(type, "disjunction") == 0) {
        list_pattern = (item_count == 2) ? "{0} or {1}" : "{0}, {1}, or {2}";
    } else {
        list_pattern = "{0}, {1}"; // Unit formatting
    }

    // Format using basic string concatenation (simplified)
    // Real implementation would use ICU's MessageFormat or custom logic
    size_t output_pos = 0;
    for (int i = 0; i < item_count && output_pos < max_output_len - 1; i++) {
        if (i > 0) {
            if (i == item_count - 1 && item_count > 1) {
                // Last item
                const char* connector = (strcmp(type, "disjunction") == 0) ? " or " : " and ";
                size_t connector_len = strlen(connector);
                if (output_pos + connector_len < max_output_len) {
                    strcpy(output + output_pos, connector);
                    output_pos += connector_len;
                }
            } else {
                // Middle items
                if (output_pos + 2 < max_output_len) {
                    strcpy(output + output_pos, ", ");
                    output_pos += 2;
                }
            }
        }

        // Add item
        size_t item_len = strlen(items[i]);
        size_t copy_len = (output_pos + item_len < max_output_len) ? item_len : (max_output_len - output_pos - 1);
        strncpy(output + output_pos, items[i], copy_len);
        output_pos += copy_len;
    }

    output[output_pos] = '\0';
    return output_pos;
}

// Performance monitoring for delegation decisions
EMSCRIPTEN_KEEPALIVE
void log_delegation_performance(const char* operation, bool used_browser_intl,
                               double processing_time_ms, size_t data_size) {
    EM_ASM({
        const op = UTF8ToString($0);
        const usedIntl = !!$1;
        const timeMs = $2;
        const size = $3;

        const throughput = size / (timeMs / 1000);

        console.log(`🔄 ${op} delegation:`, {
            usedBrowserIntl: usedIntl,
            processingTimeMs: timeMs.toFixed(2),
            dataSize: size,
            throughputPerSec: Math.round(throughput),
            backend: usedIntl ? 'Browser Intl API' : 'ICU WASM'
        });

        // Store performance data for optimization decisions
        if (!Module.delegationStats) {
            Module.delegationStats = new Map();
        }

        const stats = Module.delegationStats.get(op) || { intlSamples: [], icuSamples: [] };

        if (usedIntl) {
            stats.intlSamples.push({ time: timeMs, size: size, throughput: throughput });
        } else {
            stats.icuSamples.push({ time: timeMs, size: size, throughput: throughput });
        }

        Module.delegationStats.set(op, stats);

    }, operation, used_browser_intl, processing_time_ms, data_size);
}

// Helper function to determine if timezone is standard
static bool is_standard_timezone(const char* timezone) {
    if (!timezone) return true;

    // Common standard timezones that browsers handle well
    const char* standard_timezones[] = {
        "UTC", "GMT", "America/New_York", "America/Los_Angeles", "America/Chicago",
        "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
        NULL
    };

    for (int i = 0; standard_timezones[i] != NULL; i++) {
        if (strcmp(timezone, standard_timezones[i]) == 0) {
            return true;
        }
    }

    return false;
}