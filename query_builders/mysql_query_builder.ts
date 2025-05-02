import { TableSchemaInterface, QueryFormatOptionInterface, TableColumnInterface,ColumnPositionType } from "../types/common_types";

import mapToMySQLType from "../datatypes/mysql"
import BaseQueryBuilder from "./base_query_builder";

class MysqlQueryBuilder extends BaseQueryBuilder {
    escapeField(field: string): string { return `${field}`; }

    escapeValue(value: any): string {
        if (typeof value === 'string') { return `'${value.replace(/'/g, "''")}'`; }
        return value === null ? 'NULL' : value.toString();
    }

    private formatCondition(key: string, operator: string, operand: any): string {
        switch (operator) {
            case 'IN':
                return `${this.escapeField(key)} IN (${operand.map((v: any) => this.escapeValue(v)).join(', ')})`;
            case 'LIKE':
                return `${this.escapeField(key)} LIKE ${this.escapeValue(operand)}`;
            case '=':
            case '>':
            case '<':
            case '>=':
            case '<=':
            case '!=':
                return `${this.escapeField(key)} ${operator} ${this.escapeValue(operand)}`;
            default:
                throw new Error(`Unsupported operator: ${operator}`);
        }
    }
    
    private parse_condition = (obj: any): string => {
        if (Array.isArray(obj)) {
            // It's an array of conditions (e.g., OR/AND group)
            return obj.map(this.parse_condition).join(' AND ');
        }

        if (typeof obj === 'object' && obj !== null) {
            const keys = Object.keys(obj);
            return keys.map(key => {
                if (key === 'OR' || key === 'AND') {
                    const sub_conditions = obj[key].map(this.parse_condition).join(` ${key} `);
                    return `(${sub_conditions})`;
                }

                const value = obj[key];

                if (typeof value === 'object' && value !== null) {
                    const operator  = Object.keys(value)[0].toUpperCase();
                    const operand   = value[operator];

                    return this.formatCondition(key, operator, operand);
                    
                } else {
                    return `${this.escapeField(key)} = ${this.escapeValue(value)}`;
                }
            }).join(' AND ');
        }

        throw new Error('Invalid where clause format');
    };


    formatWhereClause(where?: any): string {
        if (!where || Object.keys(where).length === 0) return '';
    
        const condition_str = this.parse_condition(where);

        return `WHERE ${condition_str}`;
    }
    
    formatOptions(options?: QueryFormatOptionInterface): string {
        if (!options) { return ''; }

        const { limit, offset, order, distinct, lock } = options as any;

        let clause = '';

        if (distinct) { clause += ` DISTINCT`; }

        if (order) {
            // Assumes order is a string like 'field ASC'
            const order_clause = Array.isArray(order)  ? order.map((item: string) => `${item}`).join(', ') : order;  
            clause += ` ORDER BY ${order_clause}`;
        }

        if (limit) { clause += ` LIMIT ${limit}`; }

        if (offset) { clause += ` OFFSET ${offset}`; }

        // e.g., 'FOR UPDATE'
        if (lock) { clause += ` FOR ${lock}`;  }

        return clause;
    }

    beginTransaction(): string { return 'START TRANSACTION'; }

    commitTransaction(): string { return 'COMMIT'; }

    rollbackTransaction(): string { return 'ROLLBACK'; }

    select(table_name: string, fields: string[], where?: object, options?: object): string {
        const escape_fields = fields.map(this.escapeField).join(', ');
        return `SELECT ${escape_fields} FROM ${this.escapeField(table_name)} ${this.formatWhereClause(where)} ${this.formatOptions(options)}`.trim();
    }

    selectCount(table_name: string, where?: object, options?: object): string {
        return `SELECT COUNT(*) as count FROM ${this.escapeField(table_name)} ${this.formatWhereClause(where)} ${this.formatOptions(options)}`.trim();
    }

    insert(table_name: string, data: object, options?: object): string {
        const columns   = Object.keys(data).map(this.escapeField).join(', ');
        const values    = Object.values(data).map(this.escapeValue).join(', ');
        return `INSERT INTO ${this.escapeField(table_name)} (${columns}) VALUES (${values})`;
    }

    update(table_name: string, where: object, data: object, options?: object): string {
        const set_clause = Object.entries(data).map(([key, value]) => `${this.escapeField(key)} = ${this.escapeValue(value)}`).join(', ');

        return `UPDATE ${this.escapeField(table_name)} SET ${set_clause} ${this.formatWhereClause(where)}`.trim();
    }

    delete(table_name: string, where: object, options?: object): string { return `DELETE FROM ${this.escapeField(table_name)} ${this.formatWhereClause(where)}`.trim();}

    createTable(table_schema: TableSchemaInterface): string {
        const { primary_key, columns } = table_schema;
    
        // Create column definitions
        const columns_def = Object.entries(columns).map(([col, options]) => {
            const sql_type = mapToMySQLType(options.type);
            let column_def = `${this.escapeField(col)} ${sql_type}`;
    
            // Add AUTO_INCREMENT if the column is INT/BIGINT and auto_increment is true
            if ((sql_type === 'INT' || sql_type === 'BIGINT') && options.auto_increment) { column_def += ' AUTO_INCREMENT'; }
            
            // Add UNIQUE constraint if the column has unique set to true
            if (options.unique) { 
                column_def += ' UNIQUE'; 
            }
    
            // Add DEFAULT value if present
            let default_value = ""
            if (options.default === "CURRENT_TIMESTAMP") { default_value = " DEFAULT CURRENT_TIMESTAMP"; }

            else if (options.default !== undefined) { 
                default_value = ` DEFAULT ${this.escapeValue(options.default)}`;
            }

            if (options.on_update === "CURRENT_TIMESTAMP") {
                default_value += " ON UPDATE CURRENT_TIMESTAMP";
            }

    
            // Add NULL/NOT NULL constraint
            const nullable = options.nullable === false ? ' NOT NULL' : '';
    
            // Add FOREIGN KEY references if present
            let references = '';
            if (options.references) {
                const { table, column } = options.references;
                references = ` REFERENCES ${this.escapeField(table)}(${this.escapeField(column)})`;
            }
    
            // Combine all parts for the column definition
            return `${column_def}${default_value}${nullable}${references}`;
        }).join(', ');
    
        // Handle primary key
        let primary_key_clause = '';
        if (primary_key) {
            const primary_key_columns = Array.isArray(primary_key) ? primary_key : [primary_key];
            primary_key_clause = `, PRIMARY KEY (${primary_key_columns.map(this.escapeField).join(', ')})`;
        }
    
        // Final CREATE TABLE statement
        return `CREATE TABLE ${this.escapeField(table_schema.table_name)} (${columns_def}${primary_key_clause})`;
    }
    
    createIndex(table_name: string, index_fields: string[], unique: boolean): string {
        const fields            = index_fields.map(this.escapeField).join(', ');
        const unique_clause      = unique ? 'UNIQUE' : '';
        const indexName         = `idx_${table_name}_${index_fields.join('_')}`;
        return `CREATE ${unique_clause} INDEX ${this.escapeField(indexName)} ON ${this.escapeField(table_name)} (${fields})`;
    }

    bulkInsert(table_schema: TableSchemaInterface, values: any[][]): string {
        const { table_name, columns } = table_schema;

        // Escape columns
        const column_str = Object.entries(columns).map(([col, options]) =>  this.escapeField(col)).join(', ');

        // Escape all values
        const values_str = values.map(row => `(${row.map(value => this.escapeValue(value)).join(', ')})`).join(', ');

        // Construct the final bulk insert query
        return `INSERT INTO ${this.escapeField(table_name)} (${column_str}) VALUES ${values_str}`;
    }

    addColumn(table_name: string, column_name: string, column_def: TableColumnInterface, position: ColumnPositionType):string {
        const type          = mapToMySQLType(column_def.type);
        const nullable      = column_def.nullable ? "" : "NOT NULL";
        const default_val   = column_def.default !== undefined ? `DEFAULT ${this.escapeValue(column_def.default)}` : "";
        const auto_inc      = column_def.auto_increment ? "AUTO_INCREMENT" : "";
        const unique        = column_def.unique ? "UNIQUE" : "";

        let position_SQL = "";
        if (position?.after) {
            position_SQL = `AFTER ${position.after}`;
        } else if (position?.before) {
            position_SQL = `BEFORE ${position.before}`;
        }

        return `ALTER TABLE ${this.escapeField(table_name)} ADD COLUMN ${this.escapeField(column_name)} ${type} ${nullable} ${default_val} ${auto_inc} ${unique} ${position_SQL}`.trim();
    }

    dropColumn(table_name: string, column_name: string):string { return `ALTER TABLE ${this.escapeField(table_name)} DROP COLUMN ${this.escapeField(column_name)}`; }

    dropIndex(table_name: string, index_name: string):string { return `DROP INDEX ${this.escapeField(index_name)} ON ${this.escapeField(table_name)}`; }

    dropTable(table_name: string):string { return `DROP TABLE IF EXISTS ${this.escapeField(table_name)} `; }
}

export default MysqlQueryBuilder;
