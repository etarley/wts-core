import type { Handler, Middleware, Env, FilterFn } from './types';
import type { Context } from './core/Context';
import { compose } from './compose';

export class Router<E extends Env = Env> {
    protected middlewares: Middleware<E>[] = [];
    protected commandHandlers: Map<string, Handler<E>[]> = new Map();
    protected patternHandlers: Map<RegExp, Handler<E>[]> = new Map();
    protected filterHandlers: { filter: FilterFn<E>, handlers: Handler<E>[] }[] = [];

    /**
     * Register a middleware
     */
    use(...middleware: Middleware<E>[]) {
        this.middlewares.push(...middleware);
        return this;
    }

    /**
     * Register a handler with a custom filter
     */
    on(filter: FilterFn<E>, ...handlers: Handler<E>[]) {
        this.filterHandlers.push({ filter, handlers });
        return this;
    }

    /**
     * Register a command handler (exact match)
     */
    command(command: string, ...handlers: Handler<E>[]) {
        this.commandHandlers.set(command, handlers);
        return this;
    }

    /**
     * Register a pattern handler (regex match)
     */
    hear(pattern: RegExp, ...handlers: Handler<E>[]) {
        this.patternHandlers.set(pattern, handlers);
        return this;
    }

    /**
     * Mount another router (sub-app pattern).
     * 
     * @example
     * // Without prefix - merges all routes
     * const adminRouter = new Router();
     * adminRouter.command('ban', ...);
     * client.route(adminRouter);
     * 
     * @example
     * // With prefix - prefixes all commands
     * const adminRouter = new Router();
     * adminRouter.command('ban', ...); // becomes "admin ban"
     * client.route('admin', adminRouter);
     */
    route(router: Router<E>): this;
    route(prefix: string, router: Router<E>): this;
    route(arg1: string | Router<E>, arg2?: Router<E>): this {
        const router = arg2 || (arg1 as Router<E>);
        const prefix = typeof arg1 === 'string' ? arg1 : '';

        // Merge Middlewares
        this.middlewares.push(...router.middlewares);

        // Merge Commands (with prefix if exists)
        for (const [cmd, handlers] of router.commandHandlers) {
            const newCmd = prefix ? `${prefix} ${cmd}` : cmd;
            this.commandHandlers.set(newCmd, handlers);
        }

        // Merge Patterns
        for (const [pattern, handlers] of router.patternHandlers) {
            this.patternHandlers.set(pattern, handlers);
        }

        // Merge Filters
        for (const { filter, handlers } of router.filterHandlers) {
            this.filterHandlers.push({ filter, handlers });
        }
        
        return this;
    }

    /**
     * Match and return the composed handler for a given context
     */
    async match(ctx: Context<E>): Promise<Handler<E> | undefined> {
        const routeHandlers = await this.getRouteHandlers(ctx);
        
        // If no route matched, but we have middleware, we still return the middleware chain
        // The caller (Client) might want to add a 404 handler at the end if nothing matched.
        
        const allHandlers = [...this.middlewares, ...routeHandlers];
        if (allHandlers.length === 0) return undefined;

        // We don't pass onError/onNotFound here because that's handled at the Client level
        return compose(allHandlers);
    }

    /**
     * Find the route handlers for a given context (ignoring middleware)
     */
    protected async getRouteHandlers(ctx: Context<E>): Promise<Handler<E>[]> {
        const text = ctx.body.trim();
        let routeHandlers: Handler<E>[] = [];

        // 1. Check Commands (try to match longest command first)
        // This allows "admin ban" to match before "admin"
        const commandKeys = Array.from(this.commandHandlers.keys()).sort((a, b) => b.length - a.length);
        for (const cmd of commandKeys) {
            if (text === cmd || text.startsWith(cmd + ' ')) {
                routeHandlers = this.commandHandlers.get(cmd)!;
                break;
            }
        }
        
        // 2. Check Patterns (if no command matched)
        if (routeHandlers.length === 0) {
            for (const [pattern, handlers] of this.patternHandlers) {
                if (pattern.test(text)) {
                    routeHandlers = handlers;
                    break;
                }
            }
        }

        // 3. Check Filters
        if (routeHandlers.length === 0) {
            for (const { filter, handlers } of this.filterHandlers) {
                if (await filter(ctx)) {
                    routeHandlers = handlers;
                    break;
                }
            }
        }

        return routeHandlers;
    }
}
