"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const code_templates_1 = require("@/scripts/code_templates");
const migration_logger_1 = __importDefault(require("@/utils/migration_logger"));
const global_variable_manager_1 = __importDefault(require("@/utils/global_variable_manager"));
class MigrationManagerScript {
    constructor() {
        // Method to other app schemas by migration pirotity
        this.findAndOrderAppSchemas = (apps) => {
            try {
                const schemas_by_priority = [];
                for (const app_id of apps) {
                    const app_schema_dir = path_1.default.join(this.schemas_root, app_id);
                    if (!fs_1.default.statSync(app_schema_dir).isDirectory()) {
                        continue;
                    }
                    const files = fs_1.default.readdirSync(app_schema_dir).filter(f => f.endsWith('.ts'));
                    for (const file of files) {
                        const full_path = path_1.default.join(app_schema_dir, file);
                        const schema_def = require(full_path)?.default || require(full_path);
                        if (!schema_def)
                            continue;
                        const priority = schema_def?.migration_priority || 1;
                        schemas_by_priority.push({ priority, app_id, schema_file: file, schema_def });
                    }
                }
                return schemas_by_priority;
            }
            catch (error) {
                const params = { apps, error };
                console.error("❌ find and order app schemas error:", params);
                throw error;
            }
        };
        // method to make migrations
        this.generateMigrations = () => {
            try {
                const apps = fs_1.default.readdirSync(this.schemas_root);
                const schemas_by_priority = this.findAndOrderAppSchemas(apps);
                schemas_by_priority.sort((a, b) => a.priority - b.priority);
                for (const entry of schemas_by_priority) {
                    // Validate permission
                    if (!this.validatePermission("make_migrations", entry.schema_def.model_name)) {
                        console.log(`🚫 No permission to migrate model "${entry.schema_def.model_name}" in app "${entry.app_id}" — skipping`);
                        continue;
                    }
                    this.handleSchemaMigration(entry.app_id, entry.schema_def);
                }
            }
            catch (error) {
                console.error("❌ generate MIGRATIONS error:", error);
                throw error;
            }
        };
        // method to execute migrations
        this.executeMigrations = async (target_app_id = null, model_name = null) => {
            try {
                const apps = target_app_id ? [target_app_id] : fs_1.default.readdirSync(this.schemas_root);
                const schemas_by_priority = this.findAndOrderAppSchemas(apps);
                schemas_by_priority.sort((a, b) => a.priority - b.priority);
                for (const entry of schemas_by_priority) {
                    const { app_id, schema_def } = entry;
                    if (model_name && schema_def.model_name !== model_name)
                        continue;
                    if (!this.validatePermission("make_migrations", schema_def.model_name)) {
                        console.log(`🚫 No permission to migrate model "${entry.schema_def.model_name}" in app "${entry.app_id}" — skipping`);
                        continue;
                    }
                    const app_migration_dir = path_1.default.join(this.migrations_root, app_id);
                    if (!fs_1.default.existsSync(app_migration_dir)) {
                        continue;
                    }
                    const model_prefix = schema_def.model_name.toLowerCase();
                    const files = fs_1.default.readdirSync(app_migration_dir).filter(f => f.endsWith('.ts') && (f.startsWith(model_prefix))).sort();
                    for (const file of files) {
                        if (this.migration_logger.isMigrated(app_id, file)) {
                            console.log(`⏭️ Migration already executed: ${file} — skipping`);
                            continue;
                        }
                        const full_path = path_1.default.join(app_migration_dir, file);
                        const migration_instance = require(full_path)?.default || require(full_path);
                        if (!migration_instance) {
                            continue;
                        }
                        if (typeof migration_instance.up === 'function') {
                            await migration_instance.up();
                            this.migration_logger.logMigration(app_id, file, 'migrated');
                            console.log(`🚀 Executed migration: ${file} \n\n`);
                        }
                    }
                }
            }
            catch (error) {
                console.error("❌ Error executing migrations:", error);
                throw error;
            }
        };
        // method to undo migrations
        this.undoMigrations = async (target_app_id = null, model_name = null) => {
            try {
                const apps = target_app_id ? [target_app_id] : fs_1.default.readdirSync(this.schemas_root);
                const schemas_by_priority = this.findAndOrderAppSchemas(apps);
                // Important: reverse order for undo
                schemas_by_priority.sort((a, b) => b.priority - a.priority);
                for (const entry of schemas_by_priority) {
                    const { app_id, schema_def } = entry;
                    if (model_name && schema_def.model_name !== model_name)
                        continue;
                    if (!this.validatePermission("make_migrations", schema_def.model_name)) {
                        console.log(`🚫 No permission to migrate model "${entry.schema_def.model_name}" in app "${entry.app_id}" — skipping`);
                        continue;
                    }
                    const app_migration_dir = path_1.default.join(this.migrations_root, app_id);
                    if (!fs_1.default.existsSync(app_migration_dir))
                        continue;
                    const model_prefix = schema_def.model_name.toLowerCase();
                    const files = fs_1.default.readdirSync(app_migration_dir).filter(f => f.endsWith('.ts') && (f.startsWith(model_prefix))).sort().reverse();
                    for (const file of files) {
                        if (this.migration_logger.isRolledBack(app_id, file)) {
                            console.log(`⏪ Migration already rolled back: ${file} — skipping`);
                            continue;
                        }
                        const full_path = path_1.default.join(app_migration_dir, file);
                        const migration_instance = require(full_path)?.default || require(full_path);
                        if (!migration_instance) {
                            continue;
                        }
                        if (typeof migration_instance.down === 'function') {
                            await migration_instance.down();
                            this.migration_logger.logMigration(app_id, file, 'rolledback');
                            console.log(`🧨 Rolled back migration: ${file} \n\n`);
                        }
                    }
                }
            }
            catch (error) {
                console.error("❌ Error rolling back migrations:", error);
                throw error;
            }
        };
        this.migration_logger = new migration_logger_1.default();
        this.global_vars = global_variable_manager_1.default.getInstance();
        this.app_id = this.global_vars?.getVariable("APP_ID") || null;
        this.permissions = this.global_vars?.getVariable("MODEL_PERMISSIONS") || [];
        this.app_data = this.permissions.find((app) => app.id === this.app_id);
        this.schemas_root = path_1.default.resolve(__dirname, '../schemas');
        this.migrations_root = path_1.default.resolve(__dirname, '../migrations');
        if (!this.app_data) {
            throw new Error(`App ${this.app_id} is not registered in MODEL_PERMISSIONS.`);
        }
    }
    // method to validate permission to create schema
    validatePermission(action, model_name) {
        const model_perms = this.app_data.models?.find((m) => m.name === model_name);
        if (!model_perms || !model_perms.permissions.includes(action)) {
            console.error(`Permission denied: ${action} not allowed on model ${model_name} for app ${this.app_id}.`);
            return false;
        }
        else {
            return true;
        }
    }
    // method to create other migration files
    createDeltaMigration(dir, name, schema, added_cols, removed_cols, added_indx, removed_indx) {
        const file_path = path_1.default.join(dir, `${name}.ts`);
        const code_placeholders = { schema, added_cols, added_indx, removed_cols, removed_indx };
        const code_content = (0, code_templates_1.delta_migration_code_template)(code_placeholders);
        // Ensure directory exists
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        // Write to schema file
        fs_1.default.writeFileSync(file_path, code_content, { encoding: "utf-8" });
        console.log(`📦 Created delta migration: ${file_path}`);
    }
    // method to create initial migration file
    createInitialMigration(dir, name, schema) {
        const file_path = path_1.default.join(dir, `${name}.ts`);
        const column_names = Object.keys(schema.columns);
        const index_names = schema.indexes.map(i => i.name);
        const code_placeholders = { schema, column_names, index_names };
        const code_content = (0, code_templates_1.initial_migration_code_template)(code_placeholders);
        // Ensure directory exists
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        // Write to schema file
        fs_1.default.writeFileSync(file_path, code_content, { encoding: "utf-8" });
        console.log(`✅ Created initial migration: ${file_path}`);
    }
    // method to get all migrated columns and indexes for a schema
    getAllMigratedColumnsAndIndexes(app_migration_dir, existing_migrations) {
        let all_created_columns = new Set();
        let all_created_indexes = new Set();
        for (const file of existing_migrations) {
            const full_path = path_1.default.join(app_migration_dir, file);
            const migration = require(full_path)?.default || require(full_path);
            const meta = migration.metadata;
            if (meta?.columns)
                meta.columns.forEach(c => all_created_columns.add(c));
            if (meta?.indexes)
                meta.indexes.forEach(i => all_created_indexes.add(i));
        }
        return { all_created_columns, all_created_indexes };
    }
    // method to handle schema migration
    handleSchemaMigration(app_id, schema) {
        const model_name = schema.model_name;
        const file_prefix = model_name.toLowerCase();
        const app_migration_dir = path_1.default.join(this.migrations_root, app_id);
        if (!fs_1.default.existsSync(app_migration_dir)) {
            fs_1.default.mkdirSync(app_migration_dir, { recursive: true });
        }
        const existing_migrations = fs_1.default.readdirSync(app_migration_dir).filter(f => f.startsWith(file_prefix));
        const next_number = String(existing_migrations.length + 1).padStart(3, '0');
        const migration_name = existing_migrations.length === 0 ? `${file_prefix}_001_initial` : `${file_prefix}_${next_number}_update`;
        if (this.migration_logger.getMigration(app_id, `${migration_name}.ts`)) {
            console.log(`🛑 Migration already exists in log: ${migration_name}.ts — skipping`);
            return;
        }
        const { all_created_columns, all_created_indexes } = this.getAllMigratedColumnsAndIndexes(app_migration_dir, existing_migrations);
        const defined_columns = Object.keys(schema.columns);
        const defined_indexes = schema.indexes.map(idx => idx.name);
        const new_columns = defined_columns.filter(c => !all_created_columns.has(c));
        const removed_columns = [...all_created_columns].filter(c => !defined_columns.includes(c));
        const new_indexes = defined_indexes.filter(i => !all_created_indexes.has(i));
        const removed_indexes = [...all_created_indexes].filter(i => !defined_indexes.includes(i));
        if (existing_migrations.length === 0) {
            this.createInitialMigration(app_migration_dir, migration_name, schema);
        }
        else if (new_columns.length || removed_columns.length || new_indexes.length || removed_indexes.length) {
            this.createDeltaMigration(app_migration_dir, migration_name, schema, new_columns, removed_columns, new_indexes, removed_indexes);
        }
        this.migration_logger.logMigration(app_id, `${migration_name}.ts`, 'pending');
    }
}
exports.default = MigrationManagerScript;
