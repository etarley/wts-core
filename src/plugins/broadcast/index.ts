import type { WtsPlugin } from '../../types';
import type { Client } from '../../core/Client';
import type { AnyMessageContent } from '@whiskeysockets/baileys';

export const broadcast = () => {
    return {
        id: "broadcast",
        api: (client: Client) => ({
            broadcast: {
                /**
                 * Send a message to multiple recipients with a delay between each message to avoid rate limits.
                 * @param jids Array of JIDs to send to
                 * @param content Message content (string or AnyMessageContent)
                 * @param options Configuration options
                 */
                async send(
                    jids: string[], 
                    content: string | AnyMessageContent, 
                    options: { 
                        delay?: number; // Delay in ms (default 1000)
                        onProgress?: (jid: string, index: number, total: number) => void;
                    } = {}
                ) {
                    const delay = options.delay ?? 1000;
                    const total = jids.length;
                    const payload = typeof content === 'string' ? { text: content } : content;
                    
                    const results: { jid: string; success: boolean; error?: unknown }[] = [];

                    for (let i = 0; i < total; i++) {
                        const jid = jids[i];
                        if (!jid) continue;
                        
                        try {
                            await client.adapter.sendMessage(jid, payload);
                            if (options.onProgress) options.onProgress(jid, i + 1, total);
                            results.push({ jid, success: true });
                        } catch (error) {
                            console.error(`Failed to send broadcast to ${jid}:`, error);
                            results.push({ jid, success: false, error });
                        }

                        if (i < total - 1 && delay > 0) {
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                    
                    return results;
                }
            }
        })
    } satisfies WtsPlugin;
};




