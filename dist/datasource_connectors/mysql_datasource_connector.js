"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = require("mysql2/promise");
const base_datasource_connector_1 = __importDefault(require("@/datasource_connectors/base_datasource_connector"));
class MysqlDatasourceConnector extends base_datasource_connector_1.default {
    constructor() {
        super(...arguments);
        this.pool = null;
        this.connect = async () => {
            try {
                this.pool = (0, promise_1.createPool)({
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
            }
            catch (error) {
                console.error("Error in connect method", { error });
            }
        };
        this.disconnect = async () => {
            try {
                if (this.pool) {
                    await this.pool.end();
                    this.pool = null;
                    console.info("Mysql connection closed.");
                }
            }
            catch (error) {
                console.error("Error in disconnect method", { error });
            }
        };
        /**
         * Executes a query using either a transaction connection or pool.
         * @param query SQL string
         * @param options Array of query parameters or an object { params: [], transaction?: PoolConnection }
         */
        this.executeQuery = async (query, options = {}) => {
            try {
                if (!this.pool)
                    throw new Error("Database pool not established");
                const { params = [], transaction } = options;
                const connection = transaction || this.pool;
                const [rows] = await connection.execute(query, params);
                return rows;
            }
            catch (error) {
                console.error("Error in executeQuery method", { query, options, error });
                throw error;
            }
        };
        /**
         * Begins a transaction and returns the dedicated connection.
         */
        this.beginTransaction = async () => {
            if (!this.pool)
                throw new Error("Database pool not established");
            const connection = await this.pool.getConnection();
            await connection.beginTransaction();
            return connection;
        };
        /**
         * Commits a given transaction.
         */
        this.commitTransaction = async (connection) => {
            await connection.commit();
            connection.release();
        };
        /**
         * Rolls back a given transaction.
         */
        this.rollbackTransaction = async (connection) => {
            await connection.rollback();
            connection.release();
        };
    }
}
exports.default = MysqlDatasourceConnector;
