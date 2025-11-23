import { webcrypto } from 'node:crypto';

const { subtle } = webcrypto;

export interface FlowCryptoConfig {
    privateKey: string; // PEM format
    passphrase?: string;
}

export interface DecryptedRequest {
    decryptedBody: Record<string, unknown>;
    aesKey: CryptoKey;
    iv: Uint8Array;
}

export class FlowCrypto {
    constructor(private config: FlowCryptoConfig) {}

    /**
     * Converts PEM string to binary DER format required by WebCrypto
     */
    private pemToArrayBuffer(pem: string): ArrayBuffer {
        const pemHeader = "-----BEGIN PRIVATE KEY-----";
        const pemFooter = "-----END PRIVATE KEY-----";
        
        // Clean up the PEM string
        let pemContents = pem;
        if (pem.includes(pemHeader)) {
             pemContents = pem.substring(
                pem.indexOf(pemHeader) + pemHeader.length,
                pem.lastIndexOf(pemFooter)
            );
        }
        
        const base64String = pemContents.replace(/\s/g, '');
        
        // Base64 decode
        const binaryString = atob(base64String);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return bytes.buffer;
    }

    private async importPrivateKey(pem: string): Promise<CryptoKey> {
        const binaryDer = this.pemToArrayBuffer(pem);

        return await subtle.importKey(
            "pkcs8",
            binaryDer,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            false,
            ["decrypt"]
        );
    }

    /**
     * Decrypts the incoming Flow request.
     * Returns the body AND the keys needed to encrypt the response.
     */
    async decryptRequest(
        encryptedFlowData: string,
        encryptedAesKey: string,
        initialVector: string
    ): Promise<DecryptedRequest> {
        const privateKey = await this.importPrivateKey(this.config.privateKey);

        // 1. Decrypt AES Key using RSA Private Key
        const decryptedAesKeyBuffer = await subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            Buffer.from(encryptedAesKey, "base64")
        );

        // 2. Import the decrypted AES Key
        const aesKey = await subtle.importKey(
            "raw",
            decryptedAesKeyBuffer,
            "AES-GCM",
            false,
            ["decrypt", "encrypt"]
        );

        // 3. Decrypt the Flow Data
        const iv = Buffer.from(initialVector, "base64");
        const flowDataBuffer = Buffer.from(encryptedFlowData, "base64");

        // WhatsApp appends the auth tag to the ciphertext. 
        // WebCrypto AES-GCM implementation handles this automatically.
        const decryptedBuffer = await subtle.decrypt(
            { name: "AES-GCM", iv },
            aesKey,
            flowDataBuffer
        );

        const decryptedString = new TextDecoder().decode(decryptedBuffer);
        
        return {
            decryptedBody: JSON.parse(decryptedString),
            aesKey,
            iv
        };
    }

    /**
     * Encrypts the response using the same AES key and a flipped IV.
     */
    async encryptResponse(response: object, aesKey: CryptoKey, iv: Uint8Array): Promise<string> {
        // 1. Flip the IV bits (As per WhatsApp documentation)
        const flippedIv = new Uint8Array(iv);
        for(let i=0; i < flippedIv.length; i++) {
            flippedIv[i] = flippedIv[i]! ^ 0xFF;
        }

        // 2. Encrypt response
        const encryptedBuffer = await subtle.encrypt(
            { name: "AES-GCM", iv: flippedIv },
            aesKey,
            new TextEncoder().encode(JSON.stringify(response))
        );

        return Buffer.from(encryptedBuffer).toString("base64");
    }
}
