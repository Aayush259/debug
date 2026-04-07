export type LogLevel = "info" | "warn" | "error";

/**
 * Common patterns that indicate an error level log across different languages/frameworks.
 */
const ERROR_PATTERNS = [
    // Node.js/V8 Stack trace (e.g. "Error: ...\n    at Object.<anonymous> (/var/...)")
    /Error:\s.+?\n\s+at\s.+?/i,
    /TypeError:\s.+?/i,
    /ReferenceError:\s.+?/i,
    /SyntaxError:\s.+?/i,

    // PHP / Laravel
    /Stack trace:/i,
    /Fatal error:/i,
    /uncaught exception/i,
    /Illuminate\\Database\\QueryException/i, // Laravel specific

    // Python / Django
    /Traceback \(most recent call last\):/i,
    /(ValueError|AttributeError|KeyError|TypeError|NameError|IndexError|SyntaxError|IndentationError): /i,

    // Generic Catch-All Errors
    /(^|\b|\s)(ERROR|CRITICAL|FATAL|PANIC|EMERGENCY)(\b|\s|:)/i,
    /UnhandledPromiseRejectionWarning:/i,
    /Exception:/i,
    // Python/Other general error formats (e.g. "SomethingError", "module.sub.SomethingError", "Namespace::Error")
    /([a-z0-9_:.]*Error)\b/i,

    // Database specific errors
    /SQLSTATE\[/i,
    /ORA-\d{5}/i,
    /(Database|Query)\sError/i,
    /mysqli_sql_exception/i,
    /pg_query\(\)/i,
];

/**
 * Common patterns that indicate a warning level log across different languages/frameworks.
 */
const WARN_PATTERNS = [
    /(^|\b|\s)(WARN|WARNING)(\b|\s|:)/i,
    /DeprecationWarning:/i,
];

/**
 * Classifies a raw text log string into one of the severity levels: 'info', 'warn', or 'error'.
 *
 * @param logString - The raw log string to be classified.
 * @returns LogLevel - The determined log level based on regex matching.
 */
export const classifyLog = (logString: string): LogLevel => {
    if (typeof logString !== 'string') return 'info';

    // Check for explicit error patterns first since they are the most critical
    for (const pattern of ERROR_PATTERNS) {
        if (pattern.test(logString)) {
            return "error";
        }
    }

    // Check for warning patterns
    for (const pattern of WARN_PATTERNS) {
        if (pattern.test(logString)) {
            return "warn";
        }
    }

    // Default case if no patterns matched
    return "info";
};
