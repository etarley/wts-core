import { readFile } from 'fs/promises';
import { type AnyMessageContent } from '@whiskeysockets/baileys';

export class Media {
    /**
     * Create a media object from a URL
     */
    static async fromUrl(url: string): Promise<AnyMessageContent> {
        return {
            image: { url }, // Baileys handles URL automatically for image/video if passed as url
            // But for generic media, we might want to fetch it first if we want to send as buffer
            // For now, let's rely on Baileys URL support which is robust
        };
    }

    /**
     * Create a media object from a local file path
     */
    static async fromFile(path: string): Promise<AnyMessageContent> {
        const buffer = await readFile(path);
        // We assume image for now, but we should probably detect type or allow specifying
        // Since the user example was await ctx.reply(await Media.fromFile('./image.png'));
        // We return an object that ctx.reply can handle.
        return {
            image: buffer
        };
    }

    /**
     * Create a media object from a buffer
     */
    static fromBuffer(buffer: Buffer): AnyMessageContent {
        return {
            image: buffer
        };
    }
}
