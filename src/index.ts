
import { Client } from './core/Client';
import { BaileysAdapter } from './adapters/bailey/BaileysAdapter';
import type { UniversalOptions } from './types';

/**
 * Create a new Universal WhatsApp Client.
 * 
 * This factory function automatically selects the best adapter based on your config:
 * - If `cloudApi` keys are present -> Uses Official Cloud API (HTTP/Webhook)
 * - Otherwise -> Uses Baileys (WebSocket/TCP)
 * 
 * @param options - Configuration for Auth, Logging, and Adapter settings
 */
export const createClient = (options: UniversalOptions = {}) => {
    // 1. Detect Adapter Mode
    // In the future, we will check for options.cloudApi here.
    // const isCloud = !!options.cloudApi; 

    // For now, we default to Baileys as it's the only implemented adapter.
    const adapter = new BaileysAdapter(options);

    // 2. Initialize the Core Client with the chosen Adapter
    return new Client(adapter);
};

// Export Types for the end user
export * from './core/Client';
export * from './core/Context';
export * from './resources/ChatResource';
export * from './resources/UserResource';
export * from './resources/ContactResource';
export * from './resources/GroupResource';
export * from './resources/StatusResource';
export { NewsletterResource } from './resources/NewsletterResource';
export { CallResource } from './resources/CallResource';
export { BusinessResource } from './resources/BusinessResource';
export { CommunityResource } from './resources/CommunityResource';
export { PrivacyResource } from './resources/PrivacyResource';
export * from './core/Media';
export * from './core/Store';
export * from './types';