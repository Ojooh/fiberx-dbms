"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
const git_util_1 = __importDefault(require("@/utils/git_util"));
const fibase_client_1 = __importDefault(require("@/api/fibase_client"));
const model_builder_script_1 = __importDefault(require("./scripts/model_builder_script"));
const schema_builder_script_1 = __importDefault(require("@/scripts/schema_builder_script"));
const global_variable_manager_1 = __importDefault(require("@/utils/global_variable_manager"));
const migration_manager_script_1 = __importDefault(require("./scripts/migration_manager_script"));
const datasource_registry_1 = __importDefault(require("@/datasource_connectors/datasource_registry"));
class FiberXDBMS {
    constructor() {
        this.yaml_log_file_path = './app_configs/env.yaml';
        this.handshake_complete = false;
        this.ENV = this.readENVData();
        this.global_vars = global_variable_manager_1.default.getInstance();
        this.api_client = null;
        this.schema_builder = null;
        this.model_builder = null;
        this.migration_manager = null;
        this.datasource_register = datasource_registry_1.default.instance;
        this.git_util = new git_util_1.default(this.ENV.REPOSITORY_BRANCH.toString());
        this.global_vars.setVariable("ENV", this.ENV);
    }
    // Load logs from YAML file
    readENVData() {
        if (!fs.existsSync(this.yaml_log_file_path))
            return {};
        const file_content = fs.readFileSync(this.yaml_log_file_path, 'utf8');
        const data = yaml.load(file_content);
        return data || {};
    }
    // Guard to ensure handshake happened before sensitive operations
    assertHandshakeComplete() {
        if (!this.handshake_complete) {
            throw new Error("Cannot perform operation: Handshake has not been completed successfully.");
        }
    }
    // method to guard against change in app id
    assertAppId(app_id) {
        if (this.global_vars.getVariable("APP_ID") === "fibase") {
            return app_id;
        }
        else {
            return this.global_vars.getVariable("APP_ID");
        }
    }
    // method to initialize and register data connectors
    async registerDataSourceCoonectors() {
        const data_sources = this.global_vars.getVariable('DATA_SOURCES');
        const connection_configs = this.global_vars.getVariable('CONNECTIONS');
        for (const source of data_sources) {
            const connection_options = connection_configs[source];
            if (connection_options) {
                await this.datasource_register.initializeConnector(source, connection_options);
                console.log(`[FiberXDBMS] Datasource "${source}" registered successfully.`);
            }
            else {
                console.warn(`[FiberXDBMS] No connection config found for datasource "${source}".`);
            }
        }
    }
    // Method to initialize dbms
    async initializeDBMS(app_id, public_key) {
        try {
            if (!this.api_client) {
                this.api_client = new fibase_client_1.default(app_id, public_key);
            }
            await this.git_util.pullLatest();
            await this.api_client.refreshCacheIfNeeded();
            await this.registerDataSourceCoonectors();
            this.handshake_complete = true;
            console.log("[FiberXDBMS] DBMS initialized and handshake successful.");
            this.schema_builder = new schema_builder_script_1.default();
            this.migration_manager = new migration_manager_script_1.default();
            this.model_builder = new model_builder_script_1.default();
        }
        catch (error) {
            console.error("[FiberXDBMS] Initialization failed:", error);
            this.handshake_complete = false;
            throw error;
        }
    }
    // Create schema method (after handshake)
    async createSchema(model_name, table_name, datasource, columns, primary_key, indexes, migration_priority, timestamps) {
        try {
            this.assertHandshakeComplete();
            const schema_inputs = { model_name, table_name, datasource, columns, primary_key, indexes, migration_priority, timestamps };
            const commit_message = `chore(schema): created schema '${model_name}' for '${table_name}' on '${datasource}'`;
            this.schema_builder.createSchema(schema_inputs);
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
    async deleteSchema(model_name) {
        try {
            this.assertHandshakeComplete();
            const commit_message = `chore(schema): deleted schema '${model_name}'`;
            this.schema_builder.deleteSchema(model_name);
            console.log(`[FiberXDBMS] Schema "${model_name}" deleted.`);
            await this.git_util.commitAndPush(commit_message);
            return true;
        }
        catch (err) {
            console.error("❌ Failed to delete schema:", err);
            return false;
        }
    }
    // method to generate migrations
    async generateMigrations() {
        try {
            this.assertHandshakeComplete();
            this.migration_manager.generateMigrations();
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
    async executeMigrations(app_id = null) {
        try {
            this.assertHandshakeComplete();
            const resolved_app_id = this.assertAppId(app_id);
            await this.migration_manager.executeMigrations(resolved_app_id);
            console.log(`[FiberXDBMS] Migrations executed for app_id: ${resolved_app_id}`);
            await this.git_util.commitAndPush(`chore(migration): executed migrations for app '${resolved_app_id}'`);
            return true;
        }
        catch (err) {
            console.error("❌ Error executing migrations:", err);
            return false;
        }
    }
    // method to undo migrations
    async undoMigrations(app_id = null) {
        try {
            this.assertHandshakeComplete();
            const resolved_app_id = this.assertAppId(app_id);
            await this.migration_manager.undoMigrations(resolved_app_id);
            console.log(`[FiberXDBMS] Migrations undone for app_id: ${resolved_app_id}`);
            await this.git_util.commitAndPush(`chore(migration): undone migrations for app '${resolved_app_id}'`);
            return true;
        }
        catch (err) {
            console.error("❌ Error undoing migrations:", err);
            return false;
        }
    }
    // method to create schema models
    createSchemaModels(output_dir) {
        try {
            this.assertHandshakeComplete();
            this.model_builder.generateModels(output_dir);
            console.log(`[FiberXDBMS] Models generated.`);
            return true;
        }
        catch (err) {
            console.error("❌ Error creaing schema models:", err);
            return false;
        }
    }
}
exports.default = FiberXDBMS;
