const getQueryBuilder       = require("../query_builders/query_builder_resolver");
const DatasourceRegistry    = require("../datasource_connectors/datasource_registry");
const EventSystem           = require("../utils/event_system_util");
const GlobalVariableManager = require("../utils/global_variable_manager");

class BaseModelUtil {
    constructor() {
        this.datasource_registry        = DatasourceRegistry.getInstance();
        this.global_vars                = GlobalVariableManager.getInstance();
        this.event_system               = new EventSystem();
    }


    // Get registered data source connection
    getConnector = (datasource_type) => { 
        const connector = this.datasource_registry.getDataSource(datasource_type);
        if (!connector) {
            throw new Error(`No connector found for datasource_type: ${datasource_type}`);
        }
        return connector;
    }

    // Get query builder for data source
    getQueryBuilder = (datasource_type, schema, associations, logger = null ) => { 
        return getQueryBuilder(datasource_type, schema, associations, logger); 
    }

    // Register an event listener for the current model
    on = (model_name, event, listener) => {
        this.event_system.on(`${model_name}:${event}`, listener);
    }

    // Trigger an event in the current model
    triggerHook = (model_name, hook, data, options) => {
        return this.event_system.emit(`${model_name}:${hook}`, data, options);
    }

    // method to validate db permission
    validatePermission = (schema, action) => {
        const { app_id, model_name }    = schema;
        const schema_files              = this.global_vars?.getVariable("SCHEMA_FILES") || [];
        const schema_obj                = schema_files.find((obj) => obj?.app_id === app_id && obj.model_name === model_name);
        const permissions               = schema_obj?.permissions || [];

        if (!permissions.includes(action)) {
            throw new Error(`Permission denied: ${action} not allowed on model ${model_name} for app ${app_id}.`);
        }

        return true;
    }

    // method to sanitice input data
    sanitizeFields = (schema, data) => {
        const allowed_fields = Object.keys(schema?.columns || {});

        return Object.fromEntries(Object.entries(data).filter(([key]) => allowed_fields.includes(key)));
    }

    // Method to get a unique array
    getUniqueArray = (schema, arr) => {
        const seen          = new Set();
        const unique_array   = [];
    
        for (const item of arr) {
            const key = typeof item === 'object' && item !== null ? JSON.stringify(item, Object.keys(item).sort())  : item;
    
            if (!seen.has(key)) {
                seen.add(key);
                const sanitzed_fields = this.sanitizeFields(schema, item);
                unique_array.push(sanitzed_fields);
            }
        }
    
        return unique_array;
    }

    denormalizeJoinedResult = (schema, row, includes = []) => {
        const base_model_fields = Object.keys(schema?.columns || {});
        const result            = {};

        // Assign base model fields
        for (const key in row) {
            const field_key = key.replace(`${schema?.table_name}.`, "");
            if (base_model_fields.includes(field_key)) {
                result[field_key] = row[key];
            }
        }
        
        // Process each include
        for (const include of includes) {
            const alias             = include.as || include.model?.schema?.table_name;
            const included_model    = include.model;
            const included_fields   = Object.keys(included_model?.schema?.columns || {});
            const nested_row        = {};

            for (const field of included_fields) {
                const full_key = `${alias}.${field}`;

                if (row.hasOwnProperty(full_key)) { nested_row[field] = row[full_key]; }
            }

            // Recursively handle nested includes
            if (include.include?.length) {
                result[alias] = this.denormalizeJoinedResult(included_model?.schema, nested_row, include.include);
            } 
            else { result[alias] = nested_row; }
        }

        return result;
    }

    // Method to get query method param obj
    buildQueryWithConnector = (query_params ) => {
        const { schema, associations, query_method_name, fields, where, options, amount, data = {} } = query_params;

        if (!schema) {
            throw new Error("Schema is required");
        }

        const datasource_type   = schema?.datasource_type;
        const qb                = this.getQueryBuilder(datasource_type, schema, associations);

        if (typeof qb?.[query_method_name] !== 'function') {
            throw new Error(`Query method '${query_method_name}' not found on query builder`);
        }
        
        const connector         = this.getConnector(datasource_type);
        const params            = { schema, fields, where, options, data, amount, table_name: schema?.table_name, table_columns: schema?.columns }
        const query             = qb?.[query_method_name](params);

        return { connector, query }
    }

    buildCountQueryWithConnector = (query_params ) => {
        const { schema, associations, query_method_name, fields, where, options, data = {} } = query_params;

        if (!schema) {
            throw new Error("Schema is required");
        }

        const datasource_type   = schema?.datasource_type;
        const qb                = this.getQueryBuilder(datasource_type, schema, associations);

        if (typeof qb?.[query_method_name] !== 'function') {
            throw new Error(`Query method '${query_method_name}' not found on query builder`);
        }
        
        const connector         = this.getConnector(datasource_type);
        const params            = { schema, fields, where, options, data, table_name: schema?.table_name, table_columns: schema?.columns }
        const count_query       = qb.selectCount(params);
        const data_query        = qb?.[query_method_name](params);

        return { connector, count_query, data_query }
    }

}

module.exports = BaseModelUtil;