const { MongoClient, Db, ClientSession }  =  require("mongodb");


class MongoDatasourceConnector {
    constructor(options, logger = null) {
        this.name       = "mongo_db";
        this.options    = options;
        this.logger     = logger || console;
    }
    
    // Method to connect to mongo db client
    connect = async () => {
        try {
            const { 
                host, port, username: user, password, database, 
                pool_max: maxPoolSize = 10, pool_min: minPoolSize = 2,  connection_timeout: serverSelectionTimeoutMS  = 5000 
            } = this.options;


            const auth      = user && password ? `${user}:${password}@` : '';
            const auth_uri  = `mongodb://${auth}${host}:${port}`;

            this.client     = new MongoClient(uri, { maxPoolSize, minPoolSize,  serverSelectionTimeoutMS, useNewUrlParser: true, useUnifiedTopology: true });

            await this.client.connect();
            this.db = this.client.db(this.options.database);

            this.logger.info("MongoDB connection established.");
        } 
        catch (error) {
            const params = { options: this.options, error }
            this.logger.error(`Error in ${this.name} - connect method`, params);
            throw error;
        }
    }

    // Method to disconnect from mongo db client
    disconnect = async () => {
        try {
            if (this.client) {
                await this.client.close();
                this.client = null;
                this.db = null;
                this.logger.info("MongoDB connection closed.");
            }
        } 
        catch (error) {
            const params    = { error };
            this.logger.error(`Error in ${this.name} - disconnect method`, params);
            this.client     = null;
            this.db         = null;
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
        } 
        catch (error) {
            const params = { operation, session, error };
            this.logger.error(`Error in ${this.name} - executeQuery method`, params);
            throw error;
        }
    }
}

module.exports = MongoDatasourceConnector;
