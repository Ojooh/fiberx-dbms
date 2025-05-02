"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const code_templates_1 = require("@/scripts/code_templates");
const global_variable_manager_1 = __importDefault(require("@/utils/global_variable_manager"));
class ModelBuilderScript {
    constructor() {
        this.generateModels = (output_dir) => {
            try {
                if (!fs_1.default.existsSync(output_dir)) {
                    console.log(`Output directory ${output_dir} to store model code is not valid please create output directory`);
                    return;
                }
                if (!Array.isArray(this.app_data.models) || this.app_data.models.length === 0) {
                    console.error(`${this.app_id} has no models to generate`);
                    return;
                }
                const models = this.app_data.models || [];
                for (const model of models) {
                    const { name: model_name, app_id } = model;
                    const schema_file_name = `${(0, code_templates_1.pascalToSnake)(model_name).toLowerCase()}.ts`;
                    const schema_full_path = path_1.default.join(this.schemas_root, app_id, schema_file_name);
                    const schema_instance = require(schema_full_path)?.default || require(schema_full_path);
                    if (!schema_instance) {
                        console.error(`Schema for model ${model_name} does not exist \n`);
                        continue;
                    }
                    const code_content = (0, code_templates_1.model_code_templates)(app_id, model_name);
                    const model_file_name = schema_file_name;
                    const model_file_path = path_1.default.join(output_dir, model_file_name);
                    // Write to model directory
                    fs_1.default.writeFileSync(model_file_path, code_content, { encoding: "utf-8" });
                    console.log(`✅ Model File Generated: ${model_file_path}`);
                }
            }
            catch (error) {
                console.error("❌ generate model error:", error);
                throw error;
            }
        };
        this.global_vars = global_variable_manager_1.default.getInstance();
        this.app_id = this.global_vars?.getVariable("APP_ID") || null;
        this.permissions = this.global_vars?.getVariable("MODEL_PERMISSIONS") || [];
        this.app_data = this.permissions.find((app) => app.id === this.app_id);
        this.schemas_root = path_1.default.resolve(__dirname, '../schemas');
        if (!this.app_data) {
            throw new Error(`App ${this.app_id} is not registered in MODEL_PERMISSIONS.`);
        }
    }
}
exports.default = ModelBuilderScript;
