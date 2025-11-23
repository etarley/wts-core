export enum ComponentType {
    TextHeading = 'TextHeading',
    TextSubheading = 'TextSubheading',
    TextBody = 'TextBody',
    TextCaption = 'TextCaption',
    TextInput = 'TextInput',
    TextArea = 'TextArea',
    Checkbox = 'Checkbox',
    RadioButtons = 'RadioButtons',
    Footer = 'Footer',
    OptIn = 'OptIn',
    Dropdown = 'Dropdown',
    DatePicker = 'DatePicker',
    Image = 'Image',
    Button = 'Button',
    CalendarPicker = 'CalendarPicker',
    ImageCarousel = 'ImageCarousel',
    RichText = 'RichText',
    ChipsSelector = 'ChipsSelector',
    PhotoPicker = 'PhotoPicker',
    DocumentPicker = 'DocumentPicker'
}

export interface Component {
    type: ComponentType;
    visible?: boolean | string;
}

export class Layout {
    constructor(public children: Component[]) {}

    toJSON() {
        return {
            type: 'SingleColumnLayout',
            children: this.children
        };
    }
}

export class Screen {
    constructor(
        public id: string,
        public title: string,
        public layout: Layout,
        public data?: Record<string, unknown>,
        public terminal: boolean = false,
        public success: boolean = false,
        public refreshOnBack: boolean = false
    ) {}

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            data: this.data || {},
            layout: this.layout.toJSON(),
            terminal: this.terminal,
            success: this.success,
            refresh_on_back: this.refreshOnBack
        };
    }
}

export class FlowJSON {
    constructor(
        public version: string = "7.3",
        public screens: Screen[],
        public data_api_version: string = "4.0"
    ) {}

    toJSON() {
        return {
            version: this.version,
            data_api_version: this.data_api_version,
            screens: this.screens.map(s => s.toJSON())
        };
    }
}

// --- Components ---

export class TextHeading implements Component {
    type = ComponentType.TextHeading;
    constructor(public text: string) {}
}

export class TextSubheading implements Component {
    type = ComponentType.TextSubheading;
    constructor(public text: string) {}
}

export class TextBody implements Component {
    type = ComponentType.TextBody;
    constructor(public text: string) {}
}

export class TextCaption implements Component {
    type = ComponentType.TextCaption;
    constructor(public text: string) {}
}

export class TextInput implements Component {
    type = ComponentType.TextInput;
    constructor(
        public name: string,
        public label: string,
        public required: boolean = true,
        public minChars?: number,
        public maxChars?: number,
        public helperText?: string,
        public inputType?: 'text' | 'number' | 'email' | 'password' | 'phone'
    ) {}
}

export class TextArea implements Component {
    type = ComponentType.TextArea;
    constructor(
        public name: string,
        public label: string,
        public required: boolean = true,
        public maxLength?: number,
        public helperText?: string
    ) {}
}

export class Checkbox implements Component {
    type = ComponentType.Checkbox;
    constructor(
        public name: string,
        public label: string,
        public required: boolean = false,
        public minSelected?: number,
        public maxSelected?: number,
        public options: { id: string; title: string }[] = []
    ) {}
}

export class RadioButtons implements Component {
    type = ComponentType.RadioButtons;
    constructor(
        public name: string,
        public label: string,
        public required: boolean = true,
        public options: { id: string; title: string }[] = []
    ) {}
}

export class Footer implements Component {
    type = ComponentType.Footer;
    constructor(
        public label: string,
        public onClickAction: string
    ) {}
}

export class OptIn implements Component {
    type = ComponentType.OptIn;
    constructor(
        public name: string,
        public label: string,
        public required: boolean = true
    ) {}
}

export class Dropdown implements Component {
    type = ComponentType.Dropdown;
    constructor(
        public name: string,
        public label: string,
        public required: boolean = true,
        public options: { id: string; title: string }[] = []
    ) {}
}

export class DatePicker implements Component {
    type = ComponentType.DatePicker;
    constructor(
        public name: string,
        public label: string,
        public required: boolean = true,
        public minDate?: string,
        public maxDate?: string
    ) {}
}

export class Button implements Component {
    type = ComponentType.Button;
    constructor(
        public label: string,
        public onClickAction: string
    ) {}
}

export class CalendarPicker implements Component {
    type = ComponentType.CalendarPicker;
    constructor(
        public name: string,
        public label: string,
        public mode: 'single' | 'range' = 'single',
        public minDate?: string,
        public maxDate?: string,
        public minDays?: number,
        public maxDays?: number
    ) {}
}

export class ImageCarousel implements Component {
    type = ComponentType.ImageCarousel;
    constructor(public images: { src: string; altText?: string }[]) {}
}

export class RichText implements Component {
    type = ComponentType.RichText;
    constructor(
        public text: string,
        public visible: boolean = true
    ) {}
}

export class ChipsSelector implements Component {
    type = ComponentType.ChipsSelector;
    constructor(
        public name: string,
        public label: string,
        public options: { id: string; text: string; selected?: boolean }[],
        public multiple: boolean = false
    ) {}
}

export class PhotoPicker implements Component {
    type = ComponentType.PhotoPicker;
    constructor(
        public name: string,
        public label: string
    ) {}
}

export class DocumentPicker implements Component {
    type = ComponentType.DocumentPicker;
    constructor(
        public name: string,
        public label: string
    ) {}
}
