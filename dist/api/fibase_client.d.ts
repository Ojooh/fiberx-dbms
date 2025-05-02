import GlobalVariableManager from "../utils/global_variable_manager";
declare class FibaseAPIClient {
    global_vars: GlobalVariableManager;
    private fibase_url;
    private public_key;
    private secret_key;
    private app_id;
    private fibase_app_endpoint;
    constructor(app_id: string, public_key: string);
    private generateSignature;
    private generateAuthHeaders;
    sendHandShake(): Promise<void>;
    isCacheValid(): boolean;
    refreshCacheIfNeeded: () => Promise<void | null>;
}
export default FibaseAPIClient;
