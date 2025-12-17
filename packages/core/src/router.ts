import type { Handler, Middleware, Env, FilterFn, Next } from './types';
import type { Context } from './core/Context';
import { Filter } from './core/Filter';
import { compose } from './compose';

export class Router<E extends Env = Env> {
    protected middlewares: Middleware<E>[] = [];
    protected commandHandlers: Map<string, Handler<E>[]> = new Map();
    protected patternHandlers: Map<RegExp, Handler<E>[]> = new Map();
    protected filterHandlers: { filter: FilterFn<E> | Filter, handlers: Handler<E>[] }[] = [];

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
    on(filter: FilterFn<E> | Filter, ...handlers: Handler<E>[]) {
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
     * Handle generic text messages (that aren't commands)
     */
    text(...handlers: Handler<E>[]) {
        return this.on(Filter.text, ...handlers);
    }

    /**
     * Handle image messages
     */
    image(...handlers: Handler<E>[]) {
        return this.on(Filter.image, ...handlers);
    }

    /**
     * Handle audio/voice messages
     */
    audio(...handlers: Handler<E>[]) {
        return this.on(Filter.audio, ...handlers);
    }

    /**
     * Handle video messages
     */
    video(...handlers: Handler<E>[]) {
        return this.on(Filter.video, ...handlers);
    }

    /**
     * Handle reaction messages
     */
    reaction(...handlers: Handler<E>[]) {
        return this.on(Filter.reaction, ...handlers);
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
    route(router: Router<E>): this;
    route(prefix: string, router: Router<E>): this;
    route(predicate: FilterFn<E>, router: Router<E>): this;
    route(arg1: string | Router<E> | FilterFn<E>, arg2?: Router<E>): this {
        const router = arg2 || (arg1 as Router<E>);
        
        // 1. Handle String Prefix (Existing Logic)
        if (typeof arg1 === 'string') {
             const prefix = arg1;
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

        // 2. Handle Predicate Filter (NEW LOGIC)
        if (typeof arg1 === 'function') {
            const predicate = arg1 as FilterFn<E>;
            
            // Wrap every handler from the sub-router in the predicate
            const applyPredicate = (handlers: Handler<E>[]) => {
                return [async (ctx: Context<E>, next: Next) => {
                    if (await predicate(ctx)) {
                        // If predicate matches, run the real handlers
                        await compose(handlers)(ctx, next);
                    } else {
                        // Otherwise skip this entire sub-router
                        await next();
                    }
                }];
            };

            // Merge Middlewares (Wrapped)
            if (router.middlewares.length > 0) {
                this.middlewares.push(...applyPredicate(router.middlewares));
            }

            // Merge Filter Handlers (Wrapped)
            for (const { filter, handlers } of router.filterHandlers) {
                this.filterHandlers.push({ 
                    // Combine parent predicate AND child filter
                    filter: async (ctx) => (await predicate(ctx)) && (filter instanceof Filter ? await filter.check(ctx as unknown as Context) : await filter(ctx)), 
                    handlers 
                });
            }

            // Merge Command Handlers (Wrapped)
            // We wrap these in a general filter because command matching happens inside getRouteHandlers
            for (const [cmd, handlers] of router.commandHandlers) {
                // We can't easily wrap command handlers in the map because the key is the command string.
                // Instead, we add them as filter handlers where the filter is (predicate AND command match)
                // But wait, getRouteHandlers checks commands FIRST.
                // If we want to support scoped commands, we should probably add them as filter handlers?
                // Or we can add them to this.commandHandlers but wrap the handlers?
                // If we add to commandHandlers, the command matches, then the handler runs.
                // The handler checks the predicate.
                
                // Yes, wrapping the handlers is the correct approach for commands.
                this.commandHandlers.set(cmd, applyPredicate(handlers));
            }
            
            // Merge Pattern Handlers (Wrapped)
            for (const [pattern, handlers] of router.patternHandlers) {
                this.patternHandlers.set(pattern, applyPredicate(handlers));
            }
            
            return this;
        }

        // 3. Handle Simple Merge (Existing Logic for `route(router)`)
        // Merge Middlewares
        this.middlewares.push(...router.middlewares);

        // Merge Commands
        for (const [cmd, handlers] of router.commandHandlers) {
            this.commandHandlers.set(cmd, handlers);
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
                const isMatch = filter instanceof Filter ? await filter.check(ctx as unknown as Context) : await filter(ctx);
                if (isMatch) {
                    routeHandlers = handlers;
                    break;
                }
            }
        }

        return routeHandlers;
    }
}
