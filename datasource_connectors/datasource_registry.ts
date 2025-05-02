import BaseDatasourceConnector from "./base_datasource_connector";
import MysqlDatasource from "./mysql_datasource_connector";
import PostgresDatasource from "./postgres_datasource_connector";
import MongoDatasource from "./mongo_datasource_connector";
import { DatasourceConnectorOptionInterface } from "../types/common_types";

type SupportedDatasourceType = 'mysql_db' | 'postgressql_db' | 'mongo_db';

class DatasourceRegistry {
    private static _instance: DatasourceRegistry;
    private registry = new Map<string, BaseDatasourceConnector>();

    private constructor() {}

    static get instance(): DatasourceRegistry {
        if (!this._instance) this._instance = new DatasourceRegistry();
        return this._instance;
    }

    // method to register a data source connector
    register(name: string, connector: BaseDatasourceConnector): void {
        this.registry.set(name, connector);
    }

    // method to get a connector for a data source
    get(name: string): BaseDatasourceConnector {
        const connector = this.registry.get(name);
        if (!connector) throw new Error(`Connector not registered: ${name}`);
        return connector;
    }   

    // method to list registered data source connectors
    list(): Record<string, BaseDatasourceConnector> {
        const obj: Record<string, BaseDatasourceConnector> = {};
        for (const [key, value] of this.registry.entries()) {
            obj[key] = value;
        }
        return obj;
    }

    // method to initialize a connector given name and connetion options
    async initializeConnector(name: SupportedDatasourceType, options: DatasourceConnectorOptionInterface): Promise<void> {
        let connector: BaseDatasourceConnector;

        switch (name) {
            case 'mysql_db':
                connector = new MysqlDatasource(options);
                break;
            case 'postgressql_db':
                connector = new PostgresDatasource(options);
                break;
            case 'mongo_db':
                connector = new MongoDatasource(options);
                break;
            default:
                throw new Error(`Unsupported datasource type: ${name}`);
        }

        await connector.connect();
        this.register(name, connector);
    }
}

export default DatasourceRegistry;
