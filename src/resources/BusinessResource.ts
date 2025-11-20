import { BaseResource } from './BaseResource';
import type { ProductCreate, ProductUpdate } from '@whiskeysockets/baileys';

export class BusinessResource extends BaseResource {
    /**
     * Get the catalog for a specific JID
     */
    async getCatalog(jid: string, limit = 10) {
        return this.adapter.businessGetCatalog(jid, limit);
    }

    /**
     * Create a new product in your catalog
     */
    async createProduct(product: ProductCreate) {
        return this.adapter.businessProductCreate(product);
    }

    /**
     * Update an existing product
     */
    async updateProduct(productId: string, update: ProductUpdate) {
        return this.adapter.businessProductUpdate(productId, update);
    }

    /**
     * Delete products from catalog
     */
    async deleteProduct(productIds: string[]) {
        return this.adapter.businessProductDelete(productIds);
    }

    /**
     * Get order details (if you received an order message)
     */
    async getOrderDetails(orderId: string, token: string) {
        return this.adapter.businessGetOrderDetails(orderId, token);
    }
}
