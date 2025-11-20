/**
 * A lightweight, zero-dependency logger that mimics Pino's interface.
 * Compatible with Edge runtimes (Cloudflare Workers, Bun, Deno).
 */
export const createLogger = (level: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent' = 'info') => {
    const levels = {
        silent: 0,
        fatal: 10,
        error: 20,
        warn: 30,
        info: 40,
        debug: 50,
        trace: 60,
    };

    const currentLevel = levels[level];

    const shouldLog = (lvl: keyof typeof levels) => currentLevel >= levels[lvl] && currentLevel > 0;

    // Baileys expects a specific signature for log methods
    const log = (method: 'error' | 'warn' | 'info' | 'log') => (obj: unknown, msg?: string) => {
        if (!shouldLog(method === 'log' ? 'debug' : method as any)) return;

        if (typeof obj === 'string') {
            console[method](obj);
        } else if (msg) {
            console[method](msg, obj);
        } else {
            console[method](obj);
        }
    };

    return {
        level,
        fatal: log('error'),
        error: log('error'),
        warn: log('warn'),
        info: log('info'),
        debug: log('log'),
        trace: log('log'),
        // Baileys calls .child() to create sub-loggers
        child: () => createLogger(level),
    };
};
