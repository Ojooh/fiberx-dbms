const { MongoClient, Db, ClientSession }  =  require("mongodb");


class MongoDatasourceConnector {
    constructor(options) {
        this.options = options;
    }
    
    // Method to connect to mongo db client
    connect = async () => {
        try {
            const uri       = `mongodb://${this.options.host}:${this.options.port}`;
            this.client     = new MongoClient(uri, {
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

    // Method to disconnect from mongo db client
    disconnect = async () => {
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

    // Method to start a transaction in mongodb
    beginTransaction = async ()  => {
        if (!this.client) throw new Error("MongoDB client not initialized.");
        const session = this.client.startSession();
        session.startTransaction();
        return session;
    }

    // Method to commit a transaction in mongodb
    commitTransaction = async (session) => {
        await session.commitTransaction();
        await session.endSession();
    }

    // Method to rollback session in mongo db
    rollbackTransaction = async (session) => {
        await session.abortTransaction();
        await session.endSession();
    }

    // Method to execute query in mongo db
    executeQuery = async (operation, session) => {
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

module.exports = MongoDatasourceConnector;
