import BaseDatasourceConnector from "./base_datasource_connector";
import { DatasourceConnectorOptionInterface } from "../types/common_types";
type SupportedDatasourceType = 'mysql_db' | 'postgressql_db' | 'mongo_db';
declare class DatasourceRegistry {
    private static _instance;
    private registry;
    private constructor();
    static get instance(): DatasourceRegistry;
    register(name: string, connector: BaseDatasourceConnector): void;
    get(name: string): BaseDatasourceConnector;
    list(): Record<string, BaseDatasourceConnector>;
    initializeConnector(name: SupportedDatasourceType, options: DatasourceConnectorOptionInterface): Promise<void>;
}
export default DatasourceRegistry;
