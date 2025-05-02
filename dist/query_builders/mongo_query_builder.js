"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_query_builder_1 = __importDefault(require("./base_query_builder"));
class MongoQueryBuilder extends base_query_builder_1.default {
    escapeField(field) { return field; }
    escapeValue(value) { return value; }
    formatCondition(key, operator, operand) {
        switch (operator) {
            case 'IN':
                return { [key]: { $in: operand } };
            case 'LIKE':
                return { [key]: { $regex: operand, $options: 'i' } }; // Case-insensitive regex for LIKE
            case '=':
                return { [key]: operand };
            case '>':
                return { [key]: { $gt: operand } };
            case '<':
                return { [key]: { $lt: operand } };
            case '>=':
                return { [key]: { $gte: operand } };
            case '<=':
                return { [key]: { $lte: operand } };
            case '!=':
                return { [key]: { $ne: operand } };
            default:
                throw new Error(`Unsupported operator: ${operator}`);
        }
    }
    parseCondition(obj) {
        if (Array.isArray(obj)) {
            // It's an array of conditions (e.g., OR/AND group)
            return obj.map(this.parseCondition);
        }
        if (typeof obj === 'object' && obj !== null) {
            const keys = Object.keys(obj);
            const conditions = {};
            keys.forEach(key => {
                if (key === 'OR' || key === 'AND') {
                    const sub_conditions = obj[key].map(this.parseCondition);
                    conditions[key.toLowerCase()] = sub_conditions;
                }
                else {
                    const value = obj[key];
                    if (typeof value === 'object' && value !== null) {
                        const operator = Object.keys(value)[0].toUpperCase();
                        const operand = value[operator];
                        const condition = this.formatCondition(key, operator, operand);
                        Object.assign(conditions, condition);
                    }
                    else {
                        conditions[key] = value;
                    }
                }
            });
            return conditions;
        }
        throw new Error('Invalid where clause format');
    }
    formatWhereClause(where) {
        if (!where || Object.keys(where).length === 0)
            return '';
        const condition = this.parseCondition(where);
        return JSON.stringify(condition); // Return the condition as a Mongo query object
    }
    formatOptions(options) {
        if (!options) {
            return JSON.stringify({});
        }
        const { limit, offset, order, distinct, lock } = options;
        const options_obj = {};
        if (distinct) {
            options_obj.distinct = true;
        }
        if (order) {
            // MongoDB uses an object for sorting
            const order_obj = Array.isArray(order) ? order.reduce((acc, item) => {
                const [field, direction] = item.split(' ');
                acc[field] = direction === 'ASC' ? 1 : -1;
                return acc;
            }, {}) : { [order]: 1 };
            options_obj.sort = order_obj;
        }
        if (limit) {
            options_obj.limit = limit;
        }
        if (offset) {
            options_obj.skip = offset;
        }
        if (lock) {
            options_obj["$lock"] = lock;
        } // MongoDB uses other ways to lock records, so we don't handle it as SQL.
        return JSON.stringify(options_obj);
    }
    select(table_name, fields, where, options) {
        const projection = fields.reduce((acc, field) => { acc[field] = 1; return acc; }, {});
        const query = { collection: table_name, filter: this.formatWhereClause(where), projection };
        return JSON.stringify(query);
    }
    selectCount(table_name, where = {}, options = {}) {
        const query = { operation: "countDocuments", collection: table_name, filter: where, options };
        return JSON.stringify(query);
    }
    insert(table_name, data) {
        const query = { collection: table_name, document: data };
        return JSON.stringify(query);
    }
    update(table_name, where, data) {
        const query = { collection: table_name, filter: this.formatWhereClause(where), update: { $set: data } };
        return JSON.stringify(query);
    }
    delete(table_name, where) {
        const query = { collection: table_name, filter: this.formatWhereClause(where) };
        return JSON.stringify(query); // Return the Mongo delete query in JSON format
    }
    createTable(table_schema) {
        // MongoDB doesn't use CREATE TABLE in the same way as SQL, but we can define collections.
        return `Collection ${table_schema.table_name} created`;
    }
    createIndex(table_name, index_fields, unique) {
        const index = { collection: table_name, index: index_fields, unique };
        return JSON.stringify(index);
    }
    bulkInsert(table_schema, values) {
        const query = { collection: table_schema.table_name,
            documents: values.map((row) => row.reduce((acc, value, index) => {
                const column = Object.keys(table_schema.columns)[index];
                acc[column] = value;
                return acc;
            }, {}))
        };
        return JSON.stringify(query); // Return the Mongo bulk insert query in JSON format
    }
    addColumn(table_name, column_name, column_def, position) { return `// MongoDB: Add "${this.escapeField(column_name)}" to documents in "${this.escapeField(table_name)}" collection`; }
    dropColumn(table_name, column_name) { return `// MongoDB: Remove "${this.escapeField(column_name)}" from documents in "${this.escapeField(table_name)}" collection`; }
    dropIndex(table_name, index_name) { return `db.${this.escapeField(table_name)}.dropIndex("${this.escapeField(index_name)}")`; }
    dropTable(table_name) { return `db.${this.escapeField(table_name)}.drop()`; }
}
exports.default = MongoQueryBuilder;
