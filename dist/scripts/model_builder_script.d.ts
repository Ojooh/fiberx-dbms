declare class ModelBuilderScript {
    private global_vars;
    private app_id;
    private permissions;
    private app_data;
    private schemas_root;
    constructor();
    generateModels: (output_dir: string) => void;
}
export default ModelBuilderScript;
