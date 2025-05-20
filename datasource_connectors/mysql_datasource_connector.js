const { createPool, Pool, PoolConnection } =  require("mysql2/promise");

class MysqlDatasourceConnector {
    constructor(options) {
        this.options = options;
    }

    // Method to connect to MYSQL
    connect = async () => {
        try {
            this.pool = createPool({
                host: this.options?.host,
                port: this.options?.port,
                user: this.options?.username,
                password: this.options?.password,
                database: this.options?.database,
                waitForConnections: true,
                connectionLimit: this.options?.pool_max || 10,
                maxIdle: 5,
                idleTimeout: this.options?.idle_timeout || 50000,
                queueLimit: 0,
            });
            console.info("Mysql connection established.");
        } catch (error) {
            console.error("Error in connect method", { error });
        }
    }

    // Method to diconnect from MYSQL
    disconnect = async () => {
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

    // Method to execute MYSQL QUERY
    executeQuery = async (query, options = {}) => {
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

    // Method to begin a transaction
    beginTransaction = async ()  => {
        if (!this.pool) throw new Error("Database pool not established");

        const connection = await this.pool.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    // Method to commit a transaction
    commitTransaction = async (connection)  => {
        await connection.commit();
        connection.release();
    }

    // Method to rollback a transaction
    rollbackTransaction = async (connection) => {
        await connection.rollback();
        connection.release();
    }
}

module.exports = MysqlDatasourceConnector;
