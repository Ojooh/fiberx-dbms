type SupportedDatasourceType = 'mysql_db' | 'postgressql_db' | 'mongo_db';

type LockType = 'UPDATE' | 'SHARE' | 'KEY SHARE' | 'NO KEY UPDATE' | 'FOR UPDATE' | 'FOR SHARE' | 'FOR NO KEY UPDATE';

type PermissionType = 'read' | 'create' | 'update' | 'delete' | 'create_schema' | 'make_migrations' | 'migrate' | 'delete_schema'

type ModelConstructorType = { [key: string]: any; };

type ModelPermissionType = { name: string; permissions: PermissionType[] };

type AppPermissionType = { id: string; models: ModelPermissionType[] };

type ColumnPositionType = { before?: string; after?: string;};

type TableColumnType = { [column_name: string]: TableColumnInterface };

type InitialMigrationTemplateType = {
    schema: TableSchemaInterface, 
    column_names: string[], 
    index_names: string[],
}

type DeltaMigrationTemplateType = {
    schema: TableSchemaInterface, 
    added_cols: string[], 
    added_indx: string[],
    removed_cols: string[],
    removed_indx: string[],
}

type SchemaTemplateType = {
    app_id: string;
    model_name: string;
    table_name: string;
    datasource: string;
    columns_string: string; // Already formatted string
    primary_key: string;
    timestamps: boolean;
    indexes?: TableIndexInterface[];
    indexes_string: string; // Already formatted string, default to "[]"
    migration_priority: number;
};

type MigrationStatusType = "pending" | "migrated" | "rolledback" | "failed";

interface MigrationLogEntryInterface {
    id: string;
    app_id: string;
    file: string;
    status: MigrationStatusType;
    created_at: string;
    updated_at: string;
    error_message?: string;
}

interface DatasourceConnectorOptionInterface {
    type: SupportedDatasourceType;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    pool_max: number;
    pool_min: number;
    idle_timeout: number;
    connection_timeout: number;
}

interface TableColumnInterface {
    type: any; // could be string or a structured object based on datasource
    default?: any;
    on_update?: string;
    nullable?: boolean;
    unique?: boolean;
    auto_increment?: boolean;
    references?: {
        table: string;
        column: string;
    };
}
interface TableIndexInterface { name: string; fields: string[]; }

interface TableSchemaInterface {
    app_id: string;
    table_name: string;
    model_name: string;
    datasource: 'mysql' | 'postgres' | 'mongodb';
    columns: TableColumnType;
    primary_key?: string | string[];
    indexes: TableIndexInterface[];
    migration_priority?: number;
    timestamps?: boolean;
}

interface FibaseHandshakeRequestInterface {
    app_id: string;
    public_key: string;
    timestamp: number;
    signature: string;
}
  
interface FibaseHandshakeResponseInterface {
    environments: string[];
    data_sources: string[];
    app_id: string[];
    connections: any[];
    apps_with_model_permissions: any[];
    expires_at: number;
}

interface QueryFormatOptionInterface {
    limit?: number;          // Optional: Limits the number of results.
    offset?: number;         // Optional: Skips the first 'n' records.
    order?: string | string[]; // Optional: Specifies the order of results. Can be a string or array of strings.
    distinct?: boolean;      // Optional: Applies DISTINCT to the query.
    lock?: LockType;         // Optional: Specifies the lock type for table row locking.
}

interface SchemaWithPriorityInterface { priority: number; app_id: string; schema_file: string; schema_def: TableSchemaInterface; }

interface MigrationMetadataInterface { columns: string[]; indexes: string[]; timestamp: string; schema: string; }

interface SchemaMigratedColumnsAndIndexesInterface { all_created_columns: Set<string>; all_created_indexes: Set<string>; }

interface EnvConfigInterface { [key: string]: string | number | boolean; }

  

export { 
    PermissionType,
    ModelConstructorType,
    SupportedDatasourceType,
    SchemaTemplateType,
    ColumnPositionType,
    InitialMigrationTemplateType,
    DeltaMigrationTemplateType,
    MigrationStatusType,
    TableColumnType,

    DatasourceConnectorOptionInterface,
    TableColumnInterface,
    TableIndexInterface,
    TableSchemaInterface,
    FibaseHandshakeRequestInterface,
    FibaseHandshakeResponseInterface,
    QueryFormatOptionInterface,
    SchemaWithPriorityInterface,
    MigrationMetadataInterface,
    SchemaMigratedColumnsAndIndexesInterface,
    MigrationLogEntryInterface,
    EnvConfigInterface
}
