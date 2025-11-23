import type { IAdapter, CloudAdapterInterface, FlowRequestData, FlowResponseData, AdapterCapabilities } from './interfaces';
import { Context } from './Context';
import { proto } from '@whiskeysockets/baileys';
import type { Env, ExecutionContext, Handler, WtsPlugin, InferPluginAPI, FilterFn, ClientEvents } from '../types';
import type { IStore } from './Store';
import { Router } from '../router';
import { compose } from '../compose';
import { BaseBot } from './Bot';

// Core Resources
import { ChatResource } from '../resources/ChatResource';
import { UserResource } from '../resources/UserResource';
import { ContactResource } from '../resources/ContactResource';
import { BusinessResource } from '../resources/BusinessResource';
import { CommerceResource } from '../resources/CommerceResource';
import { MediaResource } from '../resources/MediaResource';
import { QRResource } from '../resources/QRResource';
import { FlowsResource } from '../resources/FlowsResource';
import { GroupsResource } from '../resources/GroupsResource';

export class Client<E extends Env = Env, P extends WtsPlugin[] = WtsPlugin[], A extends IAdapter = IAdapter> extends Router<E> {
    // --- Core Resources (Always Available) ---
    public readonly chat: ChatResource;
    public readonly user: UserResource;
    public readonly contacts: ContactResource;
    public readonly business: BusinessResource;
    public readonly commerce: CommerceResource;
    public readonly media: MediaResource;
    public readonly qr: QRResource;
    public readonly flows: FlowsResource;
    public readonly groups: GroupsResource;

    public store?: IStore;

    private eventHandlers: Map<string, ((...args: unknown[]) => void)[]> = new Map();
    private errorHandler: ((err: Error, ctx: Context<E>) => void) | null = null;
    private bots: BaseBot<E>[] = [];

    // This property allows TypeScript to infer plugin methods on the client instance
    public $Infer!: InferPluginAPI<P>;

    /**
     * Casts the client to a specific Environment type.
     * Useful when you want to specify the Env type but let TypeScript infer the Plugin types.
     * 
     * @example
     * const client = createClient({ plugins: [chat()] }).env<MyEnv>();
     */
    public env<NewE extends Env>(): Client<NewE, P, A> & InferPluginAPI<P> {
        return this as unknown as Client<NewE, P, A> & InferPluginAPI<P>;
    }

    constructor(public readonly adapter: A, plugins?: P) {
        super();
        // console.log(`wts-core v${VERSION}`);

        // Initialize Core Resources
        this.chat = new ChatResource(adapter);
        this.user = new UserResource(adapter);
        this.contacts = new ContactResource(adapter);
        this.business = new BusinessResource(adapter);
        this.commerce = new CommerceResource(adapter);
        this.media = new MediaResource(adapter);
        this.qr = new QRResource(adapter);
        this.flows = new FlowsResource(adapter);
        this.groups = new GroupsResource(adapter);

        // Forward adapter events
        this.adapter.on('ready', () => this.emit('ready'));
        this.adapter.on('message', (data: unknown, env: unknown, ctx: unknown) => {
            if (data && typeof data === 'object' && 'key' in data) {
                const msg = data as proto.IWebMessageInfo;
                const context = new Context<E>(
                    msg,
                    this.adapter,
                    this as unknown as Client<E>,
                    ctx as ExecutionContext | undefined,
                    env as E['Bindings'] | undefined
                );
                this.handleMiddlewareAndEvents(context);
            }
        });

        // Forward other adapter events
        const eventsToForward = [
            'group-participants',
            'call',
            'group.join_request',
            'message.status',
            'chat.update',
            'qr',
            'pairing-code'
        ];

        for (const event of eventsToForward) {
            this.adapter.on(event, (...args) => this.emit(event as keyof ClientEvents<E>, ...args));
        }

        // --- Plugin Initialization ---
        if (plugins) {
            for (const plugin of plugins) {
                if (plugin.init) {
                    plugin.init(this as unknown as Client);
                }
                if (plugin.api) {
                    const api = plugin.api(this as unknown as Client);
                    Object.assign(this, api);
                }
            }
        }
    }

    public get handler() {
        return this.adapter.handleWebhook.bind(this.adapter);
    }

    public get flowHandler() {
        if (this.adapter.mode === 'cloud') {
            const cloudAdapter = this.adapter as unknown as CloudAdapterInterface;
            return cloudAdapter.handleFlowRequest.bind(cloudAdapter);
        }
        throw new Error("Flows are only supported in Cloud API mode");
    }

    onFlowRequest(handler: (data: FlowRequestData) => Promise<FlowResponseData>) {
        if (this.adapter.mode === 'cloud') {
            const cloudAdapter = this.adapter as unknown as CloudAdapterInterface;
            cloudAdapter.onFlowRequest = handler;
        } else {
            console.warn("onFlowRequest is only supported in Cloud API mode");
        }
    }

    public get raw() {
        return this.adapter.raw;
    }

    public supports(capability: keyof AdapterCapabilities): boolean {
        const caps = this.adapter.capabilities;
        return !!caps && caps[capability] === true;
    }

    /**
     * Starts the client.
     * - If using Baileys: Connects to the WebSocket.
     * - If using Cloud: Starts a standalone HTTP server (Node/Bun).
     * 
     * @param config Configuration for the server (only used in Cloud mode)
     */
    async start(config?: { port?: number; webhookPath?: string }): Promise<void> {
        if (this.adapter.mode === 'baileys') {
            await this.adapter.connect();
        } else if (this.adapter.mode === 'cloud') {
            const cloudAdapter = this.adapter as unknown as CloudAdapterInterface;
            await cloudAdapter.listen(config?.port, config?.webhookPath);
        }
    }

    async connect() {
        await this.adapter.connect();
    }

    async disconnect() {
        await this.adapter.disconnect();
    }

    /**
     * Register a handler with a custom filter (Router)
     */
    override on(filter: FilterFn<E>, ...handlers: Handler<E>[]): this;
    
    /**
     * Register an event handler (EventEmitter)
     */
    override on<K extends keyof ClientEvents<E>>(
        event: K,
        handler: (payload: ClientEvents<E>[K]) => void | Promise<void>
    ): this;

    override on(arg1: FilterFn<E> | string, ...args: unknown[]): this {
        // 1. Event Emitter Logic (if arg1 is string)
        if (typeof arg1 === 'string') {
            const handler = args[0] as (...args: unknown[]) => void;
            if (!this.eventHandlers.has(arg1)) {
                this.eventHandlers.set(arg1, []);
            }
            this.eventHandlers.get(arg1)?.push(handler);
            return this;
        }

        // 2. Router Logic (if arg1 is filter function)
        // We must call super.on() but since we can't easily call super.on with spread args in strict TS without casting,
        // we'll just delegate to the Router implementation.
        // However, `super.on` is available.
        return super.on(arg1, ...(args as Handler<E>[]));
    }

    off<K extends keyof ClientEvents<E>>(
        event: K,
        handler: (payload: ClientEvents<E>[K]) => void | Promise<void>
    ): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler as unknown as (...args: unknown[]) => void);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    waitFor<T = Context<E>>(
        event: keyof ClientEvents<E>,
        predicate: (ctx: T) => boolean,
        timeoutMs: number = 60000
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.off(event, listener as unknown as (payload: ClientEvents<E>[typeof event]) => void);
                reject(new Error("Wait for event timed out"));
            }, timeoutMs);

            const listener = (...args: unknown[]) => {
                const ctx = args[0] as T;
                if (predicate(ctx)) {
                    clearTimeout(timer);
                    this.off(event, listener as unknown as (payload: ClientEvents<E>[typeof event]) => void);
                    resolve(ctx);
                }
            };

            this.on(event, listener as unknown as (payload: ClientEvents<E>[typeof event]) => void);
        });
    }

    private emit<K extends keyof ClientEvents<E>>(event: K, ...args: unknown[]) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            [...handlers].forEach(fn => fn(...args));
        }
    }

    onError(handler: (err: Error, ctx: Context<E>) => void) {
        this.errorHandler = handler;
    }

    useBot(bot: BaseBot<E>) {
        this.bots.push(bot);
        return this;
    }

    private async handleMiddlewareAndEvents(ctx: Context<E>): Promise<void> {
        const routeHandlers = await this.getRouteHandlers(ctx);
        const allHandlers = [...this.middlewares];

        if (routeHandlers.length > 0) {
            allHandlers.push(...routeHandlers);
        } else {
            let botHandler: Handler<E> | undefined;
            for (const bot of this.bots) {
                if (await bot.shouldTrigger(ctx)) {
                    botHandler = async (c: Context<E>) => bot.handle(c);
                    break;
                }
            }

            if (botHandler) {
                allHandlers.push(botHandler);
            } else {
                allHandlers.push(async (c, next) => {
                    this.emit('message', c);
                    await next();
                });
            }
        }

        const finalDispatch = compose<E>(
            allHandlers,
            this.errorHandler || undefined
        );

        await finalDispatch(ctx);
    }
}
