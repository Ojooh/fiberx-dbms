const QueryUtil         = require("../utils/query_util")

class BaseQueryBuilder {
    constructor(model_instance, dialect, logger = null) {
        this.name               = "base_query_builder";
        this.model_instance     = model_instance;
        this.dialect            = dialect;
        this.logger             = logger || console;
        this.query_util         = new QueryUtil(this.model_instance, this.dialect, this.logger);
    }

    // method to generate select sql_statement
    select = (table_name, fields = [], where = {}, options = {}) => {
        const base_fields                           = this.query_util.formatSelectFields(table_name, fields);
    
        const { joins, fields: include_fields }     = this.query_util.formatIncludes(table_name, options?.include);

    
        const field_parts = [base_fields, include_fields].filter(Boolean);

        const full_fields = field_parts.join(', ').replace(/,\s*$/, ''); 

        const join_clause                           = joins.join(' ');
    
        const sql = `
            SELECT ${full_fields} 

            FROM ${this.query_util.escapeField(table_name)} 

            ${join_clause} 

            ${this.query_util.formatWhereClause(table_name, where)} 

            ${this.query_util.formatOptions(options)}
        `;
        
        return sql.replace(/\s+/g, ' ').trim();
    }

    // Method to generate select count sql_statement
    selectCount = (table_name, where = {}, options = {}) => {
        const { joins, fields: include_fields }     = this.query_util.formatIncludes(table_name, options?.include);

        const join_clause                           = joins.join(' ');

        const sql = `
            SELECT COUNT(*) as count 

            FROM ${this.query_util.escapeField(table_name)} 

            ${join_clause}  

            ${this.query_util.formatWhereClause(table_name, where)} 

            ${this.query_util.formatOptions(options)}
        `;

        return sql.replace(/\s+/g, ' ').trim();
    }

    // Method to generate insert sql_statement
    insert = (table_name, data) => {
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

    // Method to generate bulk insert sql_statement
    bulkInsert = (table_name, table_columns, data_array) => {
        if (!Array.isArray(data_array) || data_array.length === 0) { throw new Error("No values provided for bulk insert"); }

        // Determine which columns are actually present in the data
        const first_row     = data_array[0];
        const data_columns  = Object.keys(first_row).filter(key => key in table_columns);
        const cols          = data_columns.map(this.query_util.escapeField).join(', ');
        const value_tuples  = data_array.map(row => {
            const row_values = data_columns.map(col => this.query_util.escapeValue(row[col]));
            return `(${row_values.join(', ')})`;
        }).join(', ');

        // Final query
        const sql = `
            INSERT INTO ${this.query_util.escapeField(table_name)} 
                (${cols}) 
            VALUES 
                ${value_tuples}
        `;

        return sql.replace(/\s+/g, ' ').trim();
    };

    // Method to generate update sql_statement
    update = (table_name, where, data) => {
        const set_clause = Object.entries(data).map(
            ([k, v]) => `${this.query_util.escapeField(`${table_name}.${k}`)} = ${this.query_util.escapeValue(v)}`
        ).join(', ');

        const sql = `
            UPDATE ${this.query_util.escapeField(table_name)} 
            SET ${set_clause} 
            ${this.query_util.formatWhereClause(table_name, where)}
        `;

        return sql.replace(/\s+/g, ' ').trim();
    }

    // Method to generate increment sql_statement
    increment = (table_name, where, field, amount = 1) => {
        const escaped_field     = this.query_util.escapeQualifiedField(`${table_name}.${field}`);
        const set_clause        = `${escaped_field} = ${escaped_field} + ${this.query_util.escapeValue(amount)}`;
        const sql               = `
            UPDATE ${this.query_util.escapeField(table_name)} 
            SET ${set_clause} 
            ${this.query_util.formatWhereClause(table_name, where)}
        `;
        return sql.replace(/\s+/g, ' ').trim();
    }

    // Method to generate decreement sql_statement
    decrement = (table_name, where, field, amount = 1) => {
        const escaped_field     = this.query_util.escapeQualifiedField(`${table_name}.${field}`);
        const set_clause        = `${escaped_field} = ${escaped_field} - ${this.query_util.escapeValue(amount)}`;
        const sql               = `
            UPDATE ${this.query_util.escapeField(table_name)} 
            SET ${set_clause} 
            ${this.query_util.formatWhereClause(table_name, where)}
        `;

        return sql.replace(/\s+/g, ' ').trim();
    }

    // Method to generate delete sql statement
    delete = (table_name, where) => { 
        const sql               = `
            DELETE FROM ${this.query_util.escapeField(table_name)} 
            ${this.query_util.formatWhereClause(table_name, where)}
        `;

        return sql.replace(/\s+/g, ' ').trim();
    }

    // Method to generate create table sql_statement
    createTable = (schema) => {
        const { table_name, columns, primary_key } = schema;
        const column_sql_parts  = [];
        const triggers          = [];

        for (const [col, def] of Object.entries(columns)) {
            const { col_definition_sql, trigger_sql } = this.query_util.formatColumnDefinition(col, def);
            column_sql_parts.push(col_definition_sql);

            if (trigger_sql) {
                // Replace placeholder with the actual table name
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

    // Method to generate add column table sql_statement
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

    // Method to generate create index sql_statement
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

    // Method to generate dorp coulmn sql statement
    dropColumn = (table_name, column_name) => { 
        const sql = `
            ALTER TABLE ${this.query_util.escapeField(table_name)} 
            DROP COLUMN ${this.query_util.escapeField(column_name)}
        `; 

        return sql.replace(/\s+/g, ' ').trim();
    }
    
    // Method to get deop index query
    dropIndex = (table_name, index_name) => { 
        const sql = `
            DROP INDEX ${this.query_util.escapeField(index_name)} 
            ON ${this.query_util.escapeField(table_name)}
        `; 

        return sql.replace(/\s+/g, ' ').trim();
    }
    
    // Method to get drop table query
    dropTable = (table_name) => { 
        const sql = `DROP TABLE IF EXISTS ${this.query_util.escapeField(table_name)}`;
        return sql.replace(/\s+/g, ' ').trim();
    }
}

module.exports = BaseQueryBuilder;