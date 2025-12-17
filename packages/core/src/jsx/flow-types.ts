import type { VNode } from "./runtime";

export type FlowAction =
    | { name: 'navigate'; next: { type: 'screen'; name: string }; payload?: Record<string, unknown> }
    | { name: 'data_exchange'; payload: Record<string, unknown> }
    | { name: 'complete'; payload: Record<string, unknown> }
    | { name: 'update_data'; payload: Record<string, unknown> }
    | { name: 'open_url'; url: string };

export interface FlowCommonProps {
    visible?: boolean | string;
    enabled?: boolean | string;
}

export interface FlowScreenProps {
    id: string;
    title: string;
    data?: Record<string, unknown>;
    terminal?: boolean;
    success?: boolean;
    refresh_on_back?: boolean;
    children?: VNode | VNode[];
}

export interface TextProps extends FlowCommonProps {
    text: string;
}

export interface TextBodyProps extends TextProps {
    markdown?: boolean;
}

export interface RichTextProps extends FlowCommonProps {
    text: string | string[];
}

export interface InputProps extends FlowCommonProps {
    name: string;
    label: string;
    required?: boolean | string;
    helperText?: string;
    errorMessage?: string;
    initValue?: string | unknown;
}

export interface TextInputProps extends InputProps {
    inputType?: 'text' | 'number' | 'email' | 'password' | 'passcode' | 'phone';
    minChars?: number | string;
    maxChars?: number | string;
    pattern?: string;
    labelVariant?: 'large';
}

export interface TextAreaProps extends InputProps {
    maxLength?: number | string;
    labelVariant?: 'large';
}

export interface OptInProps extends InputProps {
    onClickAction?: FlowAction;
}

export interface FooterProps extends FlowCommonProps {
    label: string;
    onClickAction: FlowAction;
    leftCaption?: string;
    centerCaption?: string;
    rightCaption?: string;
}

export interface ImageProps extends FlowCommonProps {
    src: string; // Base64 or dynamic
    width?: number | string;
    height?: number | string;
    scaleType?: 'cover' | 'contain';
    aspectRatio?: number | string;
    altText?: string;
}

export interface EmbeddedLinkProps extends FlowCommonProps {
    text: string;
    onClickAction: FlowAction;
}

// Selection Components
export interface DataSourceItem {
    id: string;
    title: string;
    description?: string;
    metadata?: string;
    enabled?: boolean;
    image?: string; // Base64
}

export interface SelectionProps extends InputProps {
    dataSource: DataSourceItem[] | string; // Array or dynamic string
    onSelectAction?: FlowAction;
    onUnselectAction?: FlowAction;
}

export interface CheckboxGroupProps extends SelectionProps {
    minSelectedItems?: number | string;
    maxSelectedItems?: number | string;
}

export interface DatePickerProps extends InputProps {
    minDate?: string;
    maxDate?: string;
    unavailableDates?: string[];
    onSelectAction?: FlowAction;
}

export interface CalendarPickerProps extends InputProps {
    mode?: 'single' | 'range';
    minDate?: string;
    maxDate?: string;
    minDays?: number | string;
    maxDays?: number | string;
}

// Logic Components
export interface IfProps {
    condition: string;
    then: VNode | VNode[];
    else?: VNode | VNode[];
}

export interface SwitchProps {
    value: string;
    case: Record<string, VNode | VNode[]>;
}

export interface FormProps {
    name?: string;
    children: VNode | VNode[];
    initValues?: Record<string, unknown>;
    errorMessages?: Record<string, string>;
}

export type FlowJSONVersion =
    | '2.1'
    | '3.0' | '3.1'
    | '4.0'
    | '5.0' | '5.1'
    | '6.0' | '6.1' | '6.2' | '6.3'
    | '7.0' | '7.1' | '7.2' | '7.3';

export type DataAPIVersion = '3.0' | '4.0';

export interface FlowRootProps {
    version?: FlowJSONVersion | (string & {});
    dataApiVersion?: DataAPIVersion | (string & {});
    routingModel?: Record<string, string[]>;
    children: VNode | VNode[];
}
