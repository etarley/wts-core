import type { SocketConfig } from '@whiskeysockets/baileys';
import { Context } from './core/Context';

/**
 * Configuration for the Universal Client
 */
export interface UniversalOptions {
    /**
     * If true, prints the QR code to the terminal in Baileys mode.
     * @default true
     */
    printQR?: boolean;

    /**
     * If true, automatically marks incoming messages as read.
     * @default false
     */
    readConfirmations?: boolean;

    /**
     * BAILEYS CONFIGURATION
     * If authStrategy is provided, the SDK defaults to Baileys mode.
     */
    authStrategy?: string; // Path to session folder
    
    /**
     * Advanced socket configuration for Baileys
     */
    socketConfig?: Partial<SocketConfig>;

    /**
     * CLOUD API CONFIGURATION
     * Providing this switches the SDK to Cloud Mode (Future implementation)
     */
    cloudApi?: {
        accessToken: string;
        phoneNumberId: string;
        webhookVerifyToken: string;
        port?: number;
    };
}

export type EventHandler = (ctx: Context) => void | Promise<void>;
