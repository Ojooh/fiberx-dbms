const fs                        = require("fs");
const path                      = require("path");
const https                     = require("https");
const { pipeline }              = require("stream");
const { promisify }             = require("util");
const stream_pipeline           = promisify(pipeline);


const GlobalVariableManager     = require("../utils/global_variable_manager");
const { modelCodeTemplate, pascalToSnake }     = require("./code_template");

class ModelAndSchemaLoaderScript { 
    constructor(logger = null) { 
        this.name               = "schema_and_migration_fetcher";
        this.logger             = logger || console;
        this.global_vars        = GlobalVariableManager.getInstance();

        this.base_dir            = process.cwd();
        this.schemas_dir         = path.join(this.base_dir, "database", "schemas");
        this.migrations_dir      = path.join(this.base_dir, "database", "migrations");
        this.models_dir          = path.join(this.base_dir, "database",  "models");
    }

    // Method to create directory if does not exist
    #ensureDirectory = async (dir_path) => {
        try {
            await fs.promises.mkdir(dir_path, { recursive: true });
        } catch (err) {
            this.logger.error(`Failed to ensure directory ${dir_path}:`, err);
            throw err;
        }
    }

    // Method to clear directory
    #clearDirectory = (dir_path) => {
        if (fs.existsSync(dir_path)) {
            fs.readdirSync(dir_path).forEach(file => {
                const full_path = path.join(dir_path, file);
                if (fs.lstatSync(full_path).isDirectory()) {
                    this.clearDirectory(full_path); // Recursively clear subdirectories
                    fs.rmdirSync(full_path);
                } 
                else {
                    fs.unlinkSync(full_path); // Delete file
                }
            });
        }
    }

    // Method to download file from URL
    #downloadFile = async (url, dest_path) => {
        try {
            const streamer_method = (res) => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`Failed to fetch ${url}. Status: ${res.statusCode}`));
                }

                const file_stream = fs.createWriteStream(dest_path);
                stream_pipeline(res, file_stream).then(resolve).catch(reject);
            }

            const resolver_method = (resolve, reject) => {  https.get(url, streamer_method).on('error', reject); }

            return new Promise(resolver_method);
        }
        catch(error) {
            const params = { url, dest_path, error };
            this.logger.log(`Error in ${this.name} - #downloadFile method`, params);
            return false
        }
    }

    // Method to download file 
    #downloadFiles = async (files_array, target_dir) => {
        const { app_id, file_name, url } = files_array;
        const file_path = path.join(target_dir, app_id, file_name);

        await this.#downloadFile(url, file_path);
        console.log(`Downloaded ${file_name} to ${file_path}`);
    }

    // Method to Create Model files and put in model directory
    #createModelFiles = async (files_array) => {
        try {
            this.logger.log(`Creating model files for ${model_name}...`);
            for (const schema_file of files_array) {  
                const { app_id, file_name: schema_file_name, model_name } = schema_file;

                const model_path                = path.join(this.models_dir, `${pascalToSnake(model_name)}.js`);
                const schema_full_path          = path.join(this.schemas_dir, app_id, schema_file_name);

                if (!fs.existsSync(schema_full_path)) {
                    this.logger.error(`❌ Schema file NOT found at: ${schema_full_path}`);
                    continue;
                }

                const schema_instance  = require(schema_full_path)?.default || require(schema_full_path);

                if(!schema_instance) {
                    this.logger.error(`Schema for model ${model_name} does not exist \n`);
                    continue;
                }

                const code_content = modelCodeTemplate(app_id, model_name, schema_file_name);

                // Write to model directory
                fs.writeFileSync(model_path, code_content, { encoding: "utf-8" });
                this.logger.log(`✅ ${model_name} Model File Generated: ${model_path}`);
            }
            this.logger.log(`✅ Model files created for ${model_name}.`);
            return true;
        }
        catch(error) {
            const params = { model_name, files_array, error };
            this.logger.log(`Error in ${this.name} - #createModelFiles method`, params);
            return false
        }
    }

    // Method to fetch schema and migration files
    run = async () => {
        try {
            this.logger.log(`Running ${this.name}...`);

            // Ensure directories exist
            this.logger.log("Ensuring directories exist...");
            await this.#ensureDirectory(this.schemas_dir);
            await this.#ensureDirectory(this.migrations_dir);
            await this.#ensureDirectory(this.models_dir);
            this.logger.log("✅ Directories ensured.");


            this.logger.log("Cleaning directories...");
            this.#clearDirectory(this.schemas_dir);
            this.#clearDirectory(this.migrations_dir);

            this.logger.log("Fetching schema files...");
            const schema_files      = this.global_vars.getVariable("SCHEMA_FILES") || [];
            const migration_files   = this.global_vars.getVariable("MIGRATION_FILES") || [];

            if (schema_files.length === 0) {
                this.logger.error("No schema files found. Please check the setup.");
                return;
            }

            await this.#downloadFiles(schema_files, this.schemas_dir);

            if(migration_files.length) { 
                this.logger.log("Fetching migration files...");
                await this.#downloadFiles(migration_files, this.migrations_dir); 
                this.logger.log("✅ Migration files fetched successfully.");
            }

            this.logger.log("✅ Done fetching schemas and migrations.");

            // Create model files
            this.logger.log("Creating model files...");
            await this.#createModelFiles(schema_files);
            this.logger.log("✅ Model files created successfully.");
            this.logger.log("✅ All operations completed successfully.");

            
            return true;
        } 
        catch (error) {
            const params = { error };
            this.logger.log(`Error in ${this.name} - run method`, params);
            return false
        }
    }

}

module.exports = ModelAndSchemaLoaderScript;