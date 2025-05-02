"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_query_builder_1 = __importDefault(require("./base_query_builder"));
const postgres_1 = __importDefault(require("@/datatypes/postgres"));
class PostgresQueryBuilder extends base_query_builder_1.default {
    constructor() {
        super(...arguments);
        this.parse_condition = (obj) => {
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
                        const operator = Object.keys(value)[0].toUpperCase();
                        const operand = value[operator];
                        return this.formatCondition(key, operator, operand); // Ensure the result is returned
                    }
                    else {
                        return `${this.escapeField(key)} = ${this.escapeValue(value)}`;
                    }
                }).join(' AND ');
            }
            throw new Error('Invalid where clause format');
        };
    }
    escapeField(field) { return `"${field}"`; }
    escapeValue(value) {
        if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`;
        }
        return value === null ? 'NULL' : value.toString();
    }
    formatCondition(key, operator, operand) {
        switch (operator) {
            case 'IN':
                return `${this.escapeField(key)} IN (${operand.map((v) => this.escapeValue(v)).join(', ')})`;
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
    formatWhereClause(where) {
        if (!where || Object.keys(where).length === 0)
            return '';
        const condition_str = this.parse_condition(where);
        return `WHERE ${condition_str}`;
    }
    formatOptions(options) {
        if (!options) {
            return '';
        }
        const { limit, offset, order, distinct, lock } = options;
        let clause = '';
        if (distinct) {
            clause += ` DISTINCT`;
        }
        if (order) {
            // Assumes order is a string like 'field ASC'
            const order_clause = Array.isArray(order) ? order.map((item) => `${item}`).join(', ') : order;
            clause += ` ORDER BY ${order_clause}`;
        }
        if (limit) {
            clause += ` LIMIT ${limit}`;
        }
        if (offset) {
            clause += ` OFFSET ${offset}`;
        }
        // e.g., 'FOR UPDATE'
        if (lock) {
            clause += ` FOR ${lock}`;
        }
        return clause;
    }
    beginTransaction() { return 'BEGIN'; }
    commitTransaction() { return 'COMMIT'; }
    rollbackTransaction() { return 'ROLLBACK'; }
    select(table_name, fields, where, options) {
        const escape_fields = fields.map(this.escapeField).join(', ');
        return `SELECT ${escape_fields} FROM ${this.escapeField(table_name)} ${this.formatWhereClause(where)} ${this.formatOptions(options)}`.trim();
    }
    // Count Query
    selectCount(table_name, where, options) {
        return `SELECT COUNT(*) FROM ${this.escapeField(table_name)} ${this.formatWhereClause(where)} ${this.formatOptions(options)}`;
    }
    insert(table_name, data, options) {
        const columns = Object.keys(data).map(this.escapeField).join(', ');
        const values = Object.values(data).map(this.escapeValue).join(', ');
        return `INSERT INTO ${this.escapeField(table_name)} (${columns}) VALUES (${values})`;
    }
    update(table_name, where, data, options) {
        const set_clause = Object.entries(data).map(([key, value]) => `${this.escapeField(key)} = ${this.escapeValue(value)}`).join(', ');
        return `UPDATE ${this.escapeField(table_name)} SET ${set_clause} ${this.formatWhereClause(where)}`.trim();
    }
    delete(table_name, where, options) {
        return `DELETE FROM ${this.escapeField(table_name)} ${this.formatWhereClause(where)}`.trim();
    }
    createTable(table_schema) {
        const { primary_key, columns } = table_schema;
        // Create column definitions
        const columns_def = Object.entries(columns).map(([col, options]) => {
            const sql_type = (0, postgres_1.default)(options.type);
            let column_def = `${this.escapeField(col)} ${sql_type}`;
            // Add SERIAL/BIGSERIAL for auto-incrementing primary keys
            if (options.auto_increment && sql_type === 'INT') {
                column_def = `${this.escapeField(col)} SERIAL`;
            }
            else if (options.auto_increment && sql_type === 'BIGINT') {
                column_def = `${this.escapeField(col)} BIGSERIAL`;
            }
            // Add DEFAULT value if present
            let default_value = "";
            if (options.default === "CURRENT_TIMESTAMP") {
                default_value = " DEFAULT NOW()";
            }
            else if (options.default !== undefined) {
                default_value = ` DEFAULT ${this.escapeValue(options.default)}`;
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
            const primaryKeyColumns = Array.isArray(primary_key) ? primary_key : [primary_key];
            primary_key_clause = `, PRIMARY KEY (${primaryKeyColumns.map(this.escapeField).join(', ')})`;
        }
        // Final CREATE TABLE statement
        return `CREATE TABLE ${this.escapeField(table_schema.table_name)} (${columns_def}${primary_key_clause})`;
    }
    createIndex(table_name, index_fields, unique) {
        const fields = index_fields.map(this.escapeField).join(', ');
        const unique_clause = unique ? 'UNIQUE' : '';
        const index_name = `idx_${table_name}_${index_fields.join('_')}`;
        return `CREATE ${unique_clause} INDEX ${this.escapeField(index_name)} ON ${this.escapeField(table_name)} (${fields})`;
    }
    bulkInsert(table_schema, values) {
        const { table_name, columns } = table_schema;
        // Escape columns
        const column_str = Object.entries(columns).map(([col, options]) => this.escapeField(col)).join(', ');
        // Escape all values
        const values_str = values.map(row => `(${row.map(value => this.escapeValue(value)).join(', ')})`).join(', ');
        // Construct the final bulk insert query
        return `INSERT INTO ${this.escapeField(table_name)} (${column_str}) VALUES ${values_str}`;
    }
    addColumn(table_name, column_name, column_def, position) {
        const type = (0, postgres_1.default)(column_def.type);
        const nullable = column_def.nullable ? "" : "NOT NULL";
        const unique = column_def.unique ? "UNIQUE" : "";
        let column_type = "";
        // Add DEFAULT value if present
        let default_val = "";
        if (column_def.default === "CURRENT_TIMESTAMP") {
            default_val = " DEFAULT NOW()";
        }
        else if (column_def.default !== undefined) {
            default_val = ` DEFAULT ${this.escapeValue(column_def.default)}`;
        }
        if (column_def.auto_increment) {
            if (type === "INT") {
                column_type = "SERIAL";
            }
            else if (type === "BIGINT") {
                column_type = "BIGSERIAL";
            }
            else {
                throw new Error(`Auto-increment is not supported for type ${type} in PostgreSQL`);
            }
            // SERIAL/BIGSERIAL already implies NOT NULL and auto-increment behavior
            return `ALTER TABLE "${this.escapeField(table_name)}" ADD COLUMN "${this.escapeField(column_name)}" ${this.escapeField(column_type)} ${unique}`.trim();
        }
        // PostgreSQL does not support BEFORE/AFTER — position is ignored
        return `ALTER TABLE "${this.escapeField(table_name)}" ADD COLUMN "${this.escapeField(column_name)}" ${type} ${nullable} ${default_val} ${unique}`.trim();
    }
    dropColumn(table_name, column_name) { return `ALTER TABLE "${this.escapeField(table_name)}" DROP COLUMN "${this.escapeField(column_name)}"`.trim(); }
    dropIndex(table_name, index_name) { return `DROP INDEX IF EXISTS "${this.escapeField(index_name)}" ON "${this.escapeField(table_name)}"`; }
    dropTable(table_name) { return `DROP TABLE IF EXISTS "${this.escapeField(table_name)}"`; }
}
exports.default = PostgresQueryBuilder;
