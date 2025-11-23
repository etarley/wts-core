import type { AuthenticationCreds, SignalKeyStore } from '@whiskeysockets/baileys';

export interface AuthStrategy {
    getCreds: () => Promise<AuthenticationCreds>;
    saveCreds: (creds: Partial<AuthenticationCreds>) => Promise<void>;
    getKeys: (type: string, ids: string[]) => Promise<{ [id: string]: unknown }>;
    setKeys: (data: Record<string, Record<string, unknown>>) => Promise<void>;
    logout?: () => Promise<void>;
    /**
     * Returns the state object required by makeWASocket
     */
    getAuthState: () => Promise<{
        state: {
            creds: AuthenticationCreds;
            keys: SignalKeyStore;
        };
        saveCreds: () => Promise<void>;
    }>;
}
