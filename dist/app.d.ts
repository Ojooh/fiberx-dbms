import GlobalVariableManager from "./utils/global_variable_manager";
import { SupportedDatasourceType, TableColumnType, TableIndexInterface } from "./types/common_types";
declare class FiberXDBMS {
    global_vars: GlobalVariableManager;
    private yaml_log_file_path;
    private ENV;
    private api_client;
    private schema_builder;
    private model_builder;
    private migration_manager;
    private handshake_complete;
    private datasource_register;
    private git_util;
    constructor();
    private readENVData;
    private assertHandshakeComplete;
    private assertAppId;
    private registerDataSourceCoonectors;
    initializeDBMS(app_id: string, public_key: string): Promise<void>;
    createSchema(model_name: string, table_name: string, datasource: SupportedDatasourceType, columns: TableColumnType, primary_key: string, indexes: TableIndexInterface[], migration_priority: number, timestamps: boolean): Promise<boolean>;
    deleteSchema(model_name: string): Promise<boolean>;
    generateMigrations(): Promise<boolean>;
    executeMigrations(app_id?: string | null): Promise<boolean>;
    undoMigrations(app_id?: string | null): Promise<boolean>;
    createSchemaModels(output_dir: string): Promise<boolean>;
}
export default FiberXDBMS;
