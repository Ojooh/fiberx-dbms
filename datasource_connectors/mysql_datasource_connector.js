const { createPool, Pool, PoolConnection, createConnection } =  require("mysql2/promise");

class MysqlDatasourceConnector {
    constructor(options, logger = null) {
        this.name       = "mysql_db";
        this.options    = options;
        this.logger     = logger || console;
    }

    // Method to generate create database query
    #generateCreateDatabaseQuery = (database, collation = "", charset = "") => {
        if (!/^[a-zA-Z0-9_]+$/.test(database)) {
            throw new Error("Invalid database name");
        }
        
        let query = `CREATE DATABASE \`${database}\``;
        if (collation) { query += ` COLLATE ${collation}`; }
        if (charset) { query += ` CHARACTER SET ${charset}`; }
        return query;

    }

    // Method to connect and check if database exist else create it
    #checkAndCreateDatabase = async () => {
        try {
            // 1. Connect without database
            const { host, port, username, password, database, collation, charset } = this.options;
            const connection = await createConnection({ host, port, user: username, password});

            // 2. Check if DB exists
			const [rows] = await connection.query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?", [database]);

            if (rows.length === 0) {
				this.logger.info(`Database '${database}' does not exist. Creating...`);
                const query = this.#generateCreateDatabaseQuery(database, collation, charset);
				await connection.query(query);
				this.logger.info(`Database '${database}' created successfully.`);
			} 
            else { this.logger.info(`Database '${database}' already exists.`);}

			await connection.end();
        }
        catch (error) {
            const params  = { options: this.options, error }
            this.logger.error(`Error in ${this.name} - checkAndCreateDatabase method`, params);
            throw error;
        }


    }

    // Method to connect to MYSQL
    connect = async () => {
        try {
            await this.#checkAndCreateDatabase();

            const { host, port, username: user, password, database, pool_max: connectionLimit = 10, idle_timeout: idleTimeout =50000  } = this.options;

            // 1. Create a connection pool
            this.pool = createPool({ 
                host, port, user, password, database, connectionLimit, idleTimeout,
                waitForConnections: true, maxIdle: 5, queueLimit: 0,
            });
            console.info("Mysql connection established.");
        } 
        catch (error) {
            const params = { options: this.options, error }
            this.logger.error(`Error in ${this.name} - connect method`, params);
            throw error;
        }
    }

    // Method to diconnect from MYSQL
    disconnect = async () => {
        try {
            if (this.pool) {
                await this.pool.end();
                this.pool = null;
                this.logger.info("Mysql connection closed.");
            }
        } 
        catch (error) {
            const params = { error };
            this.logger.error(`Error in ${this.name} - disconnect method`, params);
            this.pool = null;
        }
    }

    // Method to execute MYSQL QUERY
    executeQuery = async (query, options = {}) => {
        try {
            if (!this.pool) throw new Error("Database pool not established");

            const { params = [], transaction } = options;
            this.logger.info(`Executing query`, { query, options });

            const connection = transaction || this.pool;
            const [rows] = await connection.execute(query, params);
            return rows;

        } 
        catch (error) {
            const params = { query, options, error };
            this.logger.error(`Error in ${this.name} - executeQuery method`, params);
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
