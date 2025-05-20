const crypto                    = require("crypto");
const axios                     = require("axios");
const GlobalVariableManager     = require("../utils/global_variable_manager");

class FibaseAPIClient {
	constructor(app_id, public_key, fibase_base_url = null, logger = null) {
        this.name 					= "fibase_api_client";
		this.app_id 				= app_id;
		this.public_key 			= public_key;
        this.logger 				= logger || console;


		this.global_vars            = GlobalVariableManager.getInstance();


		this.fibase_url 			= fibase_base_url|| "https://api.fiberxinnovations.com/api";
		this.fibase_app_endpoint	= "/app-schema-info"
	}

    // Method to generate signature
	#generateSignature = (payload, secret_key) => {
		return crypto.createHmac('sha256', secret_key).update(payload).digest('hex');
	}

	// Method to generate auth headers
	#generateAuthHeaders = () => {
		const timestamp     = Date.now().toString();
		const payload       = `${this.app_id}:${this.public_key}:${timestamp}`;
		const signature     = this.#generateSignature(payload, this.public_key);
	
		return {
		  'X-App-Id': this.app_id,
		  'X-Public-Key': this.public_key,
		  'X-Timestamp': timestamp,
		  'X-Signature': signature
		};
	}

    // Method to store API response data
    storeAPIResponseData = (api_data) => {
        const { datasources, schema_files = [], migration_files = [] } = api_data;

        this.global_vars.setVariable("DATA_SOURCES", datasources);
        this.global_vars.setVariable("SCHEMA_FILES", schema_files);
        this.global_vars.setVariable("MIGRATION_FILES", migration_files);
        return true;
    }

    // Method to assert handshake completion
    assertHandshakeComplete() {
        if (!this.global_vars.getVariable("SCHEMA_FILES")) {
            throw new Error("Handshake or manual setup not completed. Cannot proceed.");
        }
        return true
    }

    // Method to validate app and fetch schema urls
    sendHandShake = async () => {
        try {
            const headers       = this.#generateAuthHeaders();
            const url           = `${this.fibase_url}${this.fibase_app_endpoint}`;
            const response      = await axios.post(url, {}, { headers });

            this.storeAPIResponseData(response.data);
            console.log('[FIBASE] Handshake successful.');
            return true
        } catch (error) {
            const params = { error };
            this.logger.error(`❌ Error in ${this.name} - sendHandShake method`, params);
            throw error;
        }
    }

}

module.exports = FibaseAPIClient;
