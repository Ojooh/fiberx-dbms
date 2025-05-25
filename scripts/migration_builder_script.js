

const { 
    initialMigrationCodeTemplate,
    deltaMigrationCodeTemplate
} = require("./code_template");


class MigrationBuilderScript {
    constructor(logger = null) {
        this.name           = "schema_builder_script";
        this.logger         = logger || console;
        this.source_types   = ["mysql_db", "postgressql_db", "mongo_db"];
    }

    // Method to validate initial migration input
    #validateInitialMigrationInput = (migration_input) => {
        try {
            const { app_id, model_name, column_names, index_names  } = migration_input;

            if (!model_name || !app_id || !column_names || !index_names) {
                throw new Error("Missing required fields in migration input");
            }

            if(!Array.isArray(column_names) || !column_names.length) {
                throw new Error("Column names field is Empty");
            }

             if(!Array.isArray(index_names) || !index_names.length) {
                throw new Error("Index names field is Empty");
            }

            return true;
        }
        catch(error) {
            const params = { schema_input, error };
            this.logger.log(`Error in ${this.name} - #validateInitialMigrationInput method`, params);
            return false
        }
    }

    // Method to validate delta migration input
    #validateDeltaMigrationInput = (migration_input) => {
        try {
            const {  model_name, app_id, added_cols, added_indx, removed_cols, removed_indx  } = migration_input;
           

            if (!model_name || !app_id) {
                throw new Error("Missing required fields in migration input");
            }

            if(!Array.isArray(added_cols)) {
                throw new Error("new columns field value is invalid must be an array");
            }

            if(!Array.isArray(added_indx)) {
                throw new Error("new index field value is invalid must be an array");
            }

            if(!Array.isArray(removed_cols)) {
                throw new Error("Remove column field value is invalid must be an array");
            }

            if(!Array.isArray(removed_indx)) {
                throw new Error("Remove index field value is invalid must be an array");
            }

            return true;
        }
        catch(error) {
            const params = { schema_input, error };
            this.logger.log(`Error in ${this.name} - #validateDeltaMigrationInput method`, params);
            return false
        }
    }

    // Method to generate delta migration code content
    generateDeltaMigrationCode = (migration_input) => { 
        try {
            if (!this.#validateDeltaMigrationInput(migration_input)) {
                this.logger.error("Schema input validation failed.");
                return false;
            }

            return deltaMigrationCodeTemplate(migration_input);
        }
        catch(error) {
            const params = { migration_input, error };
            this.logger.log(`Error in ${this.name} - generateDeltaMigrationCode method`, params);
            return false
        }
    }

    // Method to generate initial migration code content
    generateInitialMigrationCode = (migration_input) => { 
        try {
            if (!this.#validateInitialMigrationInput(migration_input)) {
                this.logger.error("Migration input validation failed.");
                return false;
            }

            return initialMigrationCodeTemplate(migration_input);
        }
        catch(error) {
            const params = { migration_input, error };
            this.logger.log(`Error in ${this.name} - generateInitialMigrationCode method`, params);
            return false
        }
    }

}

module.exports = MigrationBuilderScript;