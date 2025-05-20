const QueryUtil = require("../utils/query_util");

class MongoDBQueryBuilder {
    constructor() {
        this.query_util = new QueryUtil();
    }

    // Method to parse where conditions
    #parseCondition = (obj) => {
        if (Array.isArray(obj)) { return { $and: obj.map(this.#parseCondition) }; }

        if (typeof obj === 'object' && obj !== null) {
            const query = {};

            for (const key in obj) {
                const value = obj[key];

                if (key === 'OR') query.$or = value.map(this.#parseCondition);

                else if (key === 'AND') query.$and = value.map(this.#parseCondition);

                else if (typeof value === 'object' && value !== null) {
                    const op = Object.keys(value)[0].toUpperCase();

                    const operand = value[op];

                    switch (op) {
                        case 'GT': query[key] = { $gt: operand }; break;
                        case 'GTE': query[key] = { $gte: operand }; break;
                        case 'LT': query[key] = { $lt: operand }; break;
                        case 'LTE': query[key] = { $lte: operand }; break;
                        case 'NE': query[key] = { $ne: operand }; break;
                        case 'IN': query[key] = { $in: operand }; break;
                        case 'NIN': query[key] = { $nin: operand }; break;
                        case 'LIKE': query[key] = { $regex: operand, $options: 'i' }; break;
                        default: throw new Error(`Unsupported operator: ${op}`);
                    }
                } 
                else { query[key] = value; }
            }
            return query;
        }

        throw new Error("Invalid where clause format");
    }

    // Method to format where cluase
    #formatProjection = (fields) => {
        if (!fields || fields.length === 0) return {};
        const projection = {};

        fields.forEach(f => projection[f] = 1);

        return projection;
    }

    // Method to format options
    #formatOptions = (options = {}) => {
        const mongoOpts = {};

        if (options.limit) {mongoOpts.limit = options.limit;}

        if (options.offset) {mongoOpts.skip = options.offset;}

        if (options.sort) {
            mongoOpts.sort = Array.isArray(options.sort) ? Object.fromEntries(options.sort.map(k => [k, 1])) : { [options.sort]: 1 };
        }

        return mongoOpts;
    }

    // SELECT (Find)
    select = (collection, fields = [], where = {}, options = {}) => {
        const filter        = this.#parseCondition(where);
        const projection    = this.#formatProjection(fields);
        const other_options = this.#formatOptions(options);

        const query = { collection, filter, projection, ...other_options };

        return JSON.stringify(query, null, 2);
    }

    // SELECT COUNT
    selectCount = (collection, where = {}) => {
        const query = { collection, operation: 'count', filter: this.#parseCondition(where) };

        return JSON.stringify(query, null, 2);
    }

    // INSERT one document
    insert = (collection, data) => {
        const query = { collection, operation: 'insertOne', document: data };
        return JSON.stringify(query, null, 2);
    }

    // BULK INSERT
    bulkInsert = (schema, values) => {
        const collection        = schema?.table_name;
        const documents         = values.map(row => {
            const obj = {};
            Object.keys(schema.columns).forEach((col, i) => {
                obj[col] = row[i];
            });
            return obj;
        })
        const query             = { collection, operation: 'insertMany', documents };

        return JSON.stringify(query, null, 2);
    }

    // UPDATE
    update = (collection, where, data) => {
        const filter    = this.#parseCondition(where)
        const query     = { collection, operation: 'updateMany', filter, update: { $set: data } }
        return JSON.stringify(query, null, 2);
    }

    // DELETE
    delete = (collection, where) => {
        const filter    = this.#parseCondition(where);
        const query     = { collection, operation: 'deleteMany', filter }
        return JSON.stringify(query, null, 2);
    }

    // CREATE COLLECTION (no schema enforcement unless using validator, which we mock here)
    createTable = (schema) => {
        const name          = schema.table_name;
        const required      = Object.entries(schema.columns).filter(([_, def]) => def.nullable === false).map(([col]) => col);
        const properties    = Object.entries(schema.columns).reduce((acc, [col, def]) => { acc[col] = { bsonType: "string" }; return acc; }, {})
        const json_schema   = { bsonType: "object", required, properties };
        const query         = { name, operation: 'createCollection', validator: { $jsonSchema: json_schema } }
            
        return JSON.stringify(query, null, 2);
    }

    // ADD COLUMN (not directly supported in MongoDB)
    addColumn = (collection, column_name, def) => {
        const query     = { operation: 'updateAllDocumentsToAddField', collection, field: column_name, defaultValue: def.default || null };
        return JSON.stringify(query, null, 2);
    }

    // CREATE INDEX
    createIndex = (collection, index_fields, unique = false) => {
        const index_spec = {};

        index_fields.forEach(f => index_spec[f] = 1);

        const query = { collection, operation: 'createIndex', fields: index_spec, options: { unique } }

        return JSON.stringify(query, null, 2);
    }

    // DROP COLUMN (not directly supported, we can unset)
    dropColumn = (collection, column_name) => {
        const query  = { collection, operation: 'updateAllDocumentsToRemoveField', field: column_name }
        return JSON.stringify(query, null, 2);
    }

    // DROP INDEX
    dropIndex = (collection, index_name) => {
        const query     = { collection, operation: 'dropIndex', indexName: index_name };
        return JSON.stringify(query, null, 2);
    }

    // DROP TABLE (collection)
    dropTable = (collection) => {
        const query = { operation: 'dropCollection',  name: collection };
        return JSON.stringify(query, null, 2);
    }
}

module.exports = MongoDBQueryBuilder;
