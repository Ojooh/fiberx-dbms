import crypto from "crypto";
import axios from "axios";
import GlobalVariableManager from "../utils/global_variable_manager";
import { 
    FibaseHandshakeRequestInterface, 
    FibaseHandshakeResponseInterface 
} from "../types/common_types"

class FibaseAPIClient {
	public global_vars:GlobalVariableManager
	private fibase_url: string;
	private public_key: string;
	private secret_key: string;
	private app_id: string;
	private fibase_app_endpoint: string;

	constructor(app_id: string, public_key: string) {
		this.app_id 				= app_id;
		this.public_key 			= public_key;
		this.global_vars            = GlobalVariableManager.getInstance();
		this.fibase_url 			= this.global_vars.getVariable('ENV')?.FIBASE_ADMIN_URL || "https://api.fibase.io/api";
		this.fibase_app_endpoint	= "/app-models-info"
		this.secret_key 			= this.global_vars.getVariable('ENV')?.SECRET_KEY;
	}

	// Method to generate signature
	private generateSignature(payload: string, secret_key: string): string {
		return crypto.createHmac('sha256', secret_key).update(payload).digest('hex');
	}

	// Method to generate auth headers
	private generateAuthHeaders(): { [key: string]: string } {
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
	public async sendHandShake(): Promise<void> {
		try {
			const headers 	= this.generateAuthHeaders();
			const url 		= `${this.fibase_url}${this.fibase_app_endpoint}`;
			const response 	= await axios.post<FibaseHandshakeResponseInterface>(url, {}, { headers });
			const data 		= response.data;
			console.log({ data })
		
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
	isCacheValid(): boolean {
		const expires_at = this.global_vars.getVariable('FIBASE_EXPIRES_AT');
		return expires_at && Date.now() < expires_at;
	}

	// Method to re send handshake if cached data expired
	refreshCacheIfNeeded = async (): Promise<void | null> => {
		if (!this.isCacheValid()) { return await this.sendHandShake(); }
		
		return Promise.resolve(null);
	}
}

export default FibaseAPIClient;
