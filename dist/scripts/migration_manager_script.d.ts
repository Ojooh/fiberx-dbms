import { SchemaWithPriorityInterface } from "../types/common_types";
declare class MigrationManagerScript {
    private global_vars;
    private app_id;
    private permissions;
    private app_data;
    private schemas_root;
    private migrations_root;
    private migration_logger;
    constructor();
    private validatePermission;
    private createDeltaMigration;
    private createInitialMigration;
    private getAllMigratedColumnsAndIndexes;
    private handleSchemaMigration;
    findAndOrderAppSchemas: (apps: string[]) => SchemaWithPriorityInterface[];
    generateMigrations: () => void;
    executeMigrations: (target_app_id?: string | null, model_name?: string | null) => Promise<void>;
    undoMigrations: (target_app_id?: string | null, model_name?: string | null) => Promise<void>;
}
export default MigrationManagerScript;
