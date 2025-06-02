const QueryUtil         = require("../utils/query_util")
const mapToMySQLType    = require("../datatypes/mysql");


class MysqlQueryBuilder {
    constructor() {
        this.query_util = new QueryUtil();
    }

    // Method to parse where conditions
    #parse_condition = (obj) => {
        if (typeof obj !== 'object' || obj === null) {
            throw new Error('Invalid where clause format');
        }

        if (Array.isArray(obj)) {
            // This shouldn't happen at root level anymore
            throw new Error('Invalid root-level array in where clause');
        }

        return Object.keys(obj).map(key => {
            if (key === 'OR' || key === 'AND') {
                const conditions = obj[key];

                if (!Array.isArray(conditions)) {
                    throw new Error(`${key} must be an array`);
                }

                const parsed = conditions.map(cond => `(${this.#parse_condition(cond)})`).join(` ${key} `);
                return `(${parsed})`;
            }

            const value = obj[key];
            if (typeof value === 'object' && value !== null) {
                const operator  = Object.keys(value)[0].toUpperCase();
                const operand   = value[operator];
                return this.query_util.formatWhereCondition(key, operator, operand);
            } else {
                return `${this.query_util.escapeField(key)} = ${this.query_util.escapeValue(value)}`;
            }
        }).join(' AND ');
    }

    // Method to format where cluase
    #formatWhereClause = (where = null) => {
        if (!where || Object.keys(where).length === 0) return '';
    
        const condition_str = this.#parse_condition(where);

        return `WHERE ${condition_str}`;
    }

    // Method to format options
    #formatOptions = (options = null) => {
        if (!options) { return ''; }

        const { limit, offset, order_by, distinct, lock } = options;

        let clause = '';
    
        if (distinct) { clause += ' DISTINCT'; }

        if (order_by) { clause += ` ORDER BY ${Array.isArray(order_by) ? order_by.join(', ') : order_by}`;  }

        if (limit) clause += ` LIMIT ${limit}`;

        if (offset) clause += ` OFFSET ${offset}`;

        if (lock) clause += ` FOR ${lock}`;

        return clause;
    }

    // method to gets association metadata 
    #resolveAssociation = (include, base_table) => {
        const associations = include.model.getAssociations?.() || [];
        const match = associations.find(a => {
            const src                   = a.source?.prototype?.schema?.table_name;
            const tgt                   = a.model?.prototype?.schema?.table_name;
            const matches_table         = src === base_table || tgt === base_table;
            const matches_alias_or_fk   = !include?.as || a?.as === include?.as || a?.foreign_key === include?.foreign_key;
            return matches_table && matches_alias_or_fk;
        });
    
        if (!match) throw new Error(`Association not found for ${base_table} in include.`);
    
        return match;
    }

    // method to build builds JOINs for hasOne / belongsTo
    #generateJoin = (assoc, include, base_table) => {
        const { model: target_model, foreign_key, target_key } = assoc;
        const target_table          = target_model.prototype.schema.table_name;
        const alias                 = include.as || target_table;
        const required              = include.required !== false; // default to true
        const type                  = required ? 'INNER' : 'LEFT';
    
        const left                  = assoc.type === 'belongsTo' ? `${alias}.${target_key}` : `${base_table}.${foreign_key}`;
        const right                 = assoc.type === 'belongsTo' ? `${base_table}.${foreign_key}` : `${alias}.${target_key}`;

        let join_condition          = `${left} = ${right}`;

        // Add include.where if present
        if (include?.where) {
            const where_condition = this.#parse_condition(include?.where).replace(/^AND\s+/, '');
            join_condition += ` AND (${where_condition})`;
        }

        const fields = (include.fields || ['*']).map(f => `\`${alias}\`.\`${f}\` AS \`${alias}.${f}\``);
        const join = `${type} JOIN \`${target_table}\` AS \`${alias}\` ON ${join_condition}`;

        return { join, fields };
    
    }

    // Method to builds subqueries for hasMany / belongsToMany
    #generateSubqueryField = (assoc, include, base_table) => {
        if (include.include && include.include.length > 0) {
            throw new Error(`Nested includes are not supported in subqueries (hasMany/belongsToMany) for alias "${include.as || assoc.model.prototype.schema.table_name}".`);
        }

        const { model: target_model, foreign_key } = assoc;
        const target_table  = target_model.prototype.schema.table_name;
        const alias         = include.as || target_table;
        const fields        = include.fields || ['*'];
         let where_clause    = `\`${alias}_sub\`.\`${foreign_key}\` = \`${base_table}\`.id`;

        if (include?.where) {
            const condition = this.#parse_condition(include.where);
            where_clause += ` AND (${condition})`;
        }

        const sub_query = `(
            SELECT JSON_ARRAYAGG(JSON_OBJECT(${fields.map(f => `'${f}', \`${f}\``).join(', ')}))
            FROM \`${target_table}\` AS \`${alias}_sub\`
           WHERE ${where_clause}
        ) AS \`${alias}\``;

        return sub_query;
    }

    // Method to builds complete SELECT, JOIN, and subquery field parts
    #formatIncludes = (includes = [], base_table) => {
        let joins = [], extra_fields = [];

        for (const inc of includes) {
            const assoc = this.#resolveAssociation(inc, base_table);

            const alias = inc.as || assoc.model.prototype.schema.table_name;

            let nested = { joins: [], fields: [] };
            if (inc.include && inc.include.length > 0) {
                nested = this.#formatIncludes(inc.include, alias);
            }

            if (['hasOne', 'belongsTo'].includes(assoc.type)) {
                const { join, fields } = this.#generateJoin(assoc, inc, base_table);
                joins.push(join, ...nested.joins);
                extra_fields.push(...fields, ...nested.fields);
            } else if (['hasMany', 'belongsToMany'].includes(assoc.type)) {
                const sub = this.#generateSubqueryField(assoc, inc, base_table);
                extra_fields.push(sub); // no nested fields in subqueries for now
            } else {
                throw new Error(`Unsupported association type: ${assoc.type}`);
            }
        }

        return { joins, fields: extra_fields };
    };


    // Method to format column defeintion
    #formatColumnDefinition = (col, options) => {
        const sql_type = mapToMySQLType(options.type);

        let col_def = `${this.query_util.escapeField(col)} ${sql_type}`;
    
        if ((sql_type === 'INT' || sql_type === 'BIGINT') && options.auto_increment) { col_def += ' AUTO_INCREMENT'; }
    
        if (options.unique) { col_def += ' UNIQUE'; }
    
        if (options.default !== undefined) {
            if (options.default === 'CURRENT_TIMESTAMP') { col_def += ' DEFAULT CURRENT_TIMESTAMP';} 
            
            else { col_def += ` DEFAULT ${this.query_util.escapeValue(options.default)}`;}
        }
    
        if (options.on_update === 'CURRENT_TIMESTAMP') { col_def += ' ON UPDATE CURRENT_TIMESTAMP'; }
    
        if (options.nullable === false) { col_def += ' NOT NULL'; }
    
        if (options.references) {
            const ref     = options.references;
            col_def       += ` REFERENCES ${this.query_util.escapeField(ref.table)}(${this.query_util.escapeField(ref.column)})`;
    
            if (ref.on_delete) col_def += ` ON DELETE ${ref.on_delete.toUpperCase()}`;

            if (ref.on_update) col_def += ` ON UPDATE ${ref.on_update.toUpperCase()}`;
        }
    
        return col_def;
    }

    // method to get select record query
    select = (table_name, fields, where = {}, options = {}) => {
        const { include = [] } = options;
    
        const base_fields = fields.map(f => `\`${table_name}\`.\`${f}\``);
    
        const { joins, fields: include_fields } = this.#formatIncludes(include, table_name);
    
        const full_fields = [...base_fields, ...include_fields].join(', ');
        const join_clause = joins.join(' ');
    
        const sql = `SELECT ${full_fields} FROM ${this.query_util.escapeField(table_name)}  ${join_clause} ${this.#formatWhereClause(where)} ${this.#formatOptions(options)}`;
        
        return sql.trim();
    }

    // Method to get select  count record query
    selectCount = (table_name, where = {}, options = {}) => {
        const { include = [] } = options;

        const { joins, fields: include_fields } = this.#formatIncludes(include, table_name);

        const join_clause = joins.join(' ');

        return `SELECT COUNT(*) as count FROM ${this.query_util.escapeField(table_name)} ${join_clause}  ${this.#formatWhereClause(where)} ${this.#formatOptions(options)}`.trim();
    }

    // Method to get insert new record query
    insert = (table_name, data) => {
        const columns = Object.keys(data).map(this.query_util.escapeField).join(', ');
        const values = Object.values(data).map(this.query_util.escapeValue).join(', ');
        return `INSERT INTO ${this.query_util.escapeField(table_name)} (${columns}) VALUES (${values})`;
    }

    // Method to get bulk insert record queries
    bulkInsert = (table_schema, values) => {
        const { table_name, columns } = table_schema;

        if (!Array.isArray(values) || values.length === 0) { throw new Error("No values provided for bulk insert"); }

        // Determine which columns are actually present in the data
        const first_row     = values[0];
        const data_columns = Object.keys(first_row).filter(key => key in columns);
        const cols          = data_columns.map(this.query_util.escapeField).join(', ');

        // Generate value tuples
        const vals = values.map(row => {
            const row_values = data_columns.map(col => this.query_util.escapeValue(row[col]));
            return `(${row_values.join(', ')})`;
        }).join(', ');

        // Final query
        return `INSERT INTO ${this.query_util.escapeField(table_name)} (${cols}) VALUES ${vals}`;
    };


    // Method to get update a record query
    update = (table_name, where, data) => {
        const set_clause = Object.entries(data).map(([k, v]) => `${this.query_util.escapeField(k)} = ${this.query_util.escapeValue(v)}`).join(', ');
        return `UPDATE ${this.query_util.escapeField(table_name)} SET ${set_clause} ${this.#formatWhereClause(where)}`.trim();
    }

    increment = (table_name, where, field, amount = 1) => {
        const escaped_field     = this.query_util.escapeField(field);
        const set_clause        = `${escaped_field} = ${escaped_field} + ${this.query_util.escapeValue(amount)}`;
        return `UPDATE ${this.query_util.escapeField(table_name)} SET ${set_clause} ${this.#formatWhereClause(where)}`.trim();
    }

    decrement = (table_name, where, field, amount = 1) => {
        const escaped_field     = this.query_util.escapeField(field);
        const set_clause        = `${escaped_field} = ${escaped_field} - ${this.query_util.escapeValue(amount)}`;
        return `UPDATE ${this.query_util.escapeField(table_name)} SET ${set_clause} ${this.#formatWhereClause(where)}`.trim();
    }

    
    // Method to get delete record query
    delete = (table_name, where) => { return `DELETE FROM ${this.query_util.escapeField(table_name)} ${this.#formatWhereClause(where)}`.trim(); }

    // Method to get create a table query
    createTable = (schema) => {
        const { table_name, columns, primary_key } = schema;
    
        const cols_def = Object.entries(columns).map(([col, def]) => this.#formatColumnDefinition(col, def)).join(', ');
    
        const pk = primary_key ? `, PRIMARY KEY (${(Array.isArray(primary_key) ? primary_key : [primary_key]).map(this.query_util.escapeField).join(', ')})` : '';
    
        return `CREATE TABLE ${this.query_util.escapeField(table_name)} (${cols_def}${pk})`;
    }

    // Method to add a column
    addColumn = (table_name, column_name, def, position = {}) => {
        let col_def = this.#formatColumnDefinition(column_name, def);
        let pos_clause = '';
    
        if (position.after) { pos_clause = `AFTER ${this.query_util.escapeField(position.after)}`; }
        
        else if (position.before) { pos_clause = `BEFORE ${this.query_util.escapeField(position.before)}`; }
    
        return `ALTER TABLE ${this.query_util.escapeField(table_name)} ADD COLUMN ${col_def} ${pos_clause}`.trim();
    }
    
    // Method to get create index query
    createIndex = (table_name, index_fields, unique) => {
        const fields    = index_fields.map(this.query_util.escapeField).join(', ');
        const idxName   = `idx_${table_name}_${index_fields.join('_')}`;
        return `CREATE ${unique ? 'UNIQUE ' : ''}INDEX ${this.query_util.escapeField(idxName)} ON ${this.query_util.escapeField(table_name)} (${fields})`;
    }
    
    // Method to get drop column query
    dropColumn = (table_name, column_name) => { return `ALTER TABLE ${this.query_util.escapeField(table_name)} DROP COLUMN ${this.query_util.escapeField(column_name)}`; }
    
    // Method to get deop index query
    dropIndex = (table_name, index_name) => { return `DROP INDEX ${this.query_util.escapeField(index_name)} ON ${this.query_util.escapeField(table_name)}`; }
    
    // Method to get drop table query
    dropTable = (table_name) => { return `DROP TABLE IF EXISTS ${this.query_util.escapeField(table_name)}`; }
}

module.exports = MysqlQueryBuilder;
