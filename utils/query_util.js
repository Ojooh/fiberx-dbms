
const mapToPostgresType = require("../datatypes/postgres");
const mapToMySQLType    = require("../datatypes/mysql");

class QueryUtil {
    constructor(model_instance, dialect = "mysql",  logger = null) {
        this.model_instance     = model_instance
        this.dialect            = dialect.toLowerCase();
        this.logger             = logger || console;
        this.data_typer_mapper  = this.#getDataTypeMapper(); 
    }

    // method to escape field
    escapeField = (field) => {
        const quote_char    = this.dialect === 'postgres' ? `"` : '`';
        const escaped       = field.replace(new RegExp(quote_char, 'g'), quote_char + quote_char);

        return `${quote_char}${escaped}${quote_char}`;
    };

    escapeQualifiedField = (qualified) => {
        const [table, column] = qualified.split('.');
        return `${this.escapeField(table)}.${this.escapeField(column)}`;
    };

    // method to escape value
    escapeValue = (value) => {
        if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`;
        }
        if (Array.isArray(value)) {
            return `(${value.map(v => this.escapeValue(v)).join(', ')})`;
        }
        if (typeof value === 'object' && value !== null) {
            throw new Error('Cannot escape object value directly');
        }

        return value === null ? 'NULL' : value.toString();
    };


    // method to convert fields array to fields string with table name
    formatSelectFields = (table_name, fields = []) => {
        if (!fields || fields.length === 0) {
            this.logger?.info?.(`[QUERY_BUILDER] fields list value ${fields} — defaulting to "*" for all fields`);
            fields = ["*"];
        }

        return fields.map(f =>
            f === '*'
                ? `${this.escapeField(table_name)}.*`
                : `${this.escapeField(table_name)}.${this.escapeField(f)} AS ${this.escapeField(`${table_name}.${f}`)}`
        ).join(', ');
    }

    // Method to builds complete SELECT, JOIN, and subquery field parts
    formatIncludes = (base_table, includes = [], ) => {
        let joins = [], extra_fields = [];

        for (const include_obj of includes) {
            const association   = this.#resolveAssociation(base_table, include_obj);
            const alias         = include_obj?.as || association?.model?.schema?.table_name;
            let nested          = { joins: [], fields: [] };

            if (include_obj?.include && include_obj?.include?.length > 0) {
                nested = this.formatIncludes(alias, include_obj?.include);
            }

            if (['hasOne', 'belongsTo'].includes(association?.type)) {
                const { join, fields } = this.#generateJoin(base_table, association, include_obj);

                joins.push(join, ...nested?.joins);
                extra_fields.push(fields, nested?.fields);
            } 
            else if (['hasMany', 'belongsToMany'].includes(association?.type)) {
                const sub = this.#generateSubqueryField(base_table, association, include_obj);

                extra_fields.push(sub); 
            } 
            else {
                throw new Error(`Unsupported association type: ${association?.type}`);
            }
        }

        return { joins, fields: extra_fields };
    };

    // Method to format where cluase
    formatWhereClause = (table_name, where = null, ) => {
        if (!where || Object.keys(where).length === 0) { return ''; }
    
        const condition_str = this.#parseWhereCondition(table_name, where);

        return `WHERE ${condition_str}`;
    }

    // Method to format options
    formatOptions = (options = null) => {
        if (!options) { return ""; }

        const { limit, offset, order_by, distinct, lock } = options;

        let clause = '';
    
        if (distinct) { clause += ' DISTINCT'; }

        if (order_by) { clause += ` ORDER BY ${Array.isArray(order_by) ? order_by.join(', ') : order_by}`;  }

        if (limit) { clause += ` LIMIT ${limit}`; }

        if (offset) { clause += ` OFFSET ${offset}`; }

        if (lock) { clause += ` FOR ${lock}`; }

        return clause;
    }

    // Method to format column definition to sql string
    formatColumnDefinition = (column_name, options) => {
        const { 
            type = {}, auto_increment = false, unique = false, default: default_value = undefined,  
            on_update = null, nullable = true, references = {}
        } = options;

        const is_postgres = this.dialect === 'postgres';

        const is_mysql = this.dialect === 'mysql';

        let sql_type;

        // Handle SERIAL types for PostgreSQL
        if (is_postgres && auto_increment) {
            const normalized_type = typeof type === 'string' ? type.toUpperCase() : '';
            if (normalized_type === 'BIGINT') { sql_type = 'BIGSERIAL'; } 
            
            else { sql_type = 'SERIAL'; }
        } 
        else { sql_type = this.data_typer_mapper(type); }

        let col_definition_sql = `${this.escapeField(column_name)} ${sql_type}`;
    
        if (is_mysql && (sql_type === 'INT' || sql_type === 'BIGINT') && auto_increment) { col_definition_sql += ' AUTO_INCREMENT'; }
    
        if (unique) { col_definition_sql += ' UNIQUE'; }
    
        if (default_value !== undefined) {
            if (default_value === 'CURRENT_TIMESTAMP') { col_definition_sql += ' DEFAULT CURRENT_TIMESTAMP';} 
            
            else { col_definition_sql += ` DEFAULT ${this.escapeValue(default_value)}`;}
        }
    
        if (is_mysql && on_update === 'CURRENT_TIMESTAMP') { col_definition_sql += ' ON UPDATE CURRENT_TIMESTAMP'; }
    
        if (nullable === false) { col_definition_sql += ' NOT NULL'; }
    
        if (references && Object.keys(references).length) {
            const { table, column, on_delete, on_update }     = references;

            col_definition_sql  += ` REFERENCES ${this.escapeField(table)}(${this.escapeField(column)})`;
    
            if (on_delete)  { col_definition_sql += ` ON DELETE ${on_delete.toUpperCase()}`; }

            if (on_update) col_definition_sql += ` ON UPDATE ${on_update.toUpperCase()}`;
        }

        let trigger_sql = null;
        if (is_postgres && on_update === 'CURRENT_TIMESTAMP') {
            trigger_sql = this.#getUpdatedAtTriggerSQL(column_name)
        }
    
        return {col_definition_sql, trigger_sql};
    }

    // Method to retrun data type mapper based on dialect
    #getDataTypeMapper = () => {
        if (this.dialect === "postgres") { return mapToPostgresType; }
        
        else if (this.dialect === "mysql") { return mapToMySQLType; }

        else { new Error('Invalid dialect no data type mapper'); }
    }

    // Unified method for quoting identifiers
    #quoteIdentifier = (identifier) => {
        const quote = this.dialect === 'postgres' ? '"' : '`';
        return `${quote}${identifier.replace(new RegExp(quote, 'g'), quote + quote)}${quote}`;
    };

    // method to gets association metadata 
    #resolveAssociation = (base_table, include) => {
        const associations          = this.model_instance.getAssociations?.() || [];
        const include_table_name    = include?.model?.schema?.table_name;

        const match = associations.find(a => {
            const tgt                   = a.model?.schema?.table_name;
            const matches_table         = tgt === include_table_name;
            const matches_alias         = include?.as && a?.as ? include.as === a.as : false;
            return matches_table && matches_alias;
        });
    
        if (!match) { throw new Error(`Association not found for ${base_table} in include.`); }
    
        return match;
    }

    // method to handle nested OR / AND conditions
    #handleNestedORANDCondition = (table_name, key, where_obj) => {
        const conditions = where_obj[key];

        if (!Array.isArray(conditions)) {
            throw new Error(`${key} must be an array`);
        }

        const parsed = conditions.map((cond) => {
            const condition_str = this.#parseWhereCondition(table_name, cond);
            return `(${condition_str})`;
        }).join(` ${key} `);

        return `(${parsed})`;
    }

    #formatWhereCondition = (qualified_key, operator, operand) => {
        const op = operator.toUpperCase();

        switch (op) {
            case 'IN':
                return `${qualified_key} IN ${this.escapeValue(operand)}`;
            case 'LIKE':
                const like_operator = this.dialect === 'postgres' ? 'ILIKE' : 'LIKE';
                return `${qualified_key} ${like_operator} ${this.escapeValue(operand)}`;
            case '=':
            case '>':
            case '<':
            case '>=':
            case '<=':
            case '!=':
                return `${qualified_key} ${op} ${this.escapeValue(operand)}`;
            default:
                throw new Error(`Unsupported operator: ${op}`);
        }
    }

    // Method to parse where conditions
    #parseWhereCondition = (table_name, where_obj) => {
        if (typeof where_obj !== 'object' || where_obj === null) {
            throw new Error('Invalid where clause format');
        }

        if (Array.isArray(where_obj)) {
            throw new Error('Invalid root-level array in where clause');
        }

        return Object.keys(where_obj).map(
            (key) => {
                const value             = where_obj[key];

                if (key === 'OR' || key === 'AND') {
                    return this.#handleNestedORANDCondition(table_name, key, where_obj);
                }

                const qualified_field = `${this.escapeField(table_name)}.${this.escapeField(key)}`;

                if (typeof value === 'object' && value !== null) {
                    const operator  = Object.keys(value)[0].toUpperCase();
                    const operand   = value[operator];
                    return this.#formatWhereCondition(qualified_field, operator, operand);
                }

                else {
                    return `${qualified_field} =  ${this.escapeValue(value)}`;
                }
            }
        ).join(' AND ');
    }

    #escapeQualifiedField = (qualified) => {
        const [table, column] = qualified.split('.');
        return `${this.escapeField(table)}.${this.escapeField(column)}`;
    };

    // method to build builds JOINs for hasOne / belongsTo
    #generateJoin = (base_table, association, include) => {
        const { model: target_model, foreign_key, target_key } = association;

        const target_table          = target_model?.schema?.table_name;
        const all_fields            = Object.keys(target_model?.schema?.columns);
        const target_fields         = include?.fields?.length && include?.fields?.includes('*') ? all_fields : include?.fields || all_fields;
        const alias                 = include?.as || target_table;
        const required              = include.required !== false; 
        const type                  = required ? 'INNER' : 'LEFT';
        const left                  = this.#escapeQualifiedField( association.type === 'belongsTo' ? `${alias}.${target_key}` : `${base_table}.${foreign_key}`);
        const right                 = this.#escapeQualifiedField( association.type === 'belongsTo' ? `${base_table}.${foreign_key}` : `${alias}.${target_key}`);
        let where_clause            = `${left} = ${right}`;

        // Add include.where if present
        if (include?.where) {
            const where_condition   = this.#parseWhereCondition(alias, include?.where).replace(/^AND\s+/, '');
            where_clause            += ` AND (${where_condition})`;
        }

        const fields = this.formatSelectFields(alias, target_fields)

        const join = `${type} JOIN ${this.#quoteIdentifier(target_table)} AS ${this.#quoteIdentifier(alias)} ON ${where_clause}`;

        return { join, fields };
    }

    // Method to builds subqueries for hasMany / belongsToMany
    #generateSubqueryField = (base_table, association, include) => {
        if (include?.include && include?.include.length > 0) {
            throw new Error(`Nested includes are not supported in subqueries (hasMany/belongsToMany) for alias "${include.as || association?.model?.schema?.table_name}".`);
        }

        const { model: target_model, foreign_key } = association;

        const target_table          = target_model?.schema?.table_name;
        const plain_alias           = include.as || target_table;
        const alias                 = `${plain_alias}_sub`;
        const all_fields            = Object.keys(target_model?.schema?.columns);
        const resolved_fields       = include?.fields?.length && include?.fields?.includes('*') ? all_fields : include?.fields || all_fields;
        const field_mappings        = this.formatSelectFields(alias, resolved_fields);
        let where_clause            = `${this.#escapeQualifiedField(`${alias}.${foreign_key}`)} = ${this.#escapeQualifiedField(`${base_table}.id`)}`;

       if (include?.where) {
            const where_condition   = this.#parseWhereCondition(alias, include?.where).replace(/^AND\s+/, '');
            where_clause            += ` AND (${where_condition})`;
        }

        const sub_query = `(
            SELECT JSON_ARRAYAGG(JSON_OBJECT(${field_mappings}))
            FROM ${this.#quoteIdentifier(target_table)} AS ${this.#quoteIdentifier(alias)}
            WHERE ${where_clause}
        ) AS ${this.#quoteIdentifier(plain_alias)}`;

        return sub_query;
    }

    // Method to get update at trigger sql
    #getUpdatedAtTriggerSQL = (column_name) => {
        const trigger_name  = `trg_${column_name}_on_update`;
        const function_name = `fn_${column_name}_on_update`;
        const trigger_sql   = `
            -- Function to update ${column_name} on row update
            CREATE OR REPLACE FUNCTION ${function_name}() RETURNS TRIGGER AS $$
            BEGIN
                NEW.${column_name} = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            -- Trigger that uses the above function
            CREATE TRIGGER ${trigger_name}
            BEFORE UPDATE ON {TABLE_NAME}
            FOR EACH ROW
            EXECUTE FUNCTION ${function_name}();
        `
        return trigger_sql.replace(/\s+/g, ' ').trim();
    }
}

module.exports = QueryUtil;