
const fs                            = require("fs");
const path                          = require("path");
const crypto                        = require("crypto");

const FibaseAPIClient               = require("./api/fibase_client");
const ModelAndSchemaLoader          = require("./scripts/model_and_schema_loader");
const DatasourceRegistry            = require("./datasource_connectors/datasource_registry");

class FiberXDBMS {
    constructor(app_id, public_id, fibase_base_url = null, logger = null) {
        this.name                   = "fiberx_dbms";  
        this.app_id                 = app_id;
        this.public_id              = public_id;

        this.logger                 = logger || console;
        this.fibase_client          = new FibaseAPIClient(app_id, public_id, fibase_base_url, logger);
        this.schema_fetcher         = new ModelAndSchemaLoader(logger);
        this.datasource_register    = DatasourceRegistry.getInstance();
    }

    // Method to check if the app is a central app
    #isCentralApp = (app_id, public_key) => {
        try { 
            const identity_path = path.resolve(process.cwd(), "config", "fibase_identity.json");

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
            params = { error };
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
                console.log(`[FiberXDBMS] Datasource "${name} - ${type}" registered successfully.`);
            } else {
                console.warn(`[FiberXDBMS] No connection config found for datasource "${source}".`);
            }
        }
    }

    // Method to initialize DBMS
    initializeDBMS = async (manaual_schema_urls = []) => {
        try {
            const is_central_app = this.#isCentralApp(app_id, public_id);

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
            }
            else {
                this.logger.error(`Handshake failed for app_id: ${this.app_id}`);
                return;
            }
        }
        catch (error) {
           params = { error };
           this.logger.error(`Error in ${this.name} - initializeDBMS method`, params)
        }

    }

}

module.exports = FiberXDBMS;

const fibase_dbms = new FiberXDBMS("app_id", "public_key");
fibase_dbms.initializeDBMS(["https://example.com/schema1.json", "https://example.com/schema2.json"])
    .then(() => {
        console.log("DBMS initialized successfully.");
    })
    .catch((error) => {
        console.error("Error initializing DBMS:", error);
    });