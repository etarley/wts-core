import type { IAdapter } from './interfaces';
import { Context } from './Context';
import { proto } from '@whiskeysockets/baileys';
import type { EventHandler, Middleware } from '../types';
import { ChatResource } from '../resources/ChatResource';
import { UserResource } from '../resources/UserResource';
import { ContactResource } from '../resources/ContactResource';
import { GroupResource } from '../resources/GroupResource';
import { StatusResource } from '../resources/StatusResource';
import { NewsletterResource } from '../resources/NewsletterResource';
import { CallResource } from '../resources/CallResource';
import { BusinessResource } from '../resources/BusinessResource';
import { CommunityResource } from '../resources/CommunityResource';
import { PrivacyResource } from '../resources/PrivacyResource';

export class Client {
    public readonly chat: ChatResource;
    public readonly user: UserResource;
    public readonly contacts: ContactResource;
    public readonly group: GroupResource;
    public readonly status: StatusResource;
    public readonly newsletter: NewsletterResource;
    public readonly calls: CallResource;
    public readonly business: BusinessResource;
    public readonly community: CommunityResource;
    public readonly privacy: PrivacyResource;

    private middlewares: Middleware[] = [];
    // We use Function here because we store handlers with different signatures
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    private eventHandlers: Map<string, Function[]> = new Map();

    constructor(private readonly adapter: IAdapter) {
        this.chat = new ChatResource(adapter);
        this.user = new UserResource(adapter);
        this.contacts = new ContactResource(adapter);
        this.group = new GroupResource(adapter);
        this.status = new StatusResource(adapter);
        this.newsletter = new NewsletterResource(adapter);
        this.calls = new CallResource(adapter);
        this.business = new BusinessResource(adapter);
        this.community = new CommunityResource(adapter);
        this.privacy = new PrivacyResource(adapter);

        // Forward ready event
        this.adapter.on('ready', () => this.emit('ready'));

        // Handle incoming messages
        this.adapter.on('message', (data) => {
            if (data && typeof data === 'object' && 'key' in data) {
                const msg = data as proto.IWebMessageInfo;
                const ctx = new Context(msg, this.adapter, this);
                this.handleMiddlewareAndEvents(ctx);
            }
        });
        
        // Handle group events
        this.adapter.on('group-participants', (data) => this.emit('group-participants', data));
    }

    private messageHandlers: EventHandler[] = [];

    /**
     * Connect to WhatsApp
     */
    async connect() {
        await this.adapter.connect();
    }

    /**
     * Listen for events
     */
    on(event: 'message', handler: EventHandler): void;
    on(event: 'group-participants', handler: (data: { group: string; participants: string[]; action: string }) => void): void;
    on(event: 'ready', handler: () => void): void;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    on(event: string, handler: Function): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)?.push(handler);
    }

    private emit(event: string, ...args: unknown[]) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(fn => fn(...args));
        }
    }

    /**
     * Register a middleware
     */
    use(fn: Middleware) {
        this.middlewares.push(fn);
    }

    /**
     * Execute all registered handlers with middleware
     */
    private async handleMiddlewareAndEvents(ctx: Context): Promise<void> {
        let index = -1;

        const dispatch = async (i: number): Promise<void> => {
            if (i <= index) throw new Error('next() called multiple times');
            index = i;
            
            let fn: Middleware | undefined;

            if (i === this.middlewares.length) {
                // Middleware done, fire message handlers
                fn = async (context) => {
                    this.emit('message', context);
                };
            } else {
                fn = this.middlewares[i];
            }
            
            if (!fn) return;

            try {
                await fn(ctx, dispatch.bind(null, i + 1));
            } catch (err) {
                console.error('Middleware error:', err);
            }
        }

        await dispatch(0);
    }
}