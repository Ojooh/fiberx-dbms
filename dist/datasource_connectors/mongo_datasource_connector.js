"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const base_datasource_connector_1 = __importDefault(require("./base_datasource_connector"));
class MongoDatasourceConnector extends base_datasource_connector_1.default {
    constructor() {
        super(...arguments);
        this.client = null;
        this.db = null;
        this.connect = async () => {
            try {
                const uri = `mongodb://${this.options.host}:${this.options.port}`;
                this.client = new mongodb_1.MongoClient(uri, {
                    maxPoolSize: this.options.pool_max || 10,
                    minPoolSize: this.options.pool_min || 2,
                    serverSelectionTimeoutMS: 5000,
                });
                await this.client.connect();
                this.db = this.client.db(this.options.database);
                console.info("MongoDB connection established.");
            }
            catch (error) {
                console.error(`error in connect method`, { error });
            }
        };
        this.disconnect = async () => {
            try {
                if (this.client) {
                    await this.client.close();
                    this.client = null;
                    this.db = null;
                    console.info("MongoDB connection closed.");
                }
            }
            catch (error) {
                console.error(`error in disconnect method`, { error });
            }
        };
        /**
         * Starts a new transaction session
         */
        this.beginTransaction = async () => {
            if (!this.client)
                throw new Error("MongoDB client not initialized.");
            const session = this.client.startSession();
            session.startTransaction();
            return session;
        };
        /**
         * Commits the transaction and ends the session
         */
        this.commitTransaction = async (session) => {
            await session.commitTransaction();
            await session.endSession();
        };
        /**
         * Rolls back the transaction and ends the session
         */
        this.rollbackTransaction = async (session) => {
            await session.abortTransaction();
            await session.endSession();
        };
        /**
         * Execute MongoDB operations (optionally inside a session)
         */
        this.executeQuery = async (operation, session) => {
            try {
                if (!this.db)
                    throw new Error("MongoDB database connection is not established.");
                const { collection, action, query, data } = operation;
                const col = this.db.collection(collection);
                const opts = session ? { session } : undefined;
                switch (action) {
                    case 'find':
                        return await col.find(query, opts).toArray();
                    case 'insertOne':
                        return await col.insertOne(data, opts);
                    case 'updateOne':
                        return await col.updateOne(query, { $set: data }, opts);
                    case 'deleteOne':
                        return await col.deleteOne(query, opts);
                    default:
                        throw new Error(`Unsupported MongoDB action: ${action}`);
                }
            }
            catch (error) {
                console.error(`error in executeQuery method`, { operation, error });
                throw error;
            }
        };
    }
}
exports.default = MongoDatasourceConnector;
