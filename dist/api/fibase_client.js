"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const global_variable_manager_1 = __importDefault(require("@/utils/global_variable_manager"));
class FibaseAPIClient {
    constructor(app_id, public_key) {
        // Method to re send handshake if cached data expired
        this.refreshCacheIfNeeded = async () => {
            if (!this.isCacheValid()) {
                return await this.sendHandShake();
            }
            return Promise.resolve(null);
        };
        this.app_id = app_id;
        this.public_key = public_key;
        this.global_vars = global_variable_manager_1.default.getInstance();
        this.fibase_url = this.global_vars.getVariable('ENV')?.FIBASE_ADMIN_URL || "https://api.fibase.io/api";
        this.fibase_app_endpoint = "/app-models-info";
        this.secret_key = this.global_vars.getVariable('ENV')?.SECRET_KEY;
    }
    // Method to generate signature
    generateSignature(payload, secret_key) {
        return crypto_1.default.createHmac('sha256', secret_key).update(payload).digest('hex');
    }
    // Method to generate auth headers
    generateAuthHeaders() {
        const timestamp = Date.now().toString();
        const payload = `${this.app_id}:${this.public_key}:${timestamp}`;
        const signature = this.generateSignature(payload, this.secret_key);
        return {
            'X-App-Id': this.app_id,
            'X-Public-Key': this.public_key,
            'X-Timestamp': timestamp,
            'X-Signature': signature
        };
    }
    // Method to send hand shake
    async sendHandShake() {
        try {
            const headers = this.generateAuthHeaders();
            const url = `${this.fibase_url}${this.fibase_app_endpoint}`;
            const response = await axios_1.default.post(url, {}, { headers });
            const data = response.data;
            console.log({ data });
            // Store in GlobalVariableManager
            this.global_vars.setVariable("ENVIRONMENTS", data?.environments);
            this.global_vars.setVariable("DATA_SOURCES", data?.data_sources);
            this.global_vars.setVariable("CONNECTIONS", data?.connections);
            this.global_vars.setVariable("APP_ID", data?.app_id);
            this.global_vars.setVariable("MODEL_PERMISSIONS", data?.apps_with_model_permissions);
            this.global_vars.setVariable("FIBASE_EXPIRES_AT", data?.expires_at);
            console.log('[FIBASE] Handshake successful.');
        }
        catch (error) {
            const params = { error };
            console.error(`error in sendHandShake method`, params);
            throw error;
        }
    }
    // Method to validate if cached data is valid
    isCacheValid() {
        const expires_at = this.global_vars.getVariable('FIBASE_EXPIRES_AT');
        return expires_at && Date.now() < expires_at;
    }
}
exports.default = FibaseAPIClient;
