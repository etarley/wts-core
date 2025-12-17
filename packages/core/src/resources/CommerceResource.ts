import type { IAdapter } from '../core/interfaces';
import type { ProductCreate, ProductUpdate, proto } from '@whiskeysockets/baileys';

export class CommerceResource {
    constructor(private readonly adapter: IAdapter) {}

    /**
     * Get the business catalog.
     * @param jid - The business JID (usually the bot's own JID for its catalog)
     * @param limit - Number of items to retrieve
     */
    async getCatalog(jid: string, limit?: number) {
        return this.adapter.businessGetCatalog(jid, limit);
    }

    /**
     * Create a product in the catalog.
     * @param product - The product details
     */
    async addProduct(product: ProductCreate) {
        return this.adapter.businessProductCreate(product);
    }

    /**
     * Update a product in the catalog.
     * @param productId - The product ID
     * @param update - The updates to apply
     */
    async updateProduct(productId: string, update: ProductUpdate) {
        return this.adapter.businessProductUpdate(productId, update);
    }

    /**
     * Delete products from the catalog.
     * @param productIds - Array of product IDs to delete
     */
    async deleteProducts(productIds: string[]) {
        return this.adapter.businessProductDelete(productIds);
    }

    /**
     * Get details of an order.
     * @param orderId - The order ID
     * @param token - The token provided in the order message
     */
    async getOrderDetails(orderId: string, token: string) {
        if (this.adapter.mode === 'cloud') {
            return this.adapter.businessGetOrderDetails(orderId, token);
        }
        throw new Error('Order details only supported on Cloud API');
    }

    /**
     * Get commerce settings (cart enabled, catalog visible).
     */
    async getSettings() {
        if (this.adapter.mode === 'cloud') {
            return this.adapter.getCommerceSettings();
        }
        throw new Error('Commerce settings only supported on Cloud API');
    }

    /**
     * Update commerce settings.
     * @param isCartEnabled - Whether the cart is enabled
     * @param isCatalogVisible - Whether the catalog is visible
     */
    async updateSettings(isCartEnabled: boolean, isCatalogVisible: boolean) {
        if (this.adapter.mode === 'cloud') {
            return this.adapter.updateCommerceSettings(isCartEnabled, isCatalogVisible);
        }
        throw new Error('Commerce settings only supported on Cloud API');
    }

    /**
     * Send a single product message.
     * @param jid - The recipient JID
     * @param catalogId - The catalog ID
     * @param productId - The product ID
     * @param text - Optional body text
     */
    async sendProduct(jid: string, catalogId: string, productId: string, text?: string): Promise<proto.IWebMessageInfo | undefined> {
        if (this.adapter.mode === 'cloud') {
            return this.adapter.sendProduct(jid, catalogId, productId, text);
        }
        throw new Error('Sending product messages not supported by this adapter');
    }

    /**
     * Send a multi-product message (collection).
     * @param jid - The recipient JID
     * @param catalogId - The catalog ID
     * @param sections - Sections containing product IDs
     * @param text - Body text
     * @param header - Optional header text
     */
    async sendMultiProduct(jid: string, catalogId: string, sections: { title: string; productIds: string[] }[], text: string, header?: string): Promise<proto.IWebMessageInfo | undefined> {
        if (this.adapter.mode === 'cloud') {
            return this.adapter.sendMultiProduct(jid, catalogId, sections, text, header);
        }
        throw new Error('Sending multi-product messages not supported by this adapter');
    }

    /**
     * Send the entire catalog.
     * @param jid - The recipient JID
     * @param text - Optional body text
     * @param footer - Optional footer text
     */
    async sendCatalog(jid: string, text?: string, footer?: string): Promise<proto.IWebMessageInfo | undefined> {
        if (this.adapter.mode === 'cloud') {
            return this.adapter.sendCatalog(jid, text, footer);
        }
        throw new Error('Sending catalog not supported by this adapter');
    }
}
