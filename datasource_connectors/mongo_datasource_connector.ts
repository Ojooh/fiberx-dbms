import { MongoClient, Db, ClientSession } from 'mongodb';
import BaseDatasourceConnector from "./base_datasource_connector";

class MongoDatasourceConnector extends BaseDatasourceConnector {
    private client: MongoClient | null = null;
    private db: Db | null = null;

    connect = async (): Promise<void> => {
        try {
            const uri = `mongodb://${this.options.host}:${this.options.port}`;
            this.client = new MongoClient(uri, {
                maxPoolSize: this.options.pool_max || 10,
                minPoolSize: this.options.pool_min || 2,
                serverSelectionTimeoutMS: 5000,
            });

            await this.client.connect();
            this.db = this.client.db(this.options.database);

            console.info("MongoDB connection established.");
        } catch (error) {
            console.error(`error in connect method`, { error });
        }
    }

    disconnect = async (): Promise<void> => {
        try {
            if (this.client) {
                await this.client.close();
                this.client = null;
                this.db = null;
                console.info("MongoDB connection closed.");
            }
        } catch (error) {
            console.error(`error in disconnect method`, { error });
        }
    }

    /**
     * Starts a new transaction session
     */
    beginTransaction = async (): Promise<ClientSession> => {
        if (!this.client) throw new Error("MongoDB client not initialized.");
        const session = this.client.startSession();
        session.startTransaction();
        return session;
    }

    /**
     * Commits the transaction and ends the session
     */
    commitTransaction = async (session: ClientSession): Promise<void> => {
        await session.commitTransaction();
        await session.endSession();
    }

    /**
     * Rolls back the transaction and ends the session
     */
    rollbackTransaction = async (session: ClientSession): Promise<void> => {
        await session.abortTransaction();
        await session.endSession();
    }

    /**
     * Execute MongoDB operations (optionally inside a session)
     */
    executeQuery = async (operation: any, session?: ClientSession): Promise<any> => {
        try {
            if (!this.db) throw new Error("MongoDB database connection is not established.");

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
        } catch (error) {
            console.error(`error in executeQuery method`, { operation, error });
            throw error;
        }
    }
}

export default MongoDatasourceConnector;
