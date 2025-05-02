import { ClientSession } from 'mongodb';
import BaseDatasourceConnector from "./base_datasource_connector";
declare class MongoDatasourceConnector extends BaseDatasourceConnector {
    private client;
    private db;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    /**
     * Starts a new transaction session
     */
    beginTransaction: () => Promise<ClientSession>;
    /**
     * Commits the transaction and ends the session
     */
    commitTransaction: (session: ClientSession) => Promise<void>;
    /**
     * Rolls back the transaction and ends the session
     */
    rollbackTransaction: (session: ClientSession) => Promise<void>;
    /**
     * Execute MongoDB operations (optionally inside a session)
     */
    executeQuery: (operation: any, session?: ClientSession) => Promise<any>;
}
export default MongoDatasourceConnector;
