import type { TemplateComponent } from '../core/interfaces';

export class TemplateBuilder {
    private components: TemplateComponent[] = [];

    constructor(public name: string, public language: string = 'en_US') {}

    addHeader(format: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION', textOrUrl?: string) {
        const component: TemplateComponent = { type: 'HEADER', format };
        if (format === 'TEXT' && textOrUrl) {
            component.text = textOrUrl;
        }
        // For media, usually the handle is uploaded separately, but we can support parameters here if needed
        this.components.push(component);
        return this;
    }

    addBody(text: string) {
        this.components.push({ type: 'BODY', text });
        return this;
    }

    addFooter(text: string) {
        this.components.push({ type: 'FOOTER', text });
        return this;
    }

    /**
     * Add buttons to the template.
     * @param buttons Array of buttons.
     * For QUICK_REPLY: { type: 'QUICK_REPLY', text: 'Yes' }
     * For URL: { type: 'URL', text: 'Visit Website', url: 'https://example.com' }
     * For PHONE_NUMBER: { type: 'PHONE_NUMBER', text: 'Call me', phoneNumber: '1234567890' }
     */
    addButtons(buttons: { type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE' | 'FLOW'; text: string; url?: string; phoneNumber?: string; example?: string[] }[]) {
        this.components.push({
            type: 'BUTTONS',
            buttons: buttons.map(btn => {
                if (btn.type === 'URL') return { type: 'URL', text: btn.text, url: btn.url };
                if (btn.type === 'PHONE_NUMBER') return { type: 'PHONE_NUMBER', text: btn.text, phone_number: btn.phoneNumber };
                if (btn.type === 'QUICK_REPLY') return { type: 'QUICK_REPLY', text: btn.text };
                return btn;
            })
        });
        return this;
    }

    addAuthButton(type: 'ONE_TAP' | 'ZERO_TAP' | 'COPY_CODE', otp: string, appParams?: { packageName: string; signatureHash: string }) {
        const button: NonNullable<TemplateComponent['buttons']>[number] = {
            type: 'OTP',
            otp_type: type,
        };
        
        if (type === 'COPY_CODE') {
            button.text = "Copy Code";
        } else {
            button.autofill_text = "Autofill";
            button.package_name = appParams?.packageName;
            button.signature_hash = appParams?.signatureHash;
            if (type === 'ZERO_TAP') button.zero_tap_terms_accepted = true;
        }
        
        this.components.push({
            type: 'BUTTONS',
            buttons: [button]
        });
        return this;
    }

    addLimitedTimeOffer(text: string, hasExpiration: boolean = true) {
        this.components.push({
            type: 'LIMITED_TIME_OFFER',
            limited_time_offer: {
                text,
                has_expiration: hasExpiration
            }
        });
        return this;
    }

    build() {
        return {
            name: this.name,
            language: this.language,
            components: this.components
        };
    }
}
