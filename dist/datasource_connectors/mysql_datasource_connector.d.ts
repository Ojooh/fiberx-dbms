import { PoolConnection } from 'mysql2/promise';
import BaseDatasourceConnector from "./base_datasource_connector";
declare class MysqlDatasourceConnector extends BaseDatasourceConnector {
    private pool;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    /**
     * Executes a query using either a transaction connection or pool.
     * @param query SQL string
     * @param options Array of query parameters or an object { params: [], transaction?: PoolConnection }
     */
    executeQuery: (query: string, options?: {
        params?: any[];
        transaction?: PoolConnection;
    }) => Promise<any>;
    /**
     * Begins a transaction and returns the dedicated connection.
     */
    beginTransaction: () => Promise<PoolConnection>;
    /**
     * Commits a given transaction.
     */
    commitTransaction: (connection: PoolConnection) => Promise<void>;
    /**
     * Rolls back a given transaction.
     */
    rollbackTransaction: (connection: PoolConnection) => Promise<void>;
}
export default MysqlDatasourceConnector;
