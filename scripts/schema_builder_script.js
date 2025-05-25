

const { schema_code_template } = require("./code_template");


class SchemaBuilderScript {
    constructor(logger = null) {
        this.name           = "schema_builder_script";
        this.logger         = logger || console;
        this.source_types   = ["mysql_db", "postgressql_db", "mongo_db"];
    }

    // Method to validate schema input
    #validateSchemaInput = (schema_input) => {
        try {
            const {
                file_name, model_name, app_id, table_name, datasource_type, columns, primary_key,
                indexes = [], migration_priority = 1, timestamps = true,
            } = schema_input;

            if (!file_name || !model_name || !app_id || !table_name || !datasource_type || !columns) {
                throw new Error("Missing required fields in schema input");
            }

            if (!this.source_types.includes(datasource_type)) {
                throw new Error(`Invalid datasource type: ${datasource_type}`);
            }

            if (!Object.keys(columns).length) {
                throw new Error("Columns must be a non-empty array");
            }

            if(isNaN(migration_priority) || migration_priority < 1) {
                throw new Error("Migration priority must be a positive integer");
            }

            if (typeof timestamps !== "boolean") {
                throw new Error("Timestamps must be a boolean value");
            }

            if (primary_key && !columns[primary_key]) {
                throw new Error(`Primary key "${primary_key}" is not defined in columns.`);
            }

            if (!Array.isArray(indexes) || indexes.length === 0) {
                throw new Error("Columns must be a non-empty array");
            }

            for (const idx of indexes) {
                for (const field of idx.fields) {
                    if (!(field in columns)) {
                        throw new Error(`Index field "${field}" not found in columns.`);
                    }
                }
            }

            return true;
        }
        catch(error) {
            const params = { schema_input, error };
            this.logger.log(`Error in ${this.name} - #validateSchemaInput method`, params);
            return false
        }
    }

    // Method to generate schema code content
    generateSchemaCode = (schema_input) => { 
        try {
            const {
                model_name, app_id, table_name, datasource_type, columns, primary_key,
                indexes = [], migration_priority = 1, timestamps = true,
            } = schema_input;

            if (!this.#validateSchemaInput(schema_input)) {
                this.logger.error("Schema input validation failed.");
                return false;
            }

            const columns_string = Object.entries(columns).map(([key, value]) => `        ${key}: ${JSON.stringify(value).replace(/"([^"]+)":/g, '$1:')},`).join("\n\n");

            const indexes_string = JSON.stringify(indexes, null, 4).replace(/"([^"]+)":/g, '$1:');

            const schema_obj = { 
                app_id, model_name, table_name, datasource_type, columns_string, 
                primary_key, timestamps, indexes_string, migration_priority 
            };

            return schema_code_template(schema_obj);
        }
        catch(error) {
            const params = { schema_input, error };
            this.logger.log(`Error in ${this.name} - generateSchemaCode method`, params);
            return false
        }
    }

}

module.exports = SchemaBuilderScript;