/*
 * ICU.wasm Browser Intl API Capability Detection
 * Copyright (c) 2016 and later: Unicode, Inc.
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under Unicode-3.0
 */

#include <emscripten.h>
#include <stdbool.h>
#include <stdint.h>

typedef struct {
    // Core Intl API availability
    bool has_intl_object;
    bool has_number_format;
    bool has_date_time_format;
    bool has_collator;
    bool has_plural_rules;
    bool has_list_format;
    bool has_relative_time_format;
    bool has_display_names;
    bool has_segmenter;
    bool has_locale;
    bool has_duration_format;

    // Advanced capabilities
    bool supports_format_to_parts;
    bool supports_select_range;
    bool supports_format_range;
    bool supports_resolved_options;

    // Performance features
    bool supports_bulk_operations;
    bool supports_sort_key_generation;

    // Browser identification
    bool is_chrome_based;
    bool is_firefox;
    bool is_safari;
    bool is_deno_runtime;
    int browser_version;

    // Locale support assessment
    int supported_locales_count;
    bool supports_unicode_extensions;
    bool supports_region_subtags;

} IntlCapabilities;

// Comprehensive Intl API capability detection
EMSCRIPTEN_KEEPALIVE
const IntlCapabilities* detect_intl_capabilities(void) {
    static IntlCapabilities caps = {0};
    static bool initialized = false;

    if (initialized) return &caps;

    // Core Intl object detection
    caps.has_intl_object = EM_ASM_INT({
        return typeof Intl !== 'undefined' ? 1 : 0;
    });

    if (!caps.has_intl_object) {
        initialized = true;
        return &caps;
    }

    // Individual constructor detection
    caps.has_number_format = EM_ASM_INT({
        return typeof Intl.NumberFormat !== 'undefined' ? 1 : 0;
    });

    caps.has_date_time_format = EM_ASM_INT({
        return typeof Intl.DateTimeFormat !== 'undefined' ? 1 : 0;
    });

    caps.has_collator = EM_ASM_INT({
        return typeof Intl.Collator !== 'undefined' ? 1 : 0;
    });

    caps.has_plural_rules = EM_ASM_INT({
        return typeof Intl.PluralRules !== 'undefined' ? 1 : 0;
    });

    caps.has_list_format = EM_ASM_INT({
        return typeof Intl.ListFormat !== 'undefined' ? 1 : 0;
    });

    caps.has_relative_time_format = EM_ASM_INT({
        return typeof Intl.RelativeTimeFormat !== 'undefined' ? 1 : 0;
    });

    caps.has_display_names = EM_ASM_INT({
        return typeof Intl.DisplayNames !== 'undefined' ? 1 : 0;
    });

    caps.has_segmenter = EM_ASM_INT({
        return typeof Intl.Segmenter !== 'undefined' ? 1 : 0;
    });

    caps.has_locale = EM_ASM_INT({
        return typeof Intl.Locale !== 'undefined' ? 1 : 0;
    });

    caps.has_duration_format = EM_ASM_INT({
        return typeof Intl.DurationFormat !== 'undefined' ? 1 : 0;
    });

    // Advanced feature detection
    caps.supports_format_to_parts = EM_ASM_INT({
        try {
            const formatter = new Intl.NumberFormat('en');
            return typeof formatter.formatToParts === 'function' ? 1 : 0;
        } catch (e) {
            return 0;
        }
    });

    caps.supports_format_range = EM_ASM_INT({
        try {
            const formatter = new Intl.DateTimeFormat('en');
            return typeof formatter.formatRange === 'function' ? 1 : 0;
        } catch (e) {
            return 0;
        }
    });

    caps.supports_resolved_options = EM_ASM_INT({
        try {
            const formatter = new Intl.NumberFormat('en');
            return typeof formatter.resolvedOptions === 'function' ? 1 : 0;
        } catch (e) {
            return 0;
        }
    });

    // Browser identification for optimization strategies
    caps.is_chrome_based = EM_ASM_INT({
        return typeof navigator !== 'undefined' &&
               navigator.userAgent &&
               navigator.userAgent.includes('Chrome') ? 1 : 0;
    });

    caps.is_firefox = EM_ASM_INT({
        return typeof navigator !== 'undefined' &&
               navigator.userAgent &&
               navigator.userAgent.includes('Firefox') ? 1 : 0;
    });

    caps.is_safari = EM_ASM_INT({
        return typeof navigator !== 'undefined' &&
               navigator.userAgent &&
               navigator.userAgent.includes('Safari') &&
               !navigator.userAgent.includes('Chrome') ? 1 : 0;
    });

    caps.is_deno_runtime = EM_ASM_INT({
        return typeof Deno !== 'undefined' ? 1 : 0;
    });

    // Browser version detection (affects feature availability)
    caps.browser_version = EM_ASM_INT({
        if (typeof navigator === 'undefined') return 0;

        const ua = navigator.userAgent;
        let match;

        if ((match = ua.match(/Chrome\\/(\\d+)/))) {
            return parseInt(match[1]);
        } else if ((match = ua.match(/Firefox\\/(\\d+)/))) {
            return parseInt(match[1]);
        } else if ((match = ua.match(/Version\\/(\\d+).*Safari/))) {
            return parseInt(match[1]);
        }

        return 0;
    });

    // Assess locale support breadth
    caps.supported_locales_count = EM_ASM_INT({
        try {
            // Test a range of locales to assess support breadth
            const testLocales = ['en-US', 'de-DE', 'fr-FR', 'es-ES', 'ja-JP', 'zh-CN', 'ar-SA', 'hi-IN'];
            let supportedCount = 0;

            for (const locale of testLocales) {
                try {
                    const formatter = new Intl.NumberFormat(locale);
                    if (formatter.resolvedOptions().locale.startsWith(locale.split('-')[0])) {
                        supportedCount++;
                    }
                } catch {
                    // Locale not supported
                }
            }

            return supportedCount;
        } catch (e) {
            return 0;
        }
    });

    // Unicode extension support
    caps.supports_unicode_extensions = EM_ASM_INT({
        try {
            // Test Unicode BCP 47 extension support
            const formatter = new Intl.NumberFormat('en-u-nu-arab'); // Arabic numerals
            return formatter.resolvedOptions().numberingSystem === 'arab' ? 1 : 0;
        } catch (e) {
            return 0;
        }
    });

    initialized = true;
    return &caps;
}

// Specific capability tests for delegation decisions
EMSCRIPTEN_KEEPALIVE
bool can_delegate_number_format(const char* locale, const char* style, const char* currency) {
    const IntlCapabilities* caps = detect_intl_capabilities();

    if (!caps->has_number_format) return false;

    // Test specific formatting capability
    return EM_ASM_INT({
        try {
            const loc = UTF8ToString($0);
            const st = UTF8ToString($1);
            const curr = UTF8ToString($2);

            const options = { style: st };
            if (st === 'currency' && curr) {
                options.currency = curr;
            }

            const formatter = new Intl.NumberFormat(loc, options);
            const resolved = formatter.resolvedOptions();

            // Verify the browser actually supports this configuration
            return resolved.locale && resolved.style === st ? 1 : 0;
        } catch (e) {
            return 0;
        }
    }, locale, style, currency);
}

EMSCRIPTEN_KEEPALIVE
bool can_delegate_date_format(const char* locale, const char* date_style, const char* time_style) {
    const IntlCapabilities* caps = detect_intl_capabilities();

    if (!caps->has_date_time_format) return false;

    return EM_ASM_INT({
        try {
            const loc = UTF8ToString($0);
            const ds = UTF8ToString($1);
            const ts = UTF8ToString($2);

            const options = {};
            if (ds && ds !== 'none') options.dateStyle = ds;
            if (ts && ts !== 'none') options.timeStyle = ts;

            const formatter = new Intl.DateTimeFormat(loc, options);
            const resolved = formatter.resolvedOptions();

            return resolved.locale ? 1 : 0;
        } catch (e) {
            return 0;
        }
    }, locale, date_style, time_style);
}

EMSCRIPTEN_KEEPALIVE
bool can_delegate_collation(const char* locale, const char* sensitivity) {
    const IntlCapabilities* caps = detect_intl_capabilities();

    if (!caps->has_collator) return false;

    return EM_ASM_INT({
        try {
            const loc = UTF8ToString($0);
            const sens = UTF8ToString($1);

            const options = {};
            if (sens) options.sensitivity = sens;

            const collator = new Intl.Collator(loc, options);
            const resolved = collator.resolvedOptions();

            return resolved.locale ? 1 : 0;
        } catch (e) {
            return 0;
        }
    }, locale, sensitivity);
}

// Performance assessment for delegation decisions
EMSCRIPTEN_KEEPALIVE
bool is_intl_faster_than_icu(const char* operation_type, size_t data_size) {
    const IntlCapabilities* caps = detect_intl_capabilities();

    // Decision matrix based on operation type and data size
    if (strcmp(operation_type, "number_format") == 0) {
        // Intl.NumberFormat is typically faster for simple formatting
        return caps->has_number_format && data_size < 10000;
    }

    if (strcmp(operation_type, "date_format") == 0) {
        // Intl.DateTimeFormat is faster for standard patterns
        return caps->has_date_time_format && data_size < 5000;
    }

    if (strcmp(operation_type, "collation") == 0) {
        // Intl.Collator is faster for simple comparisons
        return caps->has_collator && data_size < 1000;
    }

    if (strcmp(operation_type, "plural_rules") == 0) {
        // Intl.PluralRules is much faster for simple cases
        return caps->has_plural_rules;
    }

    if (strcmp(operation_type, "list_format") == 0) {
        // Intl.ListFormat is faster for simple lists
        return caps->has_list_format && data_size < 100;
    }

    // For complex operations, ICU is typically more capable
    return false;
}

// Detailed capability reporting for debugging
EMSCRIPTEN_KEEPALIVE
void log_intl_capabilities(void) {
    const IntlCapabilities* caps = detect_intl_capabilities();

    EM_ASM({
        const caps = {
            hasIntl: !!$0,
            hasNumberFormat: !!$1,
            hasDateTimeFormat: !!$2,
            hasCollator: !!$3,
            hasPluralRules: !!$4,
            hasListFormat: !!$5,
            hasRelativeTimeFormat: !!$6,
            hasDisplayNames: !!$7,
            hasSegmenter: !!$8,
            hasLocale: !!$9,
            hasDurationFormat: !!$10,
            supportsFormatToParts: !!$11,
            supportsFormatRange: !!$12,
            supportsResolvedOptions: !!$13,
            isChromeBased: !!$14,
            isFirefox: !!$15,
            isSafari: !!$16,
            isDenoRuntime: !!$17,
            browserVersion: $18,
            supportedLocalesCount: $19,
            supportsUnicodeExtensions: !!$20
        };

        console.log('🌐 ICU.wasm Browser Intl API Capabilities:', caps);

        // Performance recommendations
        const recommendations = [];
        if (caps.hasNumberFormat) recommendations.push('✅ Use Intl.NumberFormat for simple number formatting');
        if (caps.hasDateTimeFormat) recommendations.push('✅ Use Intl.DateTimeFormat for standard date patterns');
        if (caps.hasCollator) recommendations.push('✅ Use Intl.Collator for basic string comparison');
        if (caps.hasPluralRules) recommendations.push('✅ Use Intl.PluralRules for plural selection');
        if (caps.hasListFormat) recommendations.push('✅ Use Intl.ListFormat for list formatting');

        if (recommendations.length > 0) {
            console.log('🚀 Performance Optimization Opportunities:');
            recommendations.forEach(rec => console.log('  ' + rec));
        }

        if (!caps.hasIntl) {
            console.warn('⚠️  Browser Intl API not available - using full ICU implementation');
        }

    }, caps->has_intl_object, caps->has_number_format, caps->has_date_time_format,
       caps->has_collator, caps->has_plural_rules, caps->has_list_format,
       caps->has_relative_time_format, caps->has_display_names, caps->has_segmenter,
       caps->has_locale, caps->has_duration_format, caps->supports_format_to_parts,
       caps->supports_format_range, caps->supports_resolved_options,
       caps->is_chrome_based, caps->is_firefox, caps->is_safari, caps->is_deno_runtime,
       caps->browser_version, caps->supported_locales_count, caps->supports_unicode_extensions);
}