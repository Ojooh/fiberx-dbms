import { DatasourceConnectorOptionInterface } from "@/types/common_types";

abstract class BaseDatasourceConnector {
    options: DatasourceConnectorOptionInterface;

    constructor(options: DatasourceConnectorOptionInterface) {
        this.options = options;
    }

    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;

    /**
     * Run a query or operation with optional parameters or transaction/session context.
     * 
     * - For SQL: `params` is typically an array.
     * - For MongoDB: `params` can be a session.
     */
    abstract executeQuery(query: any, params?: any): Promise<any>;

    /**
     * Start a transaction. Should return a transaction object (e.g., session or connection).
     */
    beginTransaction?(): Promise<any>;

    /**
     * Commit a transaction. Accepts transaction/session context.
     */
    commitTransaction?(transaction: any): Promise<void>;

    /**
     * Rollback a transaction. Accepts transaction/session context.
     */
    rollbackTransaction?(transaction: any): Promise<void>;
}

export default BaseDatasourceConnector;
