import { initAuthCreds, BufferJSON, type SignalKeyStore, type AuthenticationCreds, type SignalDataTypeMap } from '@whiskeysockets/baileys';
import type { AuthStrategy } from './AuthStrategy';
import type { AuthStore } from './AuthStore';

export class StoreAuthStrategy implements AuthStrategy {
    constructor(private store: AuthStore) {}

    async getAuthState() {
        const creds = await this.getCreds();
        
        const keys: SignalKeyStore = {
            get: async (type, ids) => {
                const data: { [key: string]: SignalDataTypeMap[typeof type] } = {};
                for (const id of ids) {
                    const key = `${type}-${id}`;
                    const value = await this.store.get(key);
                    if (value) {
                        // Handle buffer deserialization if stored as JSON string
                        const parsed = typeof value === 'string' ? JSON.parse(value, BufferJSON.reviver) : value;
                        data[id] = parsed as SignalDataTypeMap[typeof type];
                    }
                }
                return data;
            },
            set: async (data) => {
                for (const type in data) {
                    const category = data[type as keyof typeof data];
                    for (const id in category) {
                        const key = `${type}-${id}`;
                        const value = category[id];
                        if (value) {
                            // Serialize buffers if needed
                            const storedValue = JSON.stringify(value, BufferJSON.replacer);
                            await this.store.set(key, storedValue);
                        } else {
                            await this.store.delete(key);
                        }
                    }
                }
            }
        };

        return {
            state: {
                creds,
                keys
            },
            saveCreds: () => this.saveCreds(creds)
        };
    }

    async getCreds() {
        const creds = await this.store.get('creds');
        if (creds) {
            return typeof creds === 'string' ? JSON.parse(creds, BufferJSON.reviver) : creds;
        }
        return initAuthCreds();
    }

    async saveCreds(creds: Partial<AuthenticationCreds>) {
        await this.store.set('creds', JSON.stringify(creds, BufferJSON.replacer));
    }

    async getKeys(type: string, ids: string[]) {
        const data: { [key: string]: unknown } = {};
        for (const id of ids) {
            const key = `${type}-${id}`;
            const value = await this.store.get(key);
            if (value) {
                data[id] = typeof value === 'string' ? JSON.parse(value, BufferJSON.reviver) : value;
            }
        }
        return data;
    }

    async setKeys(data: Record<string, Record<string, unknown>>) {
        for (const type in data) {
            const typeData = data[type];
            if (!typeData) continue;
            
            for (const id in typeData) {
                const key = `${type}-${id}`;
                const value = typeData[id];
                if (value) {
                    const storedValue = JSON.stringify(value, BufferJSON.replacer);
                    await this.store.set(key, storedValue);
                } else {
                    await this.store.delete(key);
                }
            }
        }
    }

    async logout() {
        // Clear all data? Or just creds?
        // For now, maybe just delete creds
        await this.store.delete('creds');
    }
}
