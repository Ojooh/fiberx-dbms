const pascalToSnake = (name) => {
    return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z])([A-Z][a-z])/g, '$1_$2').toLowerCase();
}

// schema code content template
const schema_code_template = (values) => {
    const { 
        model_name, table_name, datasource_type, columns_string, primary_key, 
        timestamps, indexes_string, migration_priority, app_id
    } = values;

return `
const ${model_name}Schema = {
    app_id: '${app_id}',

    table_name: '${table_name}',

    model_name: '${model_name}',

    datasource_type: '${datasource_type}',

    primary_key: '${primary_key}',

    migration_priority: ${migration_priority},

    timestamps: ${timestamps},

    columns: {
${columns_string}
    },

    indexes: ${indexes_string}
}
    
module.exports = ${model_name}Schema;
`;
}


// initial migration code template
const initialMigrationCodeTemplate = (values) => {
    const { app_id, model_name, column_names, index_names } = values;
    return `

const DatasourceRegistry            = require("fiberx-dbms/datasource_connectors/datasource_registry");
const getQueryBuilder               = require("fiberx-dbms/query_builders/query_builder_resolver");
const ${model_name}Schema    = require("../../schemas/${app_id}/${pascalToSnake(model_name)}");

class ${model_name}InitialMigration {
    constructor() {
        this.metadata = {
            columns: ${JSON.stringify(column_names)},
            indexes: ${JSON.stringify(index_names)},
            timestamp: "${new Date().toISOString()}",
            schema: "${model_name}"
        };

        this.connector      = DatasourceRegistry.getInstance().getDataSource(${model_name}Schema.datasource);
        this.builder        = getQueryBuilder(${model_name}Schema?.datasource_type);
        this.column_names   = ${JSON.stringify(column_names)};
        this.index_names    = ${JSON.stringify(index_names)};
    }

    async up() {
        const create_table_query = this.builder.createTable(${model_name}Schema);

        await this.connector.executeQuery(create_table_query);

        const indexes = ${model_name}Schema.indexes;

        for (const index_obj of indexes) {
            const create_index_query = this.builder.createIndex(${model_name}Schema.table_name, index_obj.fields, true);
            await this.connector.executeQuery(create_index_query);
        }
    }

    async down() {
        const query = this.builder.dropTable(${model_name}Schema?.table_name);
        await this.connector.executeQuery(query);
    }
}

module.exports = new ${model_name}InitialMigration();
`;
};

// delta migration code template
const deltaMigrationCodeTemplate = (values) => {
    const { model_name, app_id, added_cols, added_indx, removed_cols, removed_indx } = values;

    return `

const DatasourceRegistry            = require("fiberx-dbms/datasource_connectors/datasource_registry");
const getQueryBuilder               = require("fiberx-dbms/query_builders/query_builder_resolver");
const ${model_name}Schema    = require("../../schemas/${app_id}/${pascalToSnake(model_name)}");

class ${model_name}DeltaMigration {
    constructor() {
        this.metadata = {
            columns: ${JSON.stringify(added_cols)},
            indexes: ${JSON.stringify(added_indx)},
            timestamp: "${new Date().toISOString()}",
            schema: "${model_name}"
        };

        this.connector          = DatasourceRegistry.getInstance().getDataSource(${model_name}Schema?.datasource_type);
        this.builder            = getQueryBuilder(${model_name}Schema?.datasource_type);
        this.added_cols         = ${JSON.stringify(added_cols)};
        this.removed_cols       = ${JSON.stringify(removed_cols)};
        this.added_indx         = ${JSON.stringify(added_indx)};
        this.removed_indx       = ${JSON.stringify(removed_indx)};
        this.all_cols           = Object.keys(${model_name}Schema.columns);
        this.all_indexes        = ${model_name}Schema.indexes || [];
    }

    async addColumns(cols) {
        for (const new_column of cols) {
            const after_col_index   = this.all_cols.indexOf(new_column);
            const after_col         = this.all_cols[after_col_index - 1] || null;
            const position_obj      = { after: after_col };
            const col_def           = ${model_name}Schema.columns[new_column];
            const query             = this.builder.addColumn(${model_name}Schema?.table_name, new_column, col_def, position_obj);

            await this.connector.executeQuery(query);
        }
    }

    async dropColumns(cols) {
        for (const col of cols) {
            const query = this.builder.dropColumn(${model_name}Schema?.table_name, col);
            await this.connector.executeQuery(query);
        }
    }

    async addIndexes(indxs) {
        for (const index_name of indxs) {
            const index_obj = this.all_indexes.find(obj => obj.name === index_name);

            if (!index_obj) { continue; }

            const query = this.builder.createIndex(${model_name}Schema?.table_name, index_obj.fields, true);
            await this.connector.executeQuery(query);
        }
    }

    async dropIndexes(indxs) {
        for (const index_name of indxs) {
            const query = this.builder.dropIndex(${model_name}Schema?.table_name, index_name);
            await this.connector.executeQuery(query);
        }
    }

    async up() {
        if (this.added_cols.length > 0) { await this.addColumns(this.added_cols); }

        if (this.removed_cols.length > 0) { await this.dropColumns(this.removed_cols); }

        if (this.added_indx.length > 0) { await this.addIndexes(this.added_indx); }

        if (this.removed_indx.length > 0) { await this.dropIndexes(this.removed_indx); }

    }

    async down() {
        if (this.added_cols.length > 0) { await this.dropColumns(this.added_cols); }

        if (this.removed_cols.length > 0) { await this.addColumns(this.removed_cols); }

        if (this.added_indx.length > 0) { await this.dropIndexes(this.added_indx); }

        if (this.removed_indx.length > 0) { await this.addIndexes(this.removed_indx); }

    }
}

module.exports = new ${model_name}DeltaMigration();
`;
};

// model code template
const modelCodeTemplate = (app_id, model_name, schema_file_name) => {

return `
const BaseModel    = require("fiberx-dbms/models/base_model");
const ${model_name}Schema   = require("../schemas/${app_id}/${schema_file_name}");
    
    
class ${model_name} extends BaseModel {
    constructor(data) {
        super({ ...data, schema: ${model_name}Schema  });
        this.name   = "${model_name.toLowerCase()}_model"
    }
}
    
module.exports = ${model_name};
`
}

module.exports = {
    pascalToSnake,
    schema_code_template,
    initialMigrationCodeTemplate,
    deltaMigrationCodeTemplate,
    modelCodeTemplate
}
