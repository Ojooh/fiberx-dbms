"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const base_datasource_connector_1 = __importDefault(require("@/datasource_connectors/base_datasource_connector"));
class PostgresDatasourceConnector extends base_datasource_connector_1.default {
    constructor() {
        super(...arguments);
        this.pool = null;
        this.connect = async () => {
            try {
                this.pool = new pg_1.Pool({
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
            }
            catch (error) {
                console.error(`error in connect method`, { error });
            }
        };
        this.disconnect = async () => {
            try {
                if (this.pool) {
                    await this.pool.end();
                    this.pool = null;
                    console.info("Postgres connection closed.");
                }
            }
            catch (error) {
                console.error(`error in disconnect method`, { error });
            }
        };
        /**
         * Start a new transaction and return the client
         */
        this.beginTransaction = async () => {
            if (!this.pool)
                throw new Error("Database pool not established");
            const client = await this.pool.connect();
            await client.query('BEGIN');
            return client;
        };
        /**
         * Commit the given transaction client
         */
        this.commitTransaction = async (client) => {
            await client.query('COMMIT');
            client.release();
        };
        /**
         * Rollback the given transaction client
         */
        this.rollbackTransaction = async (client) => {
            await client.query('ROLLBACK');
            client.release();
        };
        /**
         * Execute query using pool or provided transaction client
         */
        this.executeQuery = async (query, options) => {
            try {
                if (!this.pool)
                    throw new Error("Database pool not established");
                const values = options?.values || [];
                const client = options?.transaction;
                const result = client
                    ? await client.query(query, values)
                    : await this.pool.query(query, values);
                return result.rows;
            }
            catch (error) {
                console.error(`error in executeQuery method`, { query, options, error });
            }
        };
    }
}
exports.default = PostgresDatasourceConnector;
