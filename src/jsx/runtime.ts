/* eslint-disable @typescript-eslint/no-namespace */

import type {
    FlowRootProps,
    FlowScreenProps,
    TextProps,
    TextBodyProps,
    RichTextProps,
    TextInputProps,
    TextAreaProps,
    CheckboxGroupProps,
    SelectionProps,
    FooterProps,
    OptInProps,
    DatePickerProps,
    ImageProps,
    EmbeddedLinkProps,
    IfProps,
    SwitchProps,
    FormProps,
    CalendarPickerProps
} from './flow-types';

export type VNodeProps = Record<string, unknown>;
export type VNodeChild = VNode | string | number | boolean | null | undefined;
export type VNodeChildren = VNodeChild[];

export interface VNode {
    tag: string | ((props: VNodeProps) => VNode | Promise<VNode>);
    props: VNodeProps;
    children: VNodeChildren;
}

export const Fragment = 'Fragment';

export function h(
    tag: string | ((props: VNodeProps) => VNode | Promise<VNode>),
    props: VNodeProps | null,
    ...children: VNodeChildren
): VNode {
    return {
        tag,
        props: props || {},
        children: children.flat(Infinity)
    };
}

declare global {
    namespace JSX {
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        interface Element extends VNode {}
        interface ElementChildrenAttribute {
            // eslint-disable-next-line @typescript-eslint/no-empty-object-type
            children: {};
        }
        interface IntrinsicElements {
            text: { body?: string };
            image: { url: string; caption?: string };
            video: { url: string; caption?: string };
            buttons: { text?: string; footer?: string };
            button: { id: string; text?: string };

            // WhatsApp Flow Components
            Flow: FlowRootProps;
            Screen: FlowScreenProps;

            // UI Components
            TextHeading: TextProps;
            TextSubheading: TextProps;
            TextBody: TextBodyProps;
            TextCaption: TextProps;
            RichText: RichTextProps;
            TextInput: TextInputProps;
            TextArea: TextAreaProps;
            CheckboxGroup: CheckboxGroupProps;
            RadioButtonsGroup: SelectionProps;
            Dropdown: SelectionProps;
            OptIn: OptInProps;
            DatePicker: DatePickerProps;
            CalendarPicker: CalendarPickerProps;
            Footer: FooterProps;
            Image: ImageProps;
            EmbeddedLink: EmbeddedLinkProps;

            // Logic / Structure
            If: IfProps;
            Switch: SwitchProps;
            Form: FormProps;
        }
    }
}
