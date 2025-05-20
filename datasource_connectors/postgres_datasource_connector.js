const { Pool, PoolClient }  =  require("pg");

class PostgresDatasourceConnector {
    constructor(options) {
        this.options = options;
    }

    // Method to connect to PostgresSQL
    connect = async ()  => {
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

    // Method to disconnect from PostgresSQL
    disconnect = async () => {
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

    // Method to begin transaction
    beginTransaction = async () => {
        if (!this.pool) throw new Error("Database pool not established");
        const client = await this.pool.connect();
        await client.query('BEGIN');
        return client;
    }

    // Method to commit transaction
    commitTransaction = async (client) => {
        await client.query('COMMIT');
        client.release();
    }

    // method to rollback transaction
    rollbackTransaction = async (client) => {
        await client.query('ROLLBACK');
        client.release();
    }

    // method to execute query
    executeQuery = async ( query, options ) => {
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

module.exports = PostgresDatasourceConnector;
