declare class SchemaBuilderScript {
    private global_vars;
    private app_id;
    private permissions;
    private app_data;
    constructor();
    private validatePermission;
    private loadExistingSchemas;
    private validateInputs;
    createSchema: (schema_inputs: any) => void;
    deleteSchema: (model_name: string) => void;
}
export default SchemaBuilderScript;
