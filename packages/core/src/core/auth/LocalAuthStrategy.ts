import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import type { AuthStrategy } from './AuthStrategy';

export class LocalAuthStrategy implements AuthStrategy {
    private dataPath: string;

    constructor(dataPath: string) {
        this.dataPath = dataPath;
    }

    async getAuthState() {
        const { state, saveCreds } = await useMultiFileAuthState(this.dataPath);
        return { state, saveCreds };
    }

    // These methods are proxies to the underlying Baileys auth state
    // In a real implementation, we might need to expose them differently
    // but for now, getAuthState is the primary consumer.
    async getCreds() {
        const { state } = await useMultiFileAuthState(this.dataPath);
        return state.creds;
    }

    async saveCreds() {
        // This is handled by the saveCreds function returned by useMultiFileAuthState
        // We might not need to implement this directly if we use getAuthState
        return Promise.resolve();
    }

    async getKeys(type: string, ids: string[]) {
        void type; void ids;
        // This is handled by the state object
        return {};
    }

    async setKeys(data: Record<string, Record<string, unknown>>) {
        void data;
        // This is handled by the state object
        return Promise.resolve();
    }
}
