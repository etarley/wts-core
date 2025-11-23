import type { ProductCreate, ProductUpdate } from '@whiskeysockets/baileys';
import type { WtsPlugin } from '../../types';
import type { Client } from '../../core/Client';

export const business = () => {
    return {
        id: "business",
        api: (client: Client) => ({
            business: {
                /**
                 * Get the catalog for a specific JID
                 */
                async getCatalog(jid: string, limit = 10) {
                    return client.adapter.businessGetCatalog(jid, limit);
                },
                /**
                 * Create a new product in your catalog
                 */
                async createProduct(product: ProductCreate) {
                    return client.adapter.businessProductCreate(product);
                },
                /**
                 * Update an existing product
                 */
                async updateProduct(productId: string, update: ProductUpdate) {
                    return client.adapter.businessProductUpdate(productId, update);
                },
                /**
                 * Delete products from catalog
                 */
                async deleteProduct(productIds: string[]) {
                    return client.adapter.businessProductDelete(productIds);
                },
                /**
                 * Get order details (if you received an order message)
                 */
                async getOrderDetails(orderId: string, token: string) {
                    // Order details via API is primarily a Cloud feature
                    if (client.adapter.mode === 'cloud') {
                        return client.adapter.businessGetOrderDetails(orderId, token);
                    }
                    throw new Error('Order details are only supported on Cloud API');
                }
            }
        })
    } satisfies WtsPlugin;
};
