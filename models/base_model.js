const BaseModelUtil = require("./base_model_util");

class BaseModel {
    // Default static properties (can be overridden by subclasses)
    static schema               = {};
    static associations         = [];
    static _model_util          = null;

    // Utility accessor (stateless instantiation)
    static get model_util () { 
        if (!this._model_util) {
            this._model_util = new BaseModelUtil();
        }
        return this._model_util;
    }

    // Safely access datasource type
    static get datasource_type() { return this.schema?.datasource_type; }

    // === Association Methods ===

    static getAssociations () { return this.associations || []; };

    static registerAssociation = (definition) => {
        if (!this.associations) {  this.associations = []; }

        this.associations.push(definition);
    };

    static hasMany (target, options) {
        return this.registerAssociation({ type: 'hasMany', source: this, model: target, ...options });
    };

    static hasOne (target, options) {
        return this.registerAssociation({ type: 'hasOne', source: this, model: target, ...options });
    };

    static belongsTo (target, options){
        return this.registerAssociation({ type: 'belongsTo', source: this, model: target, ...options });
    };

    static belongsToMany (target, options) {
        return this.registerAssociation({ type: 'belongsToMany', source: this, model: target, ...options });
    };

    // === Query Methods ===

    // Method to find record based on primary key
    static async findByPk (id, fields = [], options = {}) {
        if (!Array.isArray(fields)) {throw new Error("Expected 'fields' to be an array");}
    

        try {
            const { schema }    = this;

            this.model_util.validatePermission(schema, 'read', schema?.model_name);

            const associations          = this.getAssociations();
            const pk_field              = schema?.primary_key?.toString() || "id";
            const where                 = { [pk_field]: id };
            const query_params          = { schema, associations, query_method_name: "select", fields, where, options: { ...options, limit: 1 } };
            const { connector, query }  = this.model_util.buildQueryWithConnector(query_params);
            const result                = await connector.executeQuery(query, options);
            const row                   = result?.[0] || null;
            const normalized            = row ? this.model_util.denormalizeJoinedResult(schema, row, options?.include) : null;

            return normalized ? new this(normalized) : null;
        } catch (err) {
            console.error("findByPk error:", err);
            throw err;
        }
    }

    // Method to find a single record based on fields and conditions
    static async findOne (fields, where, options = {}) {
        if (!Array.isArray(fields)) {throw new Error("Expected 'fields' to be an array");}
        
        if (typeof where !== 'object') {throw new Error("Expected 'where' to be an object");}

        try {
            const { schema }    = this;

            this.model_util.validatePermission(schema, 'read', schema?.model_name);

            const associations          = this.getAssociations();
            const query_params          = { schema, associations, query_method_name: "select", fields, where, options: { ...options, limit: 1 } };
            const { connector, query }  = this.model_util.buildQueryWithConnector(query_params);
            const result                = await connector.executeQuery(query, options);
            const row                   = result?.[0] || null;
            const normalized            = row ? this.model_util.denormalizeJoinedResult(schema, row, options?.include) : null;
            
            return normalized ? new this(normalized) : null;
        } catch (err) {
            console.error("findOne error:", err);
            throw err;
        }
    }

    // Method to find all records based on fields and conditions
    static async findAll (fields, where, options = {}) {
        if (!Array.isArray(fields)) {throw new Error("Expected 'fields' to be an array");}
        
        if (typeof where !== 'object') {throw new Error("Expected 'where' to be an object");}

        try {
            const { schema }    = this;

            this.model_util.validatePermission(schema, 'read', schema?.model_name);

            const associations          = this.getAssociations();
            const query_params          = { schema, associations, query_method_name: "select", fields, where, options };
            const { connector, query }  = this.model_util.buildQueryWithConnector(query_params);
            const result                = await connector.executeQuery(query, options);
            
            return result.map((row) => { 
                const normalized_row    = row ? this.model_util.denormalizeJoinedResult(schema, row, options?.include)  : null
                return normalized_row ? new this(normalized_row) : null;
            });
        }
        catch (err) {
            console.error("findAll error:", err);
            throw err;
        }
    }

    // Method to count records based on conditions
    static async count (where, options = {}) {
        if (typeof where !== 'object') {throw new Error("Expected 'where' to be an object");}

        try {
            const { schema }    = this;

            this.model_util.validatePermission(schema, 'read', schema?.model_name);

            const associations          = this.getAssociations();
            const query_params          = { schema, associations, query_method_name: "selectCount", fields: null, where, options };
            const { connector, query }  = this.model_util.buildQueryWithConnector(query_params);
            const result                = await connector.executeQuery(query, options);
            const row                   = result && result.length ? result[0] : null

            return row?.count || 0;
        } catch (err) {
            console.error("count error:", err);
            throw err;
        }
    }

    // Method to find and count all records based on fields and conditions
    static async findAndCountAll (fields, where, options = {}) {
        if (!Array.isArray(fields)) {throw new Error("Expected 'fields' to be an array");}

        if (typeof where !== 'object') {throw new Error("Expected 'where' to be an object");}

        try {
            const { schema }    = this;

            this.model_util.validatePermission(schema, 'read', schema?.model_name);

            const associations                              = this.getAssociations();
            const query_params                              = { schema, associations, query_method_name: "select", fields, where, options };
            const { connector, count_query, data_query }    = this.model_util.buildCountQueryWithConnector(query_params);
            const [countResult, rows_result]                = await Promise.all([
                connector.executeQuery(count_query, options),
                connector.executeQuery(data_query, options),
            ]);

            const normalized_rows = rows_result.map((row) => { 
                const normalized_row    = row ? this.model_util.denormalizeJoinedResult(schema, row, options?.include)  : null
                return normalized_row ? new this(normalized_row) : null;
            });

            return { count: countResult?.[0]?.count || 0, rows: normalized_rows };
        } catch (err) {
            console.error("findAndCountAll error:", err);
            throw err;
        }
    }

    // Method to create a new record
    static async create (data, options = {}) {
        if (typeof data !== 'object') {throw new Error("Expected 'data' to be an object");}

        try {
            const { schema }    = this;
            let full_row        = data;

            this.model_util.validatePermission(schema, 'create', schema?.model_name);

            const associations          = this.getAssociations();
            const sanitzed_fields       = this.model_util.sanitizeFields(schema, data);
            const query_params          = { schema, associations, query_method_name: "insert", fields: null, where: null, options, data: sanitzed_fields };
            const { connector, query }  = this.model_util.buildQueryWithConnector(query_params);

            this.model_util.triggerHook(schema?.model_name, 'before_create', data, options);

            const { insertId: insert_id } = await connector.executeQuery(query, options);

            if(!insert_id) { return null }

            const fetch_query       = `SELECT * FROM ${schema?.table_name} WHERE id = ? LIMIT 1`;
            const [row]             = await connector.executeQuery(fetch_query, { params: [insert_id] });
            full_row                = row || data; 
            const normalized_row    = this.model_util.denormalizeJoinedResult(schema, full_row, options?.include)
            const new_instance      = normalized_row ? new this(normalized_row) : null;

            this.model_util.triggerHook(schema?.model_name, 'after_create', new_instance, options);
            return new_instance;
        } catch (err) {
            console.error("create error:", err);
            throw err;
        }
    }

    // Method to bulk create records
    static async bulkCreate (data, options = {}) {
        if (!Array.isArray(data)) {throw new Error("Expected 'data' to be an array");}

        try {
            const { schema }    = this;
            let full_rows        = data;

            this.model_util.validatePermission(schema, 'create', schema?.model_name);

            const ignore_duplicates = options.ignore_duplicates !== false;

            if (ignore_duplicates) { full_rows = this.model_util?.getUniqueArray(schema, data); }

            else { full_rows = data.map((row) => this.model_util.sanitizeFields(schema, row)); }

            const associations          = this.getAssociations();
            const query_params          = { schema, associations, query_method_name: "bulkInsert", fields: null, where: null, options, data: full_rows };
            const { connector, query }  = this.model_util.buildQueryWithConnector(query_params);

            this.model_util.triggerHook(schema?.model_name, 'before_bulk_create', data, options);

            const result        = await connector.executeQuery(query);
            const new_instances  = full_rows.map((row) => { 
                const normalized_row = this.model_util.denormalizeJoinedResult(schema, row, options?.include);
                return new this(normalized_row);
            });

            console.log({ result });
            this.model_util.triggerHook(schema?.model_name, 'after_bulk_create', new_instances, options);
            return new_instances;
        } catch (err) {
            console.error("bulkCreate error:", err);
            throw err;
        }
    }

    // Method to update records based on conditions
    static  async update (data, where, options = {}) {
        if (typeof data !== 'object') {throw new Error("Expected 'data' to be an object");}

        if (typeof where !== 'object') {throw new Error("Expected 'where' to be an object");}

        try {
            const { schema }    = this;

            this.model_util.validatePermission(schema, 'update', schema?.model_name);

            const associations          = this.getAssociations();
            const pk_field              = schema.primary_key?.toString() || "id";
            const final_where           = where || { [pk_field]: this[pk_field] };
            const sanitzed_fields       = this.model_util.sanitizeFields(schema, data);
            const query_params          = { schema, associations, query_method_name: "update", fields: null, where: final_where, options, data: sanitzed_fields };
            const { connector, query }  = this.model_util.buildQueryWithConnector(query_params);

            this.model_util.triggerHook(schema?.model_name, 'before_update', data, options);

            const result            = await connector.executeQuery(query, options);
            
            if (result?.affectedRows === 0) { return null; }

            this.model_util.triggerHook(schema?.model_name, 'after_update', data, options);
            return true;
        } catch (err) {
            console.error("update error:", err);
            throw err;
        }
    }

    // Method to increment a record field based on conditions
    static  async increment (field, where = null, amount = 1, options = {}) {
        if (!field || typeof field !== 'string') {throw new Error("Expected 'field' to be a string");}

        if (typeof where !== 'object') {throw new Error("Expected 'where' to be an object");}

        if (typeof amount !== 'number') {throw new Error("Expected 'amount' to be a number");}

        if (!this.schema?.columns[field]) {throw new Error(`Expected 'field' to be one of ${Object.keys(this.schema?.columns)}`);}

        try {
            const { schema }    = this;

            this.model_util.validatePermission(schema, 'update', schema?.model_name);

            const associations          = this.getAssociations();
            const pk_field              = schema.primary_key?.toString() || "id";
            const final_where           = where || { [pk_field]: this[pk_field] };
            const query_params          = { schema, associations, query_method_name: "increment", fields: [field], where: final_where, options, data: null, amount };
            const { connector, query }  = this.model_util.buildQueryWithConnector(query_params);

            this.model_util.triggerHook(schema?.model_name, 'before_increment', { field, amount, where: final_where }, options);

            const result        = await connector.executeQuery(query, options);

            this.model_util.triggerHook(schema?.model_name, 'after_increment', { field, amount, where: final_where }, options);
            return true;
        } catch (err) {
            console.error("increment error:", err);
            throw err;
        }
    }

    // Method to decrement a record field based on conditions
    static  async decrement (field, where = null, amount = 1, options = {}) {
        if (!field || typeof field !== 'string') {throw new Error("Expected 'field' to be a string");}

        if (typeof where !== 'object') {throw new Error("Expected 'where' to be an object");}

        if (typeof amount !== 'number') {throw new Error("Expected 'amount' to be a number");}

        if (!this.schema?.columns[field]) {throw new Error(`Expected 'field' to be one of ${Object.keys(this.schema?.columns)}`);}

        try {
            const { schema }    = this;

            this.model_util.validatePermission(schema, 'update', schema?.model_name);

            const associations          = this.getAssociations();
            const pk_field              = schema.primary_key?.toString() || "id";
            const final_where           = where || { [pk_field]: this[pk_field] };
            const query_params          = { schema, associations, query_method_name: "decrement", fields: [field], where: final_where, options, data: null, amount };
            const { connector, query }  = this.model_util.buildQueryWithConnector(query_params);

            this.model_util.triggerHook(schema?.model_name, 'before_decrement', { field, amount, where: final_where }, options);

            const result        = await connector.executeQuery(query, options);

            this.model_util.triggerHook(schema?.model_name, 'after_decrement', { field, amount, where: final_where }, options);
            return true;
        } catch (err) {
            console.error("decrement error:", err);
            throw err;
        }
    }

    // Method to delete records based on conditions
    static async delete (where, options = {}) {
        if (typeof where !== 'object') {throw new Error("Expected 'where' to be an object");}


        try {
            const { schema }    = this;

            this.model_util.validatePermission(schema, 'delete', schema?.model_name);

            const associations          = this.getAssociations();
            const pk_field              = schema.primary_key?.toString() || "id";
            const final_where           = where || { [pk_field]: this[pk_field] };
            const query_params          = { schema, associations, query_method_name: "delete", fields: null, where: final_where, options };
            const { connector, query }  = this.model_util.buildQueryWithConnector(query_params);

            this.model_util.triggerHook(schema?.model_name, 'before_delete', final_where, options);

            const result        = await connector.executeQuery(query, options);

            this.model_util.triggerHook(schema?.model_name, 'after_delete', final_where, options);
            return result?.affectedRows > 0;
        } catch (err) {
            console.error("delete error:", err);
            throw err;
        }
    }


    // === Constructor ===

    constructor(data = {}) {
        Object.assign(this, data); // Assign data to instance properties
        this.addComputedAttributes(); // No-op unless overridden
    }

    // Method to add fields 
    #addMSchemaFieldsToModel = (data) => {
        const schema_fields = Object.keys(this.constructor.schema?.columns || {});

        for (const key of schema_fields) {
            this[key] = data[key];
        }
    }

    // Default implementation, override in subclass if needed
    addComputedAttributes () { }
}

module.exports = BaseModel;
