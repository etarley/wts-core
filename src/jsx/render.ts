import type { AnyMessageContent } from '@whiskeysockets/baileys';
import type { VNode, VNodeChild } from './runtime';

function getTextContent(node: VNodeChild): string {
    if (node === null || node === undefined || typeof node === 'boolean') {
        return '';
    }
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }
    // node is VNode
    if (node.children) {
        return node.children.map(getTextContent).join('');
    }
    return '';
}

export async function render(node: VNodeChild): Promise<AnyMessageContent> {
    if (node === null || node === undefined || typeof node === 'boolean') {
        return { text: '' };
    }

    if (typeof node === 'string' || typeof node === 'number') {
        return { text: String(node) };
    }

    // Handle functional components
    if (typeof node.tag === 'function') {
        const result = node.tag(node.props);
        const component = result instanceof Promise ? await result : result;
        return render(component);
    }

    // Handle Fragment
    if (node.tag === 'Fragment') {
        if (node.children.length > 0) {
            return render(node.children[0]);
        }
        return { text: '' };
    }

    const props = node.props || {};
    const children = node.children || [];

    const getChildrenText = (): string => children.map(getTextContent).join('');

    switch (node.tag) {
        case 'text':
            return { text: (props.body as string) || getChildrenText() || '' };
        
        case 'image':
            return {
                image: { url: props.url as string },
                caption: (props.caption as string) || getChildrenText()
            };
            
        case 'video':
            return {
                video: { url: props.url as string },
                caption: (props.caption as string) || getChildrenText()
            };

        case 'buttons': {
            const buttons = children
                .filter((child): child is VNode => 
                    child !== null && 
                    typeof child === 'object' && 
                    'tag' in child && 
                    child.tag === 'button'
                )
                .map((child) => {
                    const childProps = child.props;
                    const displayText = child.children.map(getTextContent).join('') || (childProps.text as string);
                    return {
                        buttonId: childProps.id as string,
                        buttonText: { displayText },
                        type: 1
                    };
                });

            return {
                text: (props.text as string) || 'Select an option',
                footer: props.footer as string,
                buttons: buttons,
                headerType: 1
            } as unknown as AnyMessageContent;
        }

        default:
            // Fallback for unknown tags
            return { text: `Unknown tag: ${node.tag}` };
    }
}
