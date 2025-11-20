import type { SocketConfig } from '@whiskeysockets/baileys';
import { Context } from './core/Context';
import type { IStore } from './core/Store';

export interface UniversalOptions {
    printQR?: boolean;
    readConfirmations?: boolean;
    authStrategy?: string; 
    phoneNumber?: string;
    socketConfig?: Partial<SocketConfig>;
    /**
     * Optional store for tracking state (contacts, chats, messages)
     */
    store?: IStore;
    cloudApi?: {
        accessToken: string;
        phoneNumberId: string;
        webhookVerifyToken: string;
        port?: number;
    };
}

// Expanded Event Definitions
export type MessageHandler = (ctx: Context) => void | Promise<void>;
export type GroupParticipantHandler = (event: { 
    group: string; 
    participants: string[]; 
    action: 'add' | 'remove' | 'promote' | 'demote' 
}) => void | Promise<void>;

export type EventHandler = MessageHandler | GroupParticipantHandler;

export type Middleware = (ctx: Context, next: () => Promise<void>) => void | Promise<void>;
