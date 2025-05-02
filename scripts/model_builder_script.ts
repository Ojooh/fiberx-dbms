import fs from 'fs';
import path from 'path';

import { pascalToSnake, model_code_templates } from "../scripts/code_templates";

import {  PermissionType } from "../types/common_types";

import GlobalVariableManager from "../utils/global_variable_manager";

class ModelBuilderScript {
    private global_vars: any;
    private app_id: string;
    private permissions: PermissionType[];
    private app_data: any;
    private schemas_root: string;

    constructor() {
        this.global_vars        = GlobalVariableManager.getInstance();
        this.app_id             = this.global_vars?.getVariable("APP_ID") || null;
        this.permissions        = this.global_vars?.getVariable("MODEL_PERMISSIONS") || [];
        this.app_data           = this.permissions.find((app: any) => app.id === this.app_id);

        this.schemas_root       = path.resolve(__dirname, '../schemas');

        if (!this.app_data) {
            throw new Error(`App ${this.app_id} is not registered in MODEL_PERMISSIONS.`);
        }
        
    }

    generateModels = (output_dir: string) => {
        try {
            if (!fs.existsSync(output_dir)) { 
                console.log(`Output directory ${output_dir} to store model code is not valid please create output directory`);
                return;
            }

            if (!Array.isArray(this.app_data.models) || this.app_data.models.length === 0) {
                console.error(`${this.app_id} has no models to generate`);
                return;
            }

            const models = this.app_data.models || [];

            for (const model of models) {
                const { name: model_name, app_id }  = model;
                const schema_file_name              = `${pascalToSnake(model_name).toLowerCase()}.ts`;
                const schema_full_path              = path.join(this.schemas_root, app_id, schema_file_name);
                const schema_instance               = require(schema_full_path)?.default || require(schema_full_path);

                if(!schema_instance) {
                    console.error(`Schema for model ${model_name} does not exist \n`);
                    continue
                }

                const code_content       = model_code_templates(app_id, model_name);
                const model_file_name   =  schema_file_name;
                const model_file_path   =  path.join(output_dir, model_file_name);
                
                // Write to model directory
                fs.writeFileSync(model_file_path, code_content, { encoding: "utf-8" });
                console.log(`✅ Model File Generated: ${model_file_path}`);
            }
        }
        catch (error) {
            console.error("❌ generate model error:", error);
            throw error;
        }
    }

}

export default ModelBuilderScript