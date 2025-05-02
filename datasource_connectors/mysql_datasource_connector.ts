import { createPool, Pool, PoolConnection } from 'mysql2/promise';
import BaseDatasourceConnector from "@/datasource_connectors/base_datasource_connector";

class MysqlDatasourceConnector extends BaseDatasourceConnector {
    private pool: Pool | null = null;

    connect = async (): Promise<void> => {
        try {
            this.pool = createPool({
                host: this.options.host,
                port: this.options.port,
                user: this.options.username,
                password: this.options.password,
                database: this.options.database,
                waitForConnections: true,
                connectionLimit: this.options.pool_max || 10,
                maxIdle: 5,
                idleTimeout: this.options.idle_timeout || 50000,
                queueLimit: 0,
            });
            console.info("Mysql connection established.");
        } catch (error) {
            console.error("Error in connect method", { error });
        }
    }

    disconnect = async (): Promise<void> => {
        try {
            if (this.pool) {
                await this.pool.end();
                this.pool = null;
                console.info("Mysql connection closed.");
            }
        } catch (error) {
            console.error("Error in disconnect method", { error });
        }
    }

    /**
     * Executes a query using either a transaction connection or pool.
     * @param query SQL string
     * @param options Array of query parameters or an object { params: [], transaction?: PoolConnection }
     */
    executeQuery = async (query: string, options: { params?: any[], transaction?: PoolConnection } = {}): Promise<any> => {
        try {
            if (!this.pool) throw new Error("Database pool not established");

            const { params = [], transaction } = options;

            const connection = transaction || this.pool;
            const [rows] = await connection.execute(query, params);
            return rows;

        } catch (error) {
            console.error("Error in executeQuery method", { query, options, error });
            throw error;
        }
    }

    /**
     * Begins a transaction and returns the dedicated connection.
     */
    beginTransaction = async (): Promise<PoolConnection> => {
        if (!this.pool) throw new Error("Database pool not established");

        const connection = await this.pool.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    /**
     * Commits a given transaction.
     */
    commitTransaction = async (connection: PoolConnection): Promise<void> => {
        await connection.commit();
        connection.release();
    }

    /**
     * Rolls back a given transaction.
     */
    rollbackTransaction = async (connection: PoolConnection): Promise<void> => {
        await connection.rollback();
        connection.release();
    }
}

export default MysqlDatasourceConnector;
