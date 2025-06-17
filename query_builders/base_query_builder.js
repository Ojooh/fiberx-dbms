const QueryUtil         = require("../utils/query_util")

class BaseQueryBuilder {
    constructor(dialect, schema = {}, associations = [], logger = null) {
        this.name               = "base_query_builder";
        this.dialect            = dialect;
        this.logger             = logger || console;
        this.query_util         = new QueryUtil(dialect, schema, associations, this.logger);
    }

    select = (query_params) => {
        const { table_name, fields = [], where = {}, options = {} } = query_params;

        const distinct                              = options?.distinct ? 'DISTINCT' : '';
        const base_fields                           = this.query_util.formatSelectFields(table_name, fields);
        const { joins, fields: include_fields }     = this.query_util.formatIncludes(table_name, options?.include);

        const field_parts = [base_fields, include_fields].filter(Boolean);
        const full_fields = field_parts.join(', ').replace(/(,\s*)+$/, '');

        const join_clause = joins?.join(' ') || '';

        const sql = `
            SELECT ${distinct} ${full_fields}
            FROM ${this.query_util.escapeField(table_name)}
            ${join_clause}
            ${this.query_util.formatWhereClause(table_name, where)}
            ${this.query_util.formatOptions(table_name, options)}
        `;

        return sql.replace(/\s+/g, ' ').trim();
    }

    selectCount = (query_params) => {
        const { table_name, where = {}, options = {} } = query_params;

        const distinct                            = options?.distinct ? 'DISTINCT' : '';
        const { joins }                           = this.query_util.formatIncludes(table_name, options?.include);
        const join_clause                         = joins?.join(' ') || '';
        
        // remove limit and offset
        options.limit = null;
        options.offset = null;

        const sql = `
            SELECT ${distinct} COUNT(*) as count
            FROM ${this.query_util.escapeField(table_name)}
            ${join_clause}
            ${this.query_util.formatWhereClause(table_name, where)}
            ${this.query_util.formatOptions(table_name, options)}
        `;

        return sql.replace(/\s+/g, ' ').trim();
    }

    insert = (query_params) => {
        const { table_name, data } = query_params;

        const columns   = Object.keys(data).map(this.query_util.escapeField).join(', ');
        const values    = Object.values(data).map(this.query_util.escapeValue).join(', ');

        const sql       = `
            INSERT INTO ${this.query_util.escapeField(table_name)}
                (${columns})
            VALUES
                (${values})
        `;

        return sql.replace(/\s+/g, ' ').trim();
    }

    bulkInsert = (query_params) => {
        const { table_name, table_columns, data: data_array } = query_params;

        if (!Array.isArray(data_array) || data_array.length === 0) { throw new Error("No values provided for bulk insert"); }

        const first_row     = data_array[0];
        const data_columns  = Object.keys(first_row).filter(key => key in table_columns);
        const cols          = data_columns.map(this.query_util.escapeField).join(', ');
        const value_tuples  = data_array.map(row => {
            const row_values = data_columns.map(col => this.query_util.escapeValue(row[col]));
            return `(${row_values.join(', ')})`;
        }).join(', ');

        const sql = `
            INSERT INTO ${this.query_util.escapeField(table_name)}
                (${cols})
            VALUES
                ${value_tuples}
        `;

        return sql.replace(/\s+/g, ' ').trim();
    };

    update = (query_params) => {
        const { table_name, where, data } = query_params;


        const set_clause = Object.entries(data).map(
            ([k, v]) => `${this.query_util.escapeQualifiedField(`${table_name}.${k}`)} = ${this.query_util.escapeValue(v)}`
        ).join(', ');

        const sql = `
            UPDATE ${this.query_util.escapeField(table_name)}
            SET ${set_clause}
            ${this.query_util.formatWhereClause(table_name, where)}
        `;

        return sql.replace(/\s+/g, ' ').trim();
    }

    increment = (query_params) => {
        const { table_name, where, fields, amount = 1 } = query_params;

        const field             = query_params?.field || Array.isArray(fields) ? fields[0] : fields;
        const escaped_field     = this.query_util.escapeQualifiedField(`${table_name}.${field}`);
        const set_clause        = `${escaped_field} = ${escaped_field} + ${this.query_util.escapeValue(amount)}`;
        const sql               = `
            UPDATE ${this.query_util.escapeField(table_name)}
            SET ${set_clause}
            ${this.query_util.formatWhereClause(table_name, where)}
        `;
        return sql.replace(/\s+/g, ' ').trim();
    }

    decrement = (query_params) => {
        const { table_name, where, fields, amount = 1 } = query_params;

        const field             = query_params?.field || Array.isArray(fields) ? fields[0] : fields;
        const escaped_field     = this.query_util.escapeQualifiedField(`${table_name}.${field}`);
        const set_clause        = `${escaped_field} = ${escaped_field} - ${this.query_util.escapeValue(amount)}`;
        const sql               = `
            UPDATE ${this.query_util.escapeField(table_name)}
            SET ${set_clause}
            ${this.query_util.formatWhereClause(table_name, where)}
        `;

        return sql.replace(/\s+/g, ' ').trim();
    }

    delete = (query_params) => {
        const { table_name, where} = query_params;
        const sql = `
            DELETE FROM ${this.query_util.escapeField(table_name)}
            ${this.query_util.formatWhereClause(table_name, where)}
        `;

        return sql.replace(/\s+/g, ' ').trim();
    }

    createTable = (schema) => {
        const { table_name, columns, primary_key } = schema;
        const column_sql_parts  = [];
        const triggers          = [];

        for (const [col, def] of Object.entries(columns)) {
            const { col_definition_sql, trigger_sql } = this.query_util.formatColumnDefinition(col, def);
            column_sql_parts.push(col_definition_sql);

            if (trigger_sql) {
                triggers.push(trigger_sql.replaceAll('{TABLE_NAME}', this.query_util.escapeField(table_name)));
            }
        }

        const pk = primary_key ? `, PRIMARY KEY (${(Array.isArray(primary_key) ? primary_key : [primary_key]).map(this.query_util.escapeField).join(', ')})` : '';

        const create_table_sql = `
            CREATE TABLE ${this.query_util.escapeField(table_name)}
            (${column_sql_parts.join(', ')}${pk});
        `;

        return {
            create_sql: create_table_sql.replace(/\s+/g, ' ').trim(),
            trigger_sqls: triggers.length > 0 ? triggers : null
        };
    };

    addColumn = (table_name, column_name, def, position = {}) => {
        const { after, before } = position;

        const { col_definition_sql, trigger_sql } = this.query_util.formatColumnDefinition(column_name, def);

        let pos_clause = '';

        if (after) { pos_clause = `AFTER ${this.query_util.escapeField(after)}`; }
        else if (before) { pos_clause = `BEFORE ${this.query_util.escapeField(before)}`; }

        const alter_sql = `
            ALTER TABLE ${this.query_util.escapeField(table_name)}
            ADD COLUMN ${col_definition_sql} ${pos_clause}
        `.replace(/\s+/g, ' ').trim();

        return { alter_sql, trigger_sqls: trigger_sql ? [trigger_sql] : [] };
    };

    createIndex = (table_name, index_fields, unique) => {
        const fields        = index_fields.map(this.query_util.escapeField).join(', ');
        const index_name    = `idx_${table_name}_${index_fields.join('_')}`;
        const sql           = `
            CREATE
                ${unique ? 'UNIQUE ' : ''}INDEX
                ${this.query_util.escapeField(index_name)}
            ON
                ${this.query_util.escapeField(table_name)}
                (${fields})
        `;

        return sql.replace(/\s+/g, ' ').trim();
    }

    dropColumn = (table_name, column_name) => {
        const sql = `
            ALTER TABLE ${this.query_util.escapeField(table_name)}
            DROP COLUMN ${this.query_util.escapeField(column_name)}
        `;

        return sql.replace(/\s+/g, ' ').trim();
    }

    dropIndex = (table_name, index_name) => {
        const sql = `
            DROP INDEX ${this.query_util.escapeField(index_name)}
            ON ${this.query_util.escapeField(table_name)}
        `;

        return sql.replace(/\s+/g, ' ').trim();
    }

    dropTable = (table_name) => {
        const sql = `DROP TABLE IF EXISTS ${this.query_util.escapeField(table_name)}`;
        return sql.replace(/\s+/g, ' ').trim();
    }
}

module.exports = BaseQueryBuilder;
