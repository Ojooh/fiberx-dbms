"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const code_templates_1 = require("../scripts/code_templates");
const global_variable_manager_1 = __importDefault(require("../utils/global_variable_manager"));
const SupportedDatasources = ['mysql_db', 'postgressql_db', 'mongo_db'];
class SchemaBuilderScript {
    constructor() {
        // method to create schema
        this.createSchema = (schema_inputs) => {
            try {
                const { model_name, table_name, datasource, columns, primary_key, indexes = [], migration_priority = 1, timestamps = true, } = schema_inputs;
                // Validate permission
                this.validatePermission(model_name);
                const schema_dir = path_1.default.resolve(__dirname, `../schemas/${this.app_id}`);
                const file_name = (0, code_templates_1.pascalToSnake)(model_name);
                const schema_file_path = path_1.default.join(schema_dir, `${file_name}.ts`);
                const existing_schemas = this.loadExistingSchemas(schema_dir);
                this.validateInputs(schema_inputs, existing_schemas);
                // Format columns
                const columns_string = Object.entries(columns).map(([key, value]) => `        ${key}: ${JSON.stringify(value).replace(/"([^"]+)":/g, '$1:')},`).join("\n");
                const indexes_string = JSON.stringify(indexes, null, 4).replace(/"([^"]+)":/g, '$1:');
                // Generate schema code string
                const schema_obj = { app_id: this.app_id, model_name, table_name, datasource, columns_string, primary_key, timestamps, indexes_string, migration_priority };
                const code = (0, code_templates_1.schema_code_template)(schema_obj);
                // Ensure directory exists
                if (!fs_1.default.existsSync(schema_dir)) {
                    fs_1.default.mkdirSync(schema_dir, { recursive: true });
                }
                // Write to schema file
                fs_1.default.writeFileSync(schema_file_path, code, { encoding: "utf-8" });
                console.log(`✅ Schema created: ${schema_file_path}`);
            }
            catch (error) {
                console.error("❌ createSchema error:", error);
                throw error;
            }
        };
        // method to delete a schema
        this.deleteSchema = (model_name) => {
            try {
                this.validatePermission(model_name, "delete_schema");
                const schema_dir = path_1.default.resolve(__dirname, `../schemas/${this.app_id}`);
                const file_name = (0, code_templates_1.pascalToSnake)(model_name);
                const schema_file_path = path_1.default.join(schema_dir, `${file_name}.ts`);
                if (!fs_1.default.existsSync(schema_file_path)) {
                    throw new Error(`Schema file "${schema_file_path}" does not exist.`);
                }
                fs_1.default.unlinkSync(schema_file_path);
                console.log(`🗑️ Schema deleted: ${schema_file_path}`);
            }
            catch (error) {
                console.error("❌ deleteSchema error:", error);
                throw error;
            }
        };
        this.global_vars = global_variable_manager_1.default.getInstance();
        this.app_id = this.global_vars?.getVariable("APP_ID") || null;
        this.permissions = this.global_vars?.getVariable("MODEL_PERMISSIONS") || [];
        this.app_data = this.permissions.find((app) => app.id === this.app_id);
        if (!this.app_data) {
            throw new Error(`App ${this.app_id} is not registered in MODEL_PERMISSIONS.`);
        }
    }
    // method to validate permission to create schema
    validatePermission(model_name, action = "create_schema") {
        const model_perms = this.app_data.models?.find((m) => m.name === model_name);
        if (!model_perms || !model_perms.permissions.includes(action)) {
            throw new Error(`Permission denied: ${action} not allowed on model ${model_name} for app ${this.app_id}.`);
        }
    }
    // method to load existing schemas for app
    loadExistingSchemas(schema_dir) {
        if (!fs_1.default.existsSync(schema_dir))
            return [];
        return fs_1.default.readdirSync(schema_dir).filter(file => file.endsWith('.ts')).map(file => require(path_1.default.resolve(schema_dir, file)).default);
    }
    // method to validate schema input
    validateInputs(schema_inputs, existing_schemas) {
        const { model_name, table_name, datasource, columns, primary_key, indexes, migration_priority } = schema_inputs;
        // Datasource validation
        if (!SupportedDatasources.includes(datasource)) {
            throw new Error(`Invalid datasource: ${datasource}`);
        }
        // Model/Table name uniqueness
        for (const schema of existing_schemas) {
            if (schema.model_name === model_name) {
                throw new Error(`Duplicate model name "${model_name}" already exists.`);
            }
            if (schema.table_name === table_name) {
                throw new Error(`Duplicate table name "${table_name}" already exists.`);
            }
            if (schema.migration_priority === migration_priority) {
                throw new Error(`Duplicate migration_priority ${migration_priority} already exists.`);
            }
        }
        // Primary key in columns
        if (!(primary_key in columns)) {
            throw new Error(`Primary key "${primary_key}" is not defined in columns.`);
        }
        // Index fields must exist in columns
        if (indexes?.length > 0) {
            for (const idx of indexes) {
                for (const field of idx.fields) {
                    if (!(field in columns)) {
                        throw new Error(`Index field "${field}" not found in columns.`);
                    }
                }
            }
        }
    }
}
exports.default = SchemaBuilderScript;
