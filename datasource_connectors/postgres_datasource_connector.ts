import { Pool, PoolClient } from 'pg';
import BaseDatasourceConnector from "@/datasource_connectors/base_datasource_connector";

class PostgresDatasourceConnector extends BaseDatasourceConnector {
    private pool: Pool | null = null;

    connect = async (): Promise<void> => {
        try {
            this.pool = new Pool({
                host: this.options.host,
                port: this.options.port,
                user: this.options.username,
                password: this.options.password,
                database: this.options.database,
                max: this.options.pool_max || 10,
                idleTimeoutMillis: this.options.idle_timeout || 50000,
                connectionTimeoutMillis: this.options.connection_timeout || 5000,
            });
            console.info("Postgres connection established.");
        } catch (error) {
            console.error(`error in connect method`, { error });
        }
    }

    disconnect = async (): Promise<void> => {
        try {
            if (this.pool) {
                await this.pool.end();
                this.pool = null;
                console.info("Postgres connection closed.");
            }
        } catch (error) {
            console.error(`error in disconnect method`, { error });
        }
    }

    /**
     * Start a new transaction and return the client
     */
    beginTransaction = async (): Promise<PoolClient> => {
        if (!this.pool) throw new Error("Database pool not established");
        const client = await this.pool.connect();
        await client.query('BEGIN');
        return client;
    }

    /**
     * Commit the given transaction client
     */
    commitTransaction = async (client: PoolClient): Promise<void> => {
        await client.query('COMMIT');
        client.release();
    }

    /**
     * Rollback the given transaction client
     */
    rollbackTransaction = async (client: PoolClient): Promise<void> => {
        await client.query('ROLLBACK');
        client.release();
    }

    /**
     * Execute query using pool or provided transaction client
     */
    executeQuery = async (
        query: string,
        options?: { values?: any[], transaction?: PoolClient }
    ): Promise<any> => {
        try {
            if (!this.pool) throw new Error("Database pool not established");

            const values = options?.values || [];
            const client = options?.transaction;

            const result = client
                ? await client.query(query, values)
                : await this.pool.query(query, values);

            return result.rows;
        } catch (error) {
            console.error(`error in executeQuery method`, { query, options, error });
        }
    }
}

export default PostgresDatasourceConnector;
