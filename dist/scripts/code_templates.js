"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.model_code_templates = exports.delta_migration_code_template = exports.initial_migration_code_template = exports.schema_code_template = exports.pascalToSnake = void 0;
const pascalToSnake = (name) => {
    return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z])([A-Z][a-z])/g, '$1_$2').toLowerCase();
};
exports.pascalToSnake = pascalToSnake;
const schema_code_template = (values) => {
    const { model_name, table_name, datasource, columns_string, primary_key, timestamps, indexes_string, migration_priority, app_id } = values;
    return `
import DataTypes from "@/datatypes";

const ${model_name}Schema = {
    app_id: '${app_id}',

    table_name: '${table_name}',

    model_name: '${model_name}',

    datasource: '${datasource}',

    primary_key: '${primary_key}',

    migration_priority: ${migration_priority},

    timestamps: ${timestamps},

    columns: {
        ${columns_string}
    },

    indexes: ${indexes_string}
}

export default ${model_name}Schema;
`;
};
exports.schema_code_template = schema_code_template;
const initial_migration_code_template = (values) => {
    const { schema, column_names, index_names } = values;
    return `
    
import DatasourceRegistry from "@/datasource_connectors/datasource_registry";
import getQueryBuilder from "@/query_builders/query_builder_resolver";
import ${schema.model_name}Schema from "@/schemas/${schema.app_id}/${pascalToSnake(schema.model_name)}";

class ${schema.model_name}InitialMigration {
    metadata = {
        columns: ${JSON.stringify(column_names)},
        indexes: ${JSON.stringify(index_names)},
        timestamp: "${new Date().toISOString()}",
        schema: "${schema.model_name}"
    };

    private connector: any;
    private builder: any;
    private column_names: string[];
    private index_names: string[];

    constructor() {
        this.connector      = DatasourceRegistry.instance.get(${schema.model_name}Schema.datasource);
        this.builder        = getQueryBuilder(${schema.model_name}Schema.datasource);
        this.column_names   = ${JSON.stringify(column_names)};
        this.index_names    = ${JSON.stringify(index_names)};
    }

    async up() {
        const create_table_query    = this.builder.createTable(${schema.model_name}Schema);

        await this.connector.executeQuery(create_table_query);

        const indexes = ${schema.model_name}Schema.indexes;

        for (const index_obj of indexes) {
            const create_index_query = this.builder.createIndex(${schema.model_name}Schema.table_name, index_obj.fields, true);
            await this.connector.executeQuery(create_index_query);
        }  
    }
    
    async down() {
        const query = this.builder.dropTable(${schema.model_name}Schema.table_name);

        await this.connector.executeQuery(query);
    }
}

export default new ${schema.model_name}InitialMigration();
    
`;
};
exports.initial_migration_code_template = initial_migration_code_template;
const delta_migration_code_template = (values) => {
    const { schema, added_cols, added_indx, removed_cols, removed_indx } = values;
    return `
import DatasourceRegistry from "@/datasource_connectors/datasource_registry";
import getQueryBuilder from "@/query_builders/query_builder_resolver";
import ${schema.model_name}Schema from "@/schemas/${schema.app_id}/${pascalToSnake(schema.model_name)}";

class ${schema.model_name}DeltaMigration {
    metadata = {
        columns: ${JSON.stringify(added_cols)},
        indexes: ${JSON.stringify(added_indx)},
        timestamp: "${new Date().toISOString()}",
        schema: "${schema.model_name}"
    }; 

    private connector: any;
    private builder: any;
    private added_cols: string[];
    private removed_cols: string[];
    private added_indx: string[];
    private removed_indx: string[];
    private all_cols: string[];
    private all_indexes: any[];

    constructor() {
        this.connector      = DatasourceRegistry.instance.get('${schema.datasource}');
        this.builder        = getQueryBuilder('${schema.datasource}');
        this.added_cols     = ${JSON.stringify(added_cols)};
        this.removed_cols   = ${JSON.stringify(removed_cols)};
        this.added_indx     = ${JSON.stringify(added_indx)};
        this.removed_indx   = ${JSON.stringify(removed_indx)};
        this.all_cols       = Object.keys(${schema.model_name}Schema.columns);
        this.all_indexes    = ${schema.model_name}Schema.indexes || [];
    }

    addColumns = async (cols: string[]) => {
        for (const new_column of cols) {
            const after_col_index   = this.all_cols.indexOf(new_column);
            const after_col         = this.all_cols[after_col_index - 1] || null;
            const position_obj      = { after: after_col };
            const col_def           = ${schema.model_name}Schema.columns[new_column as keyof typeof ${schema.model_name}Schema.columns];
            const query             = this.builder.addColumn('${schema.table_name}', new_column, col_def, position_obj);

            await this.connector.executeQuery(query);
        }
    }

    dropColumns = async (cols: string[]) => {
        for (const col of cols) {
            const query = this.builder.dropColumn('${schema.table_name}', col);
            await this.connector.executeQuery(query);
        }
    }

    addIndexes = async (indxs: string[]) => {
        for (const index_name of indxs) {
            const index_obj = this.all_indexes.find(obj => obj.name === index_name);
            if (!index_obj) continue;

            const query = this.builder.createIndex('${schema.table_name}', index_obj.fields, true);
            await this.connector.executeQuery(query);
        }
    }

    dropIndexes = async (indxs: string[]) => {
        for (const index_name of indxs) {
            const query = this.builder.dropIndex('${schema.table_name}', index_name);
            await this.connector.executeQuery(query);
        }
    }

    async up() {
        // Add new columns
        if (this.added_cols.length > 0) { await this.addColumns(this.added_cols); }
        
        // Drop removed columns
        if (this.removed_cols.length > 0) { await this.dropColumns(this.removed_cols); }

        // Add new Indexes
        if (this.added_indx.length > 0) { await this.addIndexes(this.added_indx); }
        
        // Drop removed columns
        if (this.removed_indx.length > 0) { await this.dropIndexes(this.removed_indx); }
    }


    async down() {
        // Add new columns
        if (this.added_cols.length > 0) { await this.dropColumns(this.added_cols); }
        
        // Drop removed columns
        if (this.removed_cols.length > 0) { await this.addColumns(this.removed_cols); }

        // Add new Indexes
        if (this.added_indx.length > 0) { await this.dropIndexes(this.added_indx); }
        
        // Drop removed columns
        if (this.removed_indx.length > 0) { await this.addIndexes(this.removed_indx); }
    }
}

export default new ${schema.model_name}DeltaMigration();
`;
};
exports.delta_migration_code_template = delta_migration_code_template;
const model_code_templates = (app_id, model_name) => {
    return `
import BaseModel from "fiberx-dbms/models/base_model";
import ${model_name}Schema from "@/schemas/${app_id}/${pascalToSnake(model_name)}";


class ${model_name} extends BaseModel {
    constructor(data: any) {
        super({ ...data, schema: ${model_name}Schema  });
    }
}

export default ${model_name};
`;
};
exports.model_code_templates = model_code_templates;
