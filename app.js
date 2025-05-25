
const fs                            = require("fs");
const path                          = require("path");
const crypto                        = require("crypto");

const GlobalVariableManager         = require("./utils/global_variable_manager");

const FibaseAPIClient               = require("./api/fibase_client");
const DatasourceRegistry            = require("./datasource_connectors/datasource_registry");

const ModelAndSchemaLoaderScript    = require("./scripts/model_and_schema_loader_script");
const SchemaBuilderScript           = require("./scripts/schema_builder_script");
const MigrationBuilderScript        = require("./scripts/migration_builder_script");

class FiberXDBMS {
    constructor(app_id, public_key, fibase_base_url = null, logger = null) {
        this.name                   = "fiberx_dbms";  
        this.app_id                 = app_id;
        this.public_key             = public_key;

        this.logger                 = logger || console;
        this.fibase_client          = new FibaseAPIClient(app_id, public_key, fibase_base_url, logger);
        this.schema_fetcher         = new ModelAndSchemaLoaderScript(logger);

        this.datasource_register    = DatasourceRegistry.getInstance(this.logger);
        this.global_vars            = GlobalVariableManager.getInstance();
    }

    // Method to check if the app is a central app
    #isCentralApp = (app_id, public_key) => {
        try { 
            const identity_path = path.resolve(process.cwd(), "configs", "fibase_identity.json");

            if (!fs.existsSync(identity_path)) { return false; }

            const file  = JSON.parse(fs.readFileSync(identity_path, "utf-8"));

            const { app_id: file_app_id, issued_at, signature } = file;

            if (!file_app_id || !issued_at || !signature) { return false; }

            if (app_id !== file_app_id) { return false; }

            const payload               = `${app_id}:${issued_at}`;
            const expected_signature    = crypto.createHmac("sha256", public_key).update(payload).digest("hex");
            
            return expected_signature === signature;
        }
        catch (error) {
            const params = { error };
            this.logger.error(`Error in ${this.name} - isCentralApp method`, params)
            return false
        }

    }

    // Method to register data source connection
    #registerDataSourceCoonectors = async () => {
        const data_sources          = this.global_vars.getVariable('DATA_SOURCES');

        for (const source of data_sources) {
            const { name, type, connection } = source; 

            if (type && connection) {
                await this.datasource_register.initializeConnector(type, connection);
                this.logger.log(`[FiberXDBMS] Datasource "${name} - ${type}" registered successfully.`);
            } else {
                this.logger.error(`[FiberXDBMS] No connection config found for datasource "${source}".`);
            }
        }
    }

    // Method to get data source 
    getRegistredDataSource = async (datasource_type) => {
        if (!this.fibase_client.assertHandshakeComplete()) {
            this.logger.error(`Handshake failed for app_id: ${this.app_id} is_central_app: ${is_central_app}`);
            return false;
        }

        return this.datasource_register.getDataSource(datasource_type);

    }

    // Method to initialize DBMS
    initializeDBMS = async (manaual_schema_urls = []) => {
        try {
            const is_central_app = this.#isCentralApp(this.app_id, this.public_key);

            if(is_central_app) { this.fibase_client.storeAPIResponseData(manaual_schema_urls); }

            else { await this.fibase_client.sendHandShake(); }

            if (this.fibase_client.assertHandshakeComplete()) {
                this.logger.log(`Handshake complete for app_id: ${this.app_id}`);

                this.logger.log(`Registering data source connectors...`);
                await this.#registerDataSourceCoonectors();
                this.logger.log(`Data source connectors registered successfully.`);


                this.logger.log(`Fetching schema and migration files...`);
                await this.schema_fetcher.run();
                this.logger.log(`Schema and migration files fetched successfully.`);

                return true
            }
            else {
                this.logger.error(`Handshake failed for app_id: ${this.app_id} is_central_app: ${is_central_app}`);
                return false;
            }
        }
        catch (error) {
           const params = { error };
           this.logger.error(`Error in ${this.name} - initializeDBMS method`, params)
        }

    }

    // Static Method to return schema code content
    static getSchemaCodeContent = (file_name, model_name, app_id, table_name, datasource_type, migration_priority = 1, columns = [], primary_key = "id", indexes = [], timestamps = true, logger = null) => {
        try {
            const schema_builder    = new SchemaBuilderScript(logger);
            const schema_input      = { file_name, model_name, app_id, table_name, datasource_type, columns, primary_key, indexes, migration_priority, timestamps };
            const schema_code       = schema_builder.generateSchemaCode(schema_input);
            
            return schema_code

        }
        catch (error) {
           const params = { error };
           this.logger.error(`Error in ${this.name} - getSchemaCodeContent method`, params);
           return false;
        }
    }

    // Static Method to return schema code content
    static generateMigrationCodeContent = (migration_input, delta = false, logger = null) => {
        try {
            const migration_builder    = new MigrationBuilderScript(logger);
            
            if(delta) {
                return migration_builder.generateDeltaMigrationCode(migration_input)
            }
            else {
                return migration_builder.generateInitialMigrationCode(migration_input)
            }

        }
        catch (error) {
           const params = { error };
           this.logger.error(`Error in ${this.name} - generateMigrationCodeContent method`, params);
           return false;
        }
    }

}

module.exports = FiberXDBMS;


