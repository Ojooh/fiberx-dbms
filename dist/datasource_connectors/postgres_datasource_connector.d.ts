import { PoolClient } from 'pg';
import BaseDatasourceConnector from "./base_datasource_connector";
declare class PostgresDatasourceConnector extends BaseDatasourceConnector {
    private pool;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    /**
     * Start a new transaction and return the client
     */
    beginTransaction: () => Promise<PoolClient>;
    /**
     * Commit the given transaction client
     */
    commitTransaction: (client: PoolClient) => Promise<void>;
    /**
     * Rollback the given transaction client
     */
    rollbackTransaction: (client: PoolClient) => Promise<void>;
    /**
     * Execute query using pool or provided transaction client
     */
    executeQuery: (query: string, options?: {
        values?: any[];
        transaction?: PoolClient;
    }) => Promise<any>;
}
export default PostgresDatasourceConnector;
