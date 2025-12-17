import fs from 'fs/promises';
import path from 'path';

export interface IStorageStrategy {
    /**
     * Save data to storage.
     * @param fileName The name of the file to save
     * @param data The data buffer
     * @returns The path or URL where the file was saved
     */
    save(fileName: string, data: Buffer): Promise<string>;
}

export class LocalFileStorage implements IStorageStrategy {
    constructor(private readonly baseDir: string = 'storage') {}

    async save(fileName: string, data: Buffer): Promise<string> {
        await fs.mkdir(this.baseDir, { recursive: true });
        const filePath = path.join(this.baseDir, fileName);
        await fs.writeFile(filePath, data);
        return filePath;
    }
}
