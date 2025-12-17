/**
 * Interface for authentication storage backends.
 * Implement this to store auth data in a database, Redis, etc.
 */
export interface AuthStore {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
}
