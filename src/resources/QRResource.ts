import type { IAdapter } from '../core/interfaces';

export class QRResource {
    constructor(private readonly adapter: IAdapter) {}

    /**
     * Create a new QR code.
     * @param message - The prefilled message
     * @param format - Image format ('png' or 'svg')
     */
    async create(message: string, format: 'png' | 'svg' = 'png') {
        if (this.adapter.mode === 'cloud') {
            return this.adapter.qrCreate(message, format);
        }
        throw new Error('QR code creation not supported by this adapter');
    }

    /**
     * List all QR codes.
     */
    async list() {
        if (this.adapter.mode === 'cloud') {
            return this.adapter.qrList();
        }
        throw new Error('Listing QR codes not supported by this adapter');
    }

    /**
     * Get a single QR code.
     * @param codeId - The QR code ID
     */
    async get(codeId: string) {
        if (this.adapter.mode === 'cloud') {
            return this.adapter.qrGet(codeId);
        }
        throw new Error('Getting QR code not supported by this adapter');
    }

    /**
     * Update a QR code.
     * @param code - The QR code ID
     * @param message - The new prefilled message
     */
    async update(code: string, message: string) {
        if (this.adapter.mode === 'cloud') {
            return this.adapter.qrUpdate(code, message);
        }
        throw new Error('QR code update not supported by this adapter');
    }

    /**
     * Delete a QR code.
     * @param code - The QR code ID
     */
    async delete(code: string) {
        if (this.adapter.mode === 'cloud') {
            await this.adapter.qrDelete(code);
        } else {
            throw new Error('QR code deletion not supported by this adapter');
        }
    }
}
