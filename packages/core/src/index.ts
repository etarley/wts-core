import { Client } from './core/Client';
import { BaileysAdapter } from './adapters/bailey/BaileysAdapter';
import { CloudAdapter } from './adapters/cloud/CloudAdapter';
import { Store } from './core/Store';
import type { UniversalOptions, WtsPlugin, Env, InferPluginAPI } from './types';
import type { BaileysAdapterInterface, CloudAdapterInterface } from './core/interfaces';

// Overloads for createClient to return specific client types
export function createClient<E extends Env = Env, P extends WtsPlugin[] = []>(
    options: UniversalOptions<P> & { cloudApi: NonNullable<UniversalOptions['cloudApi']> }
): Client<E, P, CloudAdapterInterface> & InferPluginAPI<P>;

export function createClient<E extends Env = Env, P extends WtsPlugin[] = []>(
    options?: UniversalOptions<P> & { cloudApi?: undefined }
): Client<E, P, BaileysAdapterInterface> & InferPluginAPI<P>;

export function createClient<E extends Env = Env, P extends WtsPlugin[] = []>(
    options: UniversalOptions<P> = {} as UniversalOptions<P>
) {
    // 1. Detect Adapter Mode
    let adapter;

    // This runtime check aligns with the overloads
    if (options.cloudApi) {
        adapter = new CloudAdapter(options);
    } else {
        adapter = new BaileysAdapter(options);
    }

    // 2. Initialize the Core Client with the chosen Adapter
    const client = new Client<E, P>(adapter, options, options.plugins);

    // 3. Bind Store (Default to MemoryStore if not provided)
    if (options.store) {
        client.store = options.store;
    } else {
        client.store = new Store();
    }

    // 4. Bind Store to Adapter Events (messages.upsert, etc.)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.store!.bind(adapter as any);

    return client as unknown as Client<E, P, CloudAdapterInterface | BaileysAdapterInterface> & InferPluginAPI<P>;
}

// Export Types for the end user
export * from './core/Client';
export * from './core/Context';
export * from './core/interfaces'; // Make sure interfaces are exported

// Export Plugins
export * from './plugins/chat';
export * from './plugins/user';
export * from './plugins/contact';
export * from './plugins/group';
export * from './plugins/status';
export * from './plugins/newsletter';
export * from './plugins/call';
export * from './plugins/business';
export * from './plugins/community';
export * from './plugins/privacy';
export * from './plugins/templates';
export * from './plugins/flows';
export * from './plugins/broadcast';
export * from './plugins/business-settings';

export * from './core/Media';
export * from './core/Store';
export * from './types';
export * from './core/auth/AuthStrategy';
export * from './core/auth/AuthStore';
export * from './core/auth/LocalAuthStrategy';
export * from './core/auth/StoreAuthStrategy';
export * from './core/Bot';
export * from './core/SessionManager';

export * from './middleware/session';
export * from './middleware/acl';

export * from './core/storage/types';
export * from './core/storage/MemoryAdapter';
export * from './core/storage/JSONFileAdapter';
export * from './core/storage/kv-storage-adapter';

export * from './adapters/storage/BetterSQLite3Adapter';
export * from './adapters/storage/BunSQLiteAdapter';
export * from './adapters/storage/LibSQLAdapter';

export * from './middleware/error-boundary';
export * from './utils/StickerFormatter';

export * from './plugins/AntiDeletePlugin';
export * from './plugins/WelcomePlugin';
export * from './plugins/LoggerPlugin';

import * as FlowBuilder from './builders/FlowBuilder';
export { FlowBuilder };
export * from './builders/TemplateBuilder';

export * from './jsx';

export * from './utils/FlowResponse';
export * from './utils/VCardBuilder';

export { Router } from './router';
export { Filter as filters } from './core/Filter';
