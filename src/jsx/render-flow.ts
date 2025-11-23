import type { VNode, VNodeChild } from './runtime';

/**
 * Maps JSX prop names to Flow JSON property names (kebab-case)
 */
const PROP_MAP: Record<string, string> = {
    onClickAction: 'on-click-action',
    onSelectAction: 'on-select-action',
    onUnselectAction: 'on-unselect-action',
    inputType: 'input-type',
    helperText: 'helper-text',
    initValue: 'init-value',
    errorMessage: 'error-message',
    minChars: 'min-chars',
    maxChars: 'max-chars',
    maxLength: 'max-length',
    dataSource: 'data-source',
    minSelectedItems: 'min-selected-items',
    maxSelectedItems: 'max-selected-items',
    minDate: 'min-date',
    maxDate: 'max-date',
    unavailableDates: 'unavailable-dates',
    scaleType: 'scale-type',
    aspectRatio: 'aspect-ratio',
    altText: 'alt-text',
    refreshOnBack: 'refresh_on_back',
    labelVariant: 'label-variant',
    minDays: 'min-days',
    maxDays: 'max-days',
    includeDays: 'include-days',
    initValues: 'init-values',
    errorMessages: 'error-messages'
};

function mapProps(props: Record<string, unknown>): Record<string, unknown> {
    const newProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
        // Skip internal props or undefined
        if (key === 'children' || value === undefined) continue;

        // Handle specific transformations
        if (key === 'required' || key === 'visible' || key === 'enabled' || key === 'markdown') {
            newProps[key] = value; // Keep keys as is for these, but value can be boolean or string
            continue;
        }

        const mappedKey = PROP_MAP[key] || key;
        newProps[mappedKey] = value;
    }
    return newProps;
}

async function renderChildren(children: VNodeChild[]): Promise<unknown[]> {
    const rendered = await Promise.all(children.map(async child => {
        if (!child || typeof child !== 'object' || !('tag' in child)) return null;
         
        return renderFlowComponent(child);
    }));
    return rendered.filter(Boolean);
}

async function renderFlowComponent(node: VNode): Promise<unknown> {
    // Handle Functional Components
    if (typeof node.tag === 'function') {
        const result = node.tag(node.props);
        const component = result instanceof Promise ? await result : result;
        return renderFlowComponent(component);
    }

    // Handle Fragment
    if (node.tag === 'Fragment') {
        return renderChildren(node.children);
    }

    const { tag, props, children } = node;

    // Special Handling for Logic Components
    if (tag === 'If') {
        return {
            type: 'If',
            condition: props.condition,
            then: await renderChildren(Array.isArray(props.then) ? props.then : [props.then as VNode]),
            else: props.else ? await renderChildren(Array.isArray(props.else) ? props.else : [props.else as VNode]) : []
        };
    }

    if (tag === 'Switch') {
        const cases: Record<string, unknown[]> = {};
        const caseProps = props.case as Record<string, VNode[]>;
        for (const [key, nodes] of Object.entries(caseProps)) {
            cases[key] = await renderChildren(Array.isArray(nodes) ? nodes : [nodes]);
        }
        return {
            type: 'Switch',
            value: props.value,
            cases: cases
        };
    }

    if (tag === 'Screen') {
        // Screen is not a component inside children, handled at root usually,
        // but if we are inside renderFlowComponent, we map props.
        // However, Screen is usually processed by the root 'Flow' handler.
        // If we encounter it here recursively, it's structured data.
        const layout = {
            type: 'SingleColumnLayout',
            children: await renderChildren(children)
        };

        return {
            id: props.id,
            title: props.title,
            terminal: props.terminal || false,
            success: props.success || false,
            data: props.data || {},
            refresh_on_back: props.refreshOnBack || false,
            layout
        };
    }

    // Standard UI Components
    const componentJson: Record<string, unknown> = {
        type: tag,
        ...mapProps(props)
    };

    // Handle specific children requirements
    if (tag === 'Form') {
        componentJson.children = await renderChildren(children);
    }

    return componentJson;
}

export async function renderFlow(node: VNode): Promise<object> {
    if (node.tag !== 'Flow') {
        throw new Error('Root element must be <Flow>');
    }

    const screens = await renderChildren(node.children);

    // Auto-generate routing model if not provided (Simple chain)
    let routingModel = node.props.routingModel;
    if (!routingModel && screens.length > 0) {
        routingModel = {};
        // This is a naive implementation. In reality, routing models depend on actions.
        // We just initialize empty arrays for validation to pass if users define actions manually.
        screens.forEach((screen) => {
            const s = screen as { id: string };
            if (routingModel && s.id) (routingModel as Record<string, string[]>)[s.id] = [];
        });
    }

    return {
        version: node.props.version || "7.3",
        data_api_version: node.props.dataApiVersion || "4.0",
        routing_model: routingModel || {},
        screens
    };
}
