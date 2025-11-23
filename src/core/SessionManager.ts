import { Client } from './Client';
import { BaileysAdapter } from '../adapters/bailey/BaileysAdapter';
import { CloudAdapter } from '../adapters/cloud/CloudAdapter';
import type { UniversalOptions } from '../types';

export class SessionManager {
    private sessions: Map<string, Client> = new Map();

    constructor() {}

    /**
     * Create or get a session
     */
    async create(id: string, options: UniversalOptions): Promise<Client> {
        if (this.sessions.has(id)) {
            return this.sessions.get(id)!;
        }

        let adapter;
        if (options.cloudApi) {
             adapter = new CloudAdapter(options);
        } else {
             adapter = new BaileysAdapter(options);
        }

        const client = new Client(adapter);
        this.sessions.set(id, client);
        
        await client.connect();
        return client;
    }

    /**
     * Get an existing session
     */
    get(id: string): Client | undefined {
        return this.sessions.get(id);
    }

    /**
     * Stop a session
     */
    async stop(id: string): Promise<void> {
        const client = this.sessions.get(id);
        if (client) {
            await client.disconnect();
            this.sessions.delete(id);
        }
    }

    /**
     * Get all active session IDs
     */
    list(): string[] {
        return Array.from(this.sessions.keys());
    }
}
