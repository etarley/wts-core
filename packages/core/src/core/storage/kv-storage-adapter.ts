export interface SQLiteStatement {
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
}

export interface SQLiteDatabase {
    query(sql: string): SQLiteStatement;
    run(sql: string, params?: unknown[]): void;
    close(): void;
}

export interface KVStorageOptions {
    readonly driver: SQLiteDatabase;
    readonly tableName?: string; // Default: 'wts_storage'
}

/**
 * SQLite-based storage adapter.
 * Requires a compatible SQLite driver (e.g. bun:sqlite or better-sqlite3 wrapper) to be passed in.
 */
export class KVStorageAdapter {
    private db: SQLiteDatabase;
    private readonly tableName: string;
    
    constructor(options: KVStorageOptions) {
        const tableName = options.tableName || 'wts_storage';
        if (!/^[A-Za-z0-9_]+$/.test(tableName)) {
            throw new Error(`Invalid table name "${tableName}". Only alphanumeric and underscore characters are allowed.`);
        }
        this.tableName = tableName;
        this.db = options.driver;
        this.initialize();
    }
    
    private initialize(): void {
        // Create table with key-value structure
        this.db.run(`
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at INTEGER DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        `);
    }
    
    async get(key: string): Promise<string | null> {
        const result = this.db.query(`SELECT value FROM ${this.tableName} WHERE key = ?`).get(key);
        return result ? (result as { value: string }).value : null;
    }
    
    async set(key: string, value: string): Promise<void> {
        this.db.run(
            `INSERT INTO ${this.tableName} (key, value, updated_at) 
             VALUES (?, ?, strftime('%s', 'now'))
             ON CONFLICT(key) DO UPDATE SET 
                value = excluded.value,
                updated_at = excluded.updated_at`,
            [key, value]
        );
    }
    
    async delete(key: string): Promise<void> {
        this.db.run(`DELETE FROM ${this.tableName} WHERE key = ?`, [key]);
    }
    
    async clear(): Promise<void> {
        this.db.run(`DELETE FROM ${this.tableName}`);
    }
    
    async exists(key: string): Promise<boolean> {
        const result = this.db.query(`SELECT 1 FROM ${this.tableName} WHERE key = ? LIMIT 1`).get(key);
        return result !== null;
    }
    
    /**
     * Close the database connection.
     * Call this when shutting down the application.
     */
    close(): void {
        this.db.close();
    }
}
