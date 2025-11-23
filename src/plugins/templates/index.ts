import type { TemplateComponent } from '../../core/interfaces';
import type { WtsPlugin } from '../../types';
import type { Client } from '../../core/Client';

export const templates = () => {
    return {
        id: "templates",
        api: (client: Client) => ({
            templates: {
                async create(name: string, category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION', components: TemplateComponent[], language = 'en_US') {
                    if (client.adapter.mode === 'cloud') {
                        return client.adapter.createTemplate(name, category, components, language);
                    }
                    throw new Error('Templates are only supported on Cloud API');
                },
                /**
                 * Create or Update (Recreate) a template
                 */
                async upsert(name: string, category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION', components: TemplateComponent[], language = 'en_US') {
                    if (client.adapter.mode !== 'cloud') {
                        throw new Error('Templates are only supported on Cloud API');
                    }

                    try {
                        const templates = await client.adapter.getTemplates(100);
                        const templateList = templates as { data: { name: string }[] };
                        const exists = templateList.data?.find((t) => t.name === name);
                        if (exists) {
                            await client.adapter.deleteTemplate(name);
                        }
                    } catch (error) {
                        console.warn('Failed to check template existence during upsert, attempting create anyway', error);
                    }
                    
                    return client.adapter.createTemplate(name, category, components, language);
                },
                /**
                 * List templates
                 */
                async list(limit = 25) {
                    if (client.adapter.mode === 'cloud') {
                        return client.adapter.getTemplates(limit);
                    }
                    throw new Error('Templates are only supported on Cloud API');
                },
                /**
                 * Delete a template by name
                 */
                async delete(name: string) {
                    if (client.adapter.mode === 'cloud') {
                        return client.adapter.deleteTemplate(name);
                    }
                    throw new Error('Templates are only supported on Cloud API');
                },
                async unpause(templateId: string) {
                    if (client.adapter.mode === 'cloud') {
                        return client.adapter.unpauseTemplate(templateId);
                    }
                    throw new Error("Not supported");
                },
                async compare(baseId: string, others: string[], dateRange: { start: Date; end: Date }) {
                    if (client.adapter.mode === 'cloud') {
                        return client.adapter.compareTemplates(
                            baseId, 
                            others, 
                            Math.floor(dateRange.start.getTime() / 1000), 
                            Math.floor(dateRange.end.getTime() / 1000)
                        );
                    }
                    throw new Error("Not supported");
                }
            }
        })
    } satisfies WtsPlugin;
};
