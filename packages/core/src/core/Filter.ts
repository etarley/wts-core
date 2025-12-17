import type { Context } from './Context';

export type FilterPredicate = (ctx: Context) => boolean | Promise<boolean>;

export class Filter {
    constructor(private predicate: FilterPredicate) {}

    /**
     * Check if the context matches the filter.
     */
    async check(ctx: Context): Promise<boolean> {
        return this.predicate(ctx);
    }

    /**
     * Combine with another filter using AND logic.
     */
    and(other: Filter): Filter {
        return new Filter(async (ctx) => (await this.check(ctx)) && (await other.check(ctx)));
    }

    /**
     * Combine with another filter using OR logic.
     */
    or(other: Filter): Filter {
        return new Filter(async (ctx) => (await this.check(ctx)) || (await other.check(ctx)));
    }

    /**
     * Negate the filter.
     */
    get not(): Filter {
        return new Filter(async (ctx) => !(await this.check(ctx)));
    }

    // --- Common Filters ---

    /**
     * Filter for text messages.
     */
    static get text(): Filter {
        return new Filter((ctx) => !!ctx.content?.conversation || !!ctx.content?.extendedTextMessage?.text);
    }

    /**
     * Filter for image messages.
     */
    static get image(): Filter {
        return new Filter((ctx) => !!ctx.content?.imageMessage);
    }

    /**
     * Alias for image filter.
     */
    static get photo(): Filter {
        return Filter.image;
    }

    /**
     * Filter for video messages.
     */
    static get video(): Filter {
        return new Filter((ctx) => !!ctx.content?.videoMessage);
    }

    /**
     * Filter for audio messages.
     */
    static get audio(): Filter {
        return new Filter((ctx) => !!ctx.content?.audioMessage);
    }

    /**
     * Filter for document messages.
     */
    static get document(): Filter {
        return new Filter((ctx) => !!ctx.content?.documentMessage);
    }

    /**
     * Filter for sticker messages.
     */
    static get sticker(): Filter {
        return new Filter((ctx) => !!ctx.content?.stickerMessage);
    }

    /**
     * Filter for reaction messages.
     */
    static get reaction(): Filter {
        return new Filter((ctx) => !!ctx.content?.reactionMessage || !!ctx.content?.encReactionMessage);
    }

    /**
     * Filter for location messages.
     */
    static get location(): Filter {
        return new Filter((ctx) => !!ctx.content?.locationMessage);
    }

    /**
     * Filter for contact messages.
     */
    static get contact(): Filter {
        return new Filter((ctx) => !!ctx.content?.contactMessage || !!ctx.content?.contactsArrayMessage);
    }

    /**
     * Filter for messages starting with a specific string (case-insensitive).
     */
    static startsWith(text: string): Filter {
        return new Filter((ctx) => {
            const body = ctx.body?.toLowerCase();
            return !!body && body.startsWith(text.toLowerCase());
        });
    }

    /**
     * Filter for messages containing a specific string (case-insensitive).
     */
    static contains(text: string): Filter {
        return new Filter((ctx) => {
            const body = ctx.body?.toLowerCase();
            return !!body && body.includes(text.toLowerCase());
        });
    }

    /**
     * Filter for messages exactly matching a specific string (case-insensitive).
     */
    static exact(text: string): Filter {
        return new Filter((ctx) => {
            const body = ctx.body?.toLowerCase();
            return !!body && body === text.toLowerCase();
        });
    }

    /**
     * Filter for messages from a specific sender (JID).
     */
    static from(jid: string): Filter {
        return new Filter((ctx) => ctx.from === jid);
    }

    /**
     * Filter for callback queries (button clicks, list selections).
     */
    static get callback(): Filter {
        return new Filter((ctx) => {
             // Check for button response or list response
             const msg = ctx.content;
             return !!msg?.templateButtonReplyMessage || 
                    !!msg?.buttonsResponseMessage || 
                    !!msg?.listResponseMessage ||
                    !!msg?.interactiveResponseMessage;
        });
    }
    
    /**
     * Filter for specific callback data payload.
     */
    static callbackData(data: string): Filter {
         return new Filter((ctx) => {
             // Extract payload from various response types
             const msg = ctx.content;
             let payload: string | undefined;
             
             if (msg?.templateButtonReplyMessage) payload = msg.templateButtonReplyMessage.selectedId || undefined;
             else if (msg?.buttonsResponseMessage) payload = msg.buttonsResponseMessage.selectedButtonId || undefined;
             else if (msg?.listResponseMessage) payload = msg.listResponseMessage.singleSelectReply?.selectedRowId || undefined;
             else if (msg?.interactiveResponseMessage) {
                 try {
                    const json = JSON.parse(msg.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson || '{}');
                    payload = json.id; 
                 } catch { /* ignore */ }
             }

             return payload === data;
         });
    }
}
