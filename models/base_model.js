const getQueryBuilder       = require("../query_builders/query_builder_resolver");
const DatasourceRegistry    = require("../datasource_connectors/datasource_registry");
const EventSystem           = require("../utils/event_system_util");
const GlobalVariableManager = require("../utils/global_variable_manager");

class BaseModel {
    static associations = [];

    constructor(data) {
        this.event_system = new EventSystem();

        Object.assign(this, data);
        this.schema = data?.schema;
        this.datasource_type = data?.schema?.datasource_type;

        this.addComputedAttributes();
    }

    // method to get model associations
    getAssociations = () => { return this.associations || []; }

    // Get registered data source connection
    #getConnector = () => { return DatasourceRegistry.getInstance().getDataSource(this.datasource_type); }

    // Get query builder for data source
    #getQueryBuilder = () => { return getQueryBuilder(this.datasource_type); }

    // Trigger an event in the current model
    #triggerHook = (hook, data, options) => { this.event_system.emit(hook, data, options); }

    // method to validate db permission
    #validatePermission = (action, model_name) => {
        const { app_id, model_name: schema_model_name } = this.schema;

        const global_vars       = GlobalVariableManager.getInstance();
        const schema_files      = global_vars?.getVariable("SCHEMA_FILES") || [];
        const schema_obj        = schema_files.find((obj) => { return obj?.app_id === app_id && obj.model_name === schema_model_name });
        const permissions       = schema_obj?.permissions || [];


        if (!permissions || !permissions.includes(action)) {
            throw new Error(`Permission denied: ${action} not allowed on model ${model_name} for app ${app_id}.`);
        } 
        else { return true; }
    }

    // Method to get a unique array
    #getUniqueArray = (arr) => {
        const seen          = new Set();
        const unique_array   = [];
    
        for (const item of arr) {
            const key = typeof item === 'object' && item !== null ? JSON.stringify(item, Object.keys(item).sort())  : item;
    
            if (!seen.has(key)) {
                seen.add(key);
                unique_array.push(item);
            }
        }
    
        return unique_array;
    }
    

    // Register an event listener for the current model
    on = (event, listener) => { this.event_system.on(event, listener); }

    // Add computed fields to instance (to override in child classes)
    addComputedAttributes = () => {}

    // method to register associations
    registerAssociation = (def) => {
        if (!this.associations) this.associations = [];
        this.associations.push(def);
    }

    // Define a one-to-many relationship (e.g., User hasMany Posts)
    hasMany = (target, options) => { this.registerAssociation({type: 'hasMany', source: this, model: target,  ...options }); }

    // Define a one-to-one relationship (e.g., User hasOne Profile)
    hasOne = (target, options) => { this.registerAssociation({ type: 'hasOne', source: this, model: target, ...options }); }

    // Define an inverse relationship (e.g., Post belongsTo User)
    belongsTo = (target, options) => { this.registerAssociation({ type: 'belongsTo', source: this, model: target, ...options }); }

    // Define a many-to-many relationship (e.g., Post belongsToMany Tag through PostTag)
    belongsToMany(target, options) { this.registerAssociation({ type: 'belongsToMany', source: this, model: target, ...options }); }


    // Method to find record based on primary key
    findByPk = async (id, fields, options = {}) => {
        try {
            this.#validatePermission('read', this.schema.model_name);

            const pk_field          = this.schema.primary_key?.toString() || "id";
            const where             = { [pk_field]: id };
            const qb                = this.#getQueryBuilder();
            const connector         = this.#getConnector()
            const query             = qb.select(this, this.schema.table_name, fields, where, { ...options, limit: 1 });
            const results           = await connector.executeQuery(query, options);

            return results?.[0] ? new this.constructor({ ...results[0], schema: this.schema }) : null;
        } catch (err) {
            console.error("findByPk error:", err);
            throw err;
        }
    }

    count = async (where, options = {}) => {
        try {
            this.#validatePermission('read', this.schema.model_name);

            const qb            = this.#getQueryBuilder();
            const connector     = this.#getConnector()
            const query         = qb.selectCount(this, this.schema.table_name, where, options);
            const result        = await connector.executeQuery(query, options);

            return result?.[0]?.count || 0;
        } catch (err) {
            console.error("count error:", err);
            throw err;
        }
    }

    findOne = async (fields, where, options = {}) => {
        try {
            this.#validatePermission('read', this.schema.model_name);

            const qb            = this.#getQueryBuilder();
            const connector     = this.#getConnector()
            const query         = qb.select(this, this.schema.table_name, fields, where, { ...options, limit: 1 });
            const results       = await connector.executeQuery(query, options);

            return results?.[0] ? new this.constructor({ ...results[0], schema: this.schema }) : null;
        } catch (err) {
            console.error("findOne error:", err);
            throw err;
        }
    }

    findAll = async (fields, where, options = {}) => {
        try {
            this.#validatePermission('read', this.schema.model_name);

            const qb            = this.#getQueryBuilder();
            const connector     = this.#getConnector()
            const query         = qb.select(this, this.schema.table_name, fields, where, options);
            const results       = await connector.executeQuery(query, options);

            return results.map(row => { return new this.constructor({ ...row, schema: this.schema })});
        } catch (err) {
            console.error("findAll error:", err);
            throw err;
        }
    }

    findAndCountAll = async (fields, where, options = {}) => {
        try {
            this.#validatePermission('read', this.schema.model_name);

            const qb                = this.#getQueryBuilder();
            const connector         = this.#getConnector()
            const count_query       = qb.selectCount(this, this.schema.table_name, where);
            const data_query        = qb.select(this, this.schema.table_name, fields, where, options);

            const [countResult, rows_result] = await Promise.all([
                connector.executeQuery(count_query, options),
                connector.executeQuery(data_query, options),
            ]);

            return {
                count: countResult?.[0]?.count || 0,
                rows: rows_result.map(row => { return new this.constructor({ ...row, schema: this.schema })}),
            };
        } catch (err) {
            console.error("findAndCountAll error:", err);
            throw err;
        }
    }

    create = async (data, options = {}) => {
        try {
            this.#validatePermission('create', this.schema.model_name);
            this.#triggerHook('before_create', data, options);

            const qb            = this.#getQueryBuilder();
            const connector     = this.#getConnector()
            const query         = qb.insert(this.schema.table_name, data, options);
            const result        = await connector.executeQuery(query, options);
            const insert_id     = result?.insertId;
            let full_row        = data;
            if (insert_id) {
                const fetch_query = `SELECT * FROM ${this.schema.table_name} WHERE id = ? LIMIT 1`;
                const [row] = await connector.executeQuery(fetch_query, { params: [insert_id] });
                full_row = row || data;
            }

            const new_instance  = result ? new this.constructor({ ...result, ...full_row, schema: this.schema }) : null

            this.#triggerHook('after_create', new_instance, options);
            return new_instance;
        } catch (err) {
            console.error("create error:", err);
            throw err;
        }
    }

    bulkCreate = async (data, options = {}) => {
        try {
            this.#validatePermission('create', this.schema.model_name);
            this.#triggerHook('before_bulk_create', data, options);

            const ignore_duplicates = options.ignore_duplicates !== false;

            let final_data = data;

            if (ignore_duplicates) {
                final_data = this.#getUniqueArray(data);
            }

            const qb            = this.#getQueryBuilder();
            const connector     = this.#getConnector()
            const query         = qb.bulkInsert(this.schema, final_data, options);
            const result        = await connector.executeQuery(query);
            const new_instances  = result ? final_data.map(row => { return new this.constructor({ ...row, schema: this.schema })}) : null

            this.#triggerHook('after_bulk_create', new_instances, options);
            return new_instances;
        } catch (err) {
            console.error("create error:", err);
            throw err;
        }
    }

    update = async (data, where, options = {}) => {
        try {
            this.#validatePermission('update', this.schema.model_name);
            this.#triggerHook('before_update', data, options);

            const qb            = this.#getQueryBuilder();
            const connector     = this.#getConnector();
            const pk_field      = this.schema.primary_key?.toString() || "id";
            const final_where   = where || { [pk_field]: this[pk_field] };
            const query         = qb.update(this.schema.table_name, final_where, data, options);
            const result        = await connector.executeQuery(query, options);
            console.log({ result })

            this.#triggerHook('after_update', this);
            return true;
        } catch (err) {
            console.error("update error:", err);
            throw err;
        }
    }

    increment = async (field, where = null, amount = 1, options = {}) => {
        try {
            this.#validatePermission('update', this.schema.model_name);
            this.#triggerHook('before_increment', { field, amount }, options);

            const qb            = this.#getQueryBuilder();
            const connector     = this.#getConnector();
            const pk_field      = this.schema.primary_key?.toString() || 'id';
            const final_where   = where || { [pk_field]: this[pk_field] };

            const query         = qb.increment(this.schema.table_name, final_where, field, amount);
            const result        = await connector.executeQuery(query, options);

            this.#triggerHook('after_increment', { field, amount }, options);
            return true;
        } catch (err) {
            console.error("increment error:", err);
            throw err;
        }
    }

    decrement = async (field, where = null, amount = 1,  options = {}) => {
        try {
            this.#validatePermission('update', this.schema.model_name);
            this.#triggerHook('before_decrement', { field, amount }, options);

            const qb            = this.#getQueryBuilder();
            const connector     = this.#getConnector();
            const pk_field      = this.schema.primary_key?.toString() || 'id';
            const final_where   = where || { [pk_field]: this[pk_field] };

            const query         = qb.decrement(this.schema.table_name, final_where, field, amount);
            const result        = await connector.executeQuery(query, options);

            this.#triggerHook('after_decrement', { field, amount }, options);
            return true;
        } catch (err) {
            console.error("decrement error:", err);
            throw err;
        }
    }

    destroy = async (where, options = {}) => {
        try {
            this.#validatePermission('delete', this.schema.model_name);
            this.#triggerHook('before_destroy', { where, options });

            const qb            = this.#getQueryBuilder();
            const connector     = this.#getConnector();
            const pk_field      = this.schema.primary_key?.toString() || "id";
            const final_where   = where || { [pk_field]: this[pk_field] };
            const query         = qb.delete(this.schema.table_name, final_where);
            const result        = await connector.executeQuery(query, options);

            this.#triggerHook('after_destroy', this);
            return true;
        } catch (err) {
            console.error("destroy error:", err);
            throw err;
        }
    }

}

module.exports = BaseModel;
