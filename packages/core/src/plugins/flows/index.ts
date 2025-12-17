import type { WtsPlugin } from '../../types';
import type { Client } from '../../core/Client';

export const flows = () => {
    return {
        id: "flows",
        api: (client: Client) => ({
            flows: {
                /**
                 * Create a new Flow
                 */
                async create(name: string, categories: string[], flowJson: object) {
                    if (client.adapter.mode === 'cloud') {
                        return client.adapter.createFlow(name, categories, flowJson);
                    }
                    throw new Error('Flows are only supported on Cloud API');
                },
                /**
                 * Publish a Flow (making it available to send)
                 */
                async publish(flowId: string) {
                    if (client.adapter.mode === 'cloud') {
                        return client.adapter.publishFlow(flowId);
                    }
                    throw new Error('Flows are only supported on Cloud API');
                },
                /**
                 * Delete/Deprecate a Flow
                 */
                async delete(flowId: string) {
                    if (client.adapter.mode === 'cloud') {
                        return client.adapter.deleteFlow(flowId);
                    }
                    throw new Error('Flows are only supported on Cloud API');
                },
                /**
                 * List all flows
                 */
                async list() {
                    if (client.adapter.mode === 'cloud') {
                        return client.adapter.getFlows();
                    }
                    throw new Error('Flows are only supported on Cloud API');
                }
            }
        })
    } satisfies WtsPlugin;
};
