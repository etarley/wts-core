export class VCardBuilder {
    private _fullName: string = '';
    private _organization: string = '';
    private _phone: string = '';
    private _email: string = '';
    private _url: string = '';

    constructor(fullName?: string) {
        if (fullName) this._fullName = fullName;
    }

    setFullName(name: string): this {
        this._fullName = name;
        return this;
    }

    setOrganization(org: string): this {
        this._organization = org;
        return this;
    }

    setPhone(phone: string): this {
        this._phone = phone;
        return this;
    }

    setEmail(email: string): this {
        this._email = email;
        return this;
    }

    setUrl(url: string): this {
        this._url = url;
        return this;
    }

    build(): string {
        if (!this._fullName) {
            throw new Error('VCard requires a full name.');
        }

        // Basic VCard 3.0 format
        const vcard = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `FN:${this._fullName}`,
            this._organization ? `ORG:${this._organization};` : '',
            this._phone ? `TEL;type=CELL;type=VOICE;waid=${this._phone.replace(/\D/g, '')}:${this._phone}` : '',
            this._email ? `EMAIL:${this._email}` : '',
            this._url ? `URL:${this._url}` : '',
            'END:VCARD'
        ].filter(Boolean).join('\n');

        return vcard;
    }

    toString(): string {
        return this.build();
    }
}
