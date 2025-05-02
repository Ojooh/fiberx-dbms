"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DataTypes = {
    STRING: (length = 255) => ({ type: 'STRING', length }),
    TEXT: (variant = 'medium') => ({ type: 'TEXT', variant }),
    INTEGER: () => ({ type: 'INTEGER' }),
    BIGINT: () => ({ type: 'BIGINT' }),
    BOOLEAN: () => ({ type: 'BOOLEAN' }),
    DATE: () => ({ type: 'DATE' }),
    FLOAT: () => ({ type: 'FLOAT' }),
    DECIMAL: (precision = 10, scale = 2) => ({ type: 'DECIMAL', precision, scale }),
    JSON: () => ({ type: 'JSON' }),
    ENUM: (...values) => ({ type: 'ENUM', values }),
    UUID: () => ({ type: 'UUID' }),
};
exports.default = DataTypes;
