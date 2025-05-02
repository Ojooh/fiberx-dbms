import * as fs from "fs";
import * as yaml from "js-yaml";

import GitUtil from "./utils/git_util";
import FibaseAPIClient from "./api/fibase_client";
import ModelBuilderScript from "./scripts/model_builder_script";
import SchemaBuilderScript from "./scripts/schema_builder_script";
import GlobalVariableManager from "./utils/global_variable_manager";
import MigrationManagerScript from "./scripts/migration_manager_script";
import DatasourceRegistry from "./datasource_connectors/datasource_registry";

import { 
    EnvConfigInterface, 
    SupportedDatasourceType,
    TableColumnType,
    TableIndexInterface,
} from "./types/common_types";


class FiberXDBMS {
    public global_vars:GlobalVariableManager;

    private yaml_log_file_path: string = './app_configs/env.yaml';
    private ENV:EnvConfigInterface;
    private api_client: FibaseAPIClient | null;
    private schema_builder: SchemaBuilderScript | null;
    private model_builder: ModelBuilderScript | null;
    private migration_manager: MigrationManagerScript | null;
    private handshake_complete: boolean = false;
    private datasource_register: DatasourceRegistry;
    private git_util: GitUtil;

    constructor() {
        this.ENV                = this.readENVData();
        this.global_vars        = GlobalVariableManager.getInstance()
        this.api_client         = null;
        this.schema_builder     = null;
        this.model_builder      = null;
        this.migration_manager  = null;
        this.datasource_register= DatasourceRegistry.instance;
        this.git_util           = new GitUtil(this.ENV.REPOSITORY_BRANCH.toString());

        this.global_vars.setVariable("ENV", this.ENV);
    }

    // Load logs from YAML file
    private readENVData(): EnvConfigInterface {
        if (!fs.existsSync(this.yaml_log_file_path)) return {};
    
        const file_content = fs.readFileSync(this.yaml_log_file_path, 'utf8');
        const data = yaml.load(file_content) as EnvConfigInterface;
    
        return data || {};
    }

    // Guard to ensure handshake happened before sensitive operations
    private assertHandshakeComplete(): void {
        if (!this.handshake_complete) {
            throw new Error("Cannot perform operation: Handshake has not been completed successfully.");
        }
    }

    // method to guard against change in app id
    private assertAppId(app_id: string | null): string | null {
        if(this.global_vars.getVariable("APP_ID") === "fibase") { return app_id; } 

        else { return this.global_vars.getVariable("APP_ID") }
    }

    // method to initialize and register data connectors
    private async registerDataSourceCoonectors() {
        const data_sources          = this.global_vars.getVariable('DATA_SOURCES');
        const connection_configs    = this.global_vars.getVariable('CONNECTIONS');

        for (const source of data_sources) {
            const connection_options = connection_configs[source];
            if (connection_options) {
                await this.datasource_register.initializeConnector(source as SupportedDatasourceType, connection_options);
                console.log(`[FiberXDBMS] Datasource "${source}" registered successfully.`);
            } else {
                console.warn(`[FiberXDBMS] No connection config found for datasource "${source}".`);
            }
        }

    }

    // Method to initialize dbms
    public async initializeDBMS(app_id: string, public_key: string): Promise<void> {
        try {
            if (!this.api_client) {
                this.api_client = new FibaseAPIClient(app_id, public_key);
            }

            await this.api_client.refreshCacheIfNeeded();

            await this.registerDataSourceCoonectors();

            this.handshake_complete = true;
            console.log("[FiberXDBMS] DBMS initialized and handshake successful.");

            this.schema_builder     = new SchemaBuilderScript();
            this.migration_manager  = new MigrationManagerScript();
            this.model_builder      = new ModelBuilderScript();

        } catch (error) {
            console.error("[FiberXDBMS] Initialization failed:", error);
            this.handshake_complete = false;
            throw error;
        }
    }

    // Create schema method (after handshake)
    public async createSchema(model_name: string, table_name: string, datasource: SupportedDatasourceType, columns: TableColumnType, primary_key: string, indexes: TableIndexInterface[], migration_priority: number, timestamps: boolean,): Promise<boolean> {
        try {
            this.assertHandshakeComplete();

            const schema_inputs     = { model_name, table_name, datasource, columns, primary_key,  indexes, migration_priority, timestamps };
            const commit_message    = `chore(schema): created schema '${model_name}' for '${table_name}' on '${datasource}'`;

            this.schema_builder!.createSchema(schema_inputs)
            console.log(`[FiberXDBMS] Schema "${model_name}" created.`);

            await this.git_util.commitAndPush(commit_message);
            return true;
        }
        catch (err) {
            console.error("❌ Failed to create schema:", err);
            return false;
        }
    }

    // Delete schema method (after handshake)
    public async deleteSchema(model_name: string): Promise<boolean> {
        try {
            this.assertHandshakeComplete();
            
            const commit_message    = `chore(schema): deleted schema '${model_name}'`;

            this.schema_builder!.deleteSchema(model_name);
            console.log(`[FiberXDBMS] Schema "${model_name}" deleted.`);

            await this.git_util.commitAndPush(commit_message);
            return true
        }
        catch (err) {
            console.error("❌ Failed to delete schema:", err);
            return false;
        }
    }

    // method to generate migrations
    public async generateMigrations(): Promise<boolean> {
        try {
            this.assertHandshakeComplete();
            this.migration_manager!.generateMigrations();
            console.log("[FiberXDBMS] Migrations generated.");

            await this.git_util.commitAndPush(`chore(migration): generated new migrations`);
            return true;
        }
        catch (err) {
            console.error("❌ generate MIGRATIONS error:", err);
            return false;
        }
    }

    // method to execute migrations
    public async executeMigrations(app_id: string | null = null): Promise<boolean> {
        try {
            this.assertHandshakeComplete();

            const resolved_app_id = this.assertAppId(app_id);
            await this.migration_manager!.executeMigrations(resolved_app_id);
            console.log(`[FiberXDBMS] Migrations executed for app_id: ${resolved_app_id}`);

            await this.git_util.commitAndPush(`chore(migration): executed migrations for app '${resolved_app_id}'`);
            return true
        }
        catch (err) {
            console.error("❌ Error executing migrations:", err);
            return false;
        }
    }

    // method to undo migrations
    public async undoMigrations(app_id: string | null = null): Promise<boolean> {
        try {
            this.assertHandshakeComplete();

            const resolved_app_id = this.assertAppId(app_id);
            await this.migration_manager!.undoMigrations(resolved_app_id);
            console.log(`[FiberXDBMS] Migrations undone for app_id: ${resolved_app_id}`);

            await this.git_util.commitAndPush(`chore(migration): undone migrations for app '${resolved_app_id}'`);
            return true
        }
        catch (err) {
            console.error("❌ Error undoing migrations:", err);
            return false;
        }
    }

    // method to create schema models
    public async createSchemaModels(output_dir: string): Promise<boolean> {
        try {
            this.assertHandshakeComplete();
            await this.git_util.pullLatest();


            this.model_builder!.generateModels(output_dir);
            console.log(`[FiberXDBMS] Models generated.`);
            return true;
        }
        catch (err) {
            console.error("❌ Error creaing schema models:", err);
            return false;
        }
    }

}

export default FiberXDBMS;