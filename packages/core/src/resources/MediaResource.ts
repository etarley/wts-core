import type { IAdapter } from '../core/interfaces';

export class MediaResource {
    constructor(private readonly adapter: IAdapter) {}

    /**
     * Upload media to WhatsApp servers.
     * @param file - The file buffer
     * @param type - The media type
     * @param filename - Optional filename
     * @param mimeType - Optional MIME type
     * @returns The media ID
     */
    async upload(file: Buffer, type: 'image' | 'video' | 'audio' | 'document', filename?: string, mimeType?: string): Promise<{ id: string }> {
        if (this.adapter.mode === 'cloud') {
            return this.adapter.uploadMedia(file, type, filename, mimeType);
        }
        throw new Error('Media upload not supported by this adapter');
    }

    /**
     * Get media metadata (URL, mime_type, sha256) without downloading.
     * @param mediaId - The media ID
     */
    async getUrl(mediaId: string) {
        if (this.adapter.mode === 'cloud') {
            return this.adapter.getMediaUrl(mediaId);
        }
        throw new Error('Getting media URL not supported by this adapter');
    }

    /**
     * Delete media from WhatsApp servers.
     * @param mediaId - The media ID
     */
    async delete(mediaId: string) {
        if (this.adapter.mode === 'cloud') {
            await this.adapter.deleteMedia(mediaId);
        } else {
            throw new Error('Media deletion not supported by this adapter');
        }
    }
}
