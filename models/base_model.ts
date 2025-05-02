import getQueryBuilder from "../query_builders/query_builder_resolver";
import DatasourceRegistry from "../datasource_connectors/datasource_registry";
import EventSystem from "../utils/event_system_util";
import GlobalVariableManager from "../utils/global_variable_manager";

import { TableSchemaInterface, ModelConstructorType } from "../types/common_types";

abstract class BaseModel {
    protected schema: TableSchemaInterface;
    protected datasource_id: string;
    private event_system: EventSystem;

    constructor(data: ModelConstructorType) {
        this.event_system       = new EventSystem();

        Object.assign(this, data);
        this.schema             = data?.schema;
        this.datasource_id      = data?.schema.datasource;

        this.addComputedAttributes();
    }

    // Get registered data source connection
    protected getConnector() { return DatasourceRegistry.instance.get(this.datasource_id); }

    // Get query builder for data source
    protected getQueryBuilder() { return getQueryBuilder(this.datasource_id); }

    // Add computed fields to instance (to override in child classes)
    protected addComputedAttributes(): void {}

    // Register an event listener for the current model
    on(event: string, listener: Function) { this.event_system.on(event, listener); }

    // Trigger an event in the current model
    private triggerHook(hook: string, data?: any, options?: object) { this.event_system.emit(hook, data, options); }

    // method to validate db permission
    private validatePermission( action: 'read' | 'create' | 'update' | 'delete', model_name: string) {
        const global_vars           = GlobalVariableManager.getInstance();
        const app_id                = global_vars?.getVariable("APP_ID") || null;
        const permissions           = global_vars?.getVariable("MODEL_PERMISSIONS") || [];
        const app_data              = permissions.find((app: any) => app.id === app_id);

        if (!app_data) throw new Error(`App ${app_id} is not registered in MODEL_PERMISSIONS.`);
    
        const model_perms = app_data.models?.find((m: any) => m.name === model_name);

        if (!model_perms || !model_perms.permissions.includes(action)) {
            throw new Error(`Permission denied: ${action} not allowed on model ${model_name} for app ${app_id}.`);
        } else {
            return true
        }
    }
    

    // 🔎 Find a record by primary key
    static async findByPk<T extends BaseModel>(this: new (data: any) => T, id: string | number,fields: string[], options: any = {} ): Promise<T | null> {
        try {
            const instance      = new this({});
            instance.validatePermission('read', instance.schema.model_name);

            const pk_field      = instance.schema.primary_key?.toString() || "id";
            const where         = { [pk_field]: id };
            const qb            = instance.getQueryBuilder();
            const connector     = instance.getConnector();
            const query         = qb.select(instance.schema.table_name, fields, where, { ...options, limit: 1 });
            const results       = await connector.executeQuery(query, options);

            return results?.[0] ? new this(results[0]) : null;
        } catch (err) {
            console.error("findByPk error:", err);
            throw err;
        }
    }

    // 🔢 Count number of records matching a condition
    static async count<T extends BaseModel>( this: new (data: any) => T, where: object, options: any = {} ): Promise<number> {
        try {
            const instance          = new this({});
            instance.validatePermission('read', instance.schema.model_name);

            const qb                = instance.getQueryBuilder();
            const connector         = instance.getConnector();
            const query             = qb.selectCount(instance.schema.table_name, where);
            const result            = await connector.executeQuery(query, options);

            return result?.[0]?.count || 0;
        } catch (err) {
            console.error("count error:", err);
            throw err;
        }
    }

    // 🔍 Find a single record using filters
    static async findOne<T extends BaseModel>( this: new (data: any) => T, fields: string[], where: object, options: any = {} ): Promise<T | null> {
        try {
            const instance          = new this({});
            instance.validatePermission('read', instance.schema.model_name);

            const qb                = instance.getQueryBuilder();
            const connector         = instance.getConnector();
            const query             = qb.select(instance.schema.table_name, fields, where, { ...options, limit: 1 });
            const results           = await connector.executeQuery(query, options);

            return results?.[0] ? new this(results[0]) : null;
        } catch (err) {
            console.error("findOne error:", err);
            throw err;
        }
    }

    // 🔄 Find all records matching condition
    static async findAll<T extends BaseModel>( this: new (data: any) => T, fields: string[], where: object, options: any = {} ): Promise<T[]> {
        try {
            const instance      = new this({});
            instance.validatePermission('read', instance.schema.model_name);

            const qb            = instance.getQueryBuilder();
            const connector     = instance.getConnector();
            const query         = qb.select(instance.schema.table_name, fields, where, options);
            const results       = await connector.executeQuery(query, options);

            return results.map((row: any) => new this(row));
        } catch (err) {
            console.error("findAll error:", err);
            throw err;
        }
    }

    // 🔢 Find and count total records (for pagination)
    static async findAndCountAll<T extends BaseModel>( this: new (data: any) => T, fields: string[], where: object, options: any = {} ): Promise<{ count: number; rows: T[] }> {
        try {
            const instance      = new this({});
            instance.validatePermission('read', instance.schema.model_name);

            const qb            = instance.getQueryBuilder();
            const connector     = instance.getConnector();
            const count_query   = qb.selectCount(instance.schema.table_name, where);
            const data_query    = qb.select(instance.schema.table_name, fields, where, options);

            const [countResult, rowsResult] = await Promise.all([
                connector.executeQuery(count_query, options),
                connector.executeQuery(data_query, options),
            ]);

            return {
                count: countResult?.[0]?.count || 0,
                rows: rowsResult.map((row: any) => new this(row)),
            };
        } catch (err) {
            console.error("findAndCountAll error:", err);
            throw err;
        }
    }

    // ➕ Create a new record
    static async create<T extends BaseModel>( this: new (data: any) => T, data: object, options: any = {} ): Promise<T> {
        try {
            const instance      = new this({});
            instance.validatePermission('create', instance.schema.model_name);
            instance.triggerHook('before_create', data, options); 

            const qb            = instance.getQueryBuilder();
            const connector     = instance.getConnector();
            const query         = qb.insert(instance.schema.table_name, data, options);

            const result = await connector.executeQuery(query, options);
            const new_instance = new this({ ...data, ...result, schema: instance.schema });

            instance.triggerHook('after_create', new_instance, options); // Trigger after create hook
            return new_instance;
        } catch (err) {
            console.error("create error:", err);
            throw err;
        }
    }

    // ✏️ Update current record
    async update(data: object, where?: object, options: any = {}) {
        try {
            this.validatePermission('update', this.schema.model_name);
            this.triggerHook('before_update', data, options);

            const qb            = this.getQueryBuilder();
            const connector     = this.getConnector();
            const pk_field      = this.schema.primary_key?.toString() || "id";
            const final_where   = where || { [pk_field]: (this as any)[pk_field] };
            const query         = qb.update(this.schema.table_name, final_where, data, options);

            await connector.executeQuery(query, options);
            Object.assign(this, data);
            
            this.triggerHook('after_update', this);
            return this;
        } catch (err) {
            console.error("update error:", err);
            throw err;
        }
    }

    // ❌ Delete current record
    async destroy(where?: object, options: any = {}) {
        try {
            this.validatePermission('delete', this.schema.model_name);
            this.triggerHook('before_destroy', { where, options });

            const qb            = this.getQueryBuilder();
            const connector     = this.getConnector();
            const pk_field      = this.schema.primary_key?.toString() || "id";
            const final_where   = where || { [pk_field]: (this as any)[pk_field] };
            const query         = qb.delete(this.schema.table_name, final_where);

            await connector.executeQuery(query, options);
            
            this.triggerHook('after_destroy', this);
            return this;
        } catch (err) {
            console.error("destroy error:", err);
            throw err;
        }
    }

    // 🛠 Static update many records
    static async update<T extends BaseModel>( this: new (data: any) => T, where: object, data: object, options: any = {} ) {
        try {
            const instance      = new this({});
            instance.validatePermission('update', instance.schema.model_name);
            instance.triggerHook('before_update', data, { where, options });

            const qb            = instance.getQueryBuilder();
            const connector     = instance.getConnector();
            const query         = qb.update(instance.schema.table_name, where, data, options);
            
            const result = await connector.executeQuery(query, options);
            const new_instance = new this({ ...data, ...result, schema: instance.schema });

            instance.triggerHook('after_update', new_instance, options); // Trigger after create hook
            return new_instance;

        } catch (err) {
            console.error("updateMany error:", err);
            throw err;
        }
    }

    // 🗑 Static delete many records
    static async delete<T extends BaseModel>( this: new (data: any) => T, where: object, options: any = {} ) {
        try {
            const instance  = new this({});
            instance.validatePermission('delete', instance.schema.model_name);
            instance.triggerHook('before_destroy', { where, options });

            const qb        = instance.getQueryBuilder();
            const connector = instance.getConnector();
            const query     = qb.delete(instance.schema.table_name, where, options);

            const result = await connector.executeQuery(query, options);
            instance.triggerHook('after_destroy', { where, options });
            return result

        } catch (err) {
            console.error("deleteMany error:", err);
            throw err;
        }
    }
}

export default BaseModel;
