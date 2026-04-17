import { Database } from 'sql.js';
export declare function initDb(): Promise<Database>;
export declare function getDb(): Database;
export declare function saveDb(): void;
