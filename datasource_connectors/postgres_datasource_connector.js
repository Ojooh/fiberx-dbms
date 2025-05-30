const { Pool, PoolClient }  =  require("pg");
const { randomUUID } = require('crypto');

class PostgresDatasourceConnector {
   constructor(options, logger = null) {
        this.name       = "postgressql_db";
        this.options    = options;
        this.logger     = logger || console;
    }

    // Method to generate create database query
    #generateCreateDatabaseQuery = (database, collation = "", charset = "") => {
        if (!/^[a-zA-Z0-9_]+$/.test(database)) {
            throw new Error("Invalid database name");
        }
        
        let query = `CREATE DATABASE \`${database}\``;

        if (charset) { query += ` ENCODING '${encoding}`; }

        if (collation) { query += ` LC_COLLATE='${lc_collate}`; }


        return query;
    }

    // Method to connect and check if database exist else create it
    #checkAndCreateDatabase = async () => {
        try {
            // 1. Connect without database
            const { host, port, username: user, password, database = "postgres", collation, charset } = this.options;
            
            const bootstrap_pool = new Pool({ host, port, user, password, database: 'postgres' });
				
            // Step 2: Check if database exists
			const result = await bootstrap_pool.query( "SELECT 1 FROM pg_database WHERE datname = $1",[database]);

            if (result?.rowCount === 0) {
				this.logger.info(`Database '${database}' does not exist. Creating...`);
                const query = this.#generateCreateDatabaseQuery(database, collation, charset);
				await bootstrap_pool.query(query);
				this.logger.info(`Database '${database}' created successfully.`);
			} 
            else { this.logger.info(`Database '${database}' already exists.`); }


			await bootstrap_pool.end();
        }
        catch (error) {
            const params  = { options: this.options, error }
            this.logger.error(`Error in ${this.name} - checkAndCreateDatabase method`, params);
            throw error;
        }


    }

    // Method to connect to PostgresSQL
    connect = async ()  => {
        try {
            await this.#checkAndCreateDatabase();

            const { 
                host, port, username: user, password, database, 
                pool_max: max = 10, idle_timeout: idleTimeoutMillis =50000, 
                connection_timeout: connectionTimeoutMillis  = 5000 
            } = this.options;

            // 1. Create a connection pool
            this.pool = new Pool({ host, port, user, password, database, max, idleTimeoutMillis, connectionTimeoutMillis });

            console.info("Postgres connection established.");
        } 
        catch (error) {
            const params = { options: this.options, error }
            this.logger.error(`Error in ${this.name} - connect method`, params);
            throw error;
        }
    }

    // Method to disconnect from PostgresSQL
    disconnect = async () => {
        try {
            if (this.pool) {
                await this.pool.end();
                this.pool = null;
                this.logger.info("Postgres connection closed.");
            }
        } 
        catch (error) {
            const params = { error };
            this.logger.error(`Error in ${this.name} - disconnect method`, params);
            this.pool = null;
        }
    }

    // Method to begin transaction
    beginTransaction = async () => {
        if (!this.pool) { throw new Error("Database pool not established"); }

        const client = await this.pool.connect();
        await client.query('BEGIN');
        client.transaction_id = randomUUID()();
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
            if (!this.pool) { throw new Error("Database pool not established"); }

            const { params = [], transaction }  = options;
            const connection                    = transaction || this.pool;
            const query_log_type                = transaction ? (transaction?.transaction_id) : "Default"

            this.logger.info(`Executing Query [${query_log_type}]:  ${query} [PARAMS] ${JSON.stringify(params)}`);

            const result = await connection.query(query, values)

            return result.rows;
        } 
        catch (error) {
            const params = { query, options, error };
            this.logger.error(`Error in ${this.name} - executeQuery method`, params);
            throw error;
        }
    }
}

module.exports = PostgresDatasourceConnector;
