"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mapToMySQLType = (dataType) => {
    switch (dataType.type) {
        case 'STRING': return `VARCHAR(${dataType.length})`;
        case 'TEXT': return `${dataType.variant.toUpperCase()}TEXT`;
        case 'INTEGER': return 'INT';
        case 'BIGINT': return 'BIGINT';
        case 'BOOLEAN': return 'TINYINT(1)';
        case 'DATE': return 'DATETIME';
        case 'FLOAT': return 'FLOAT';
        case 'DECIMAL': return `DECIMAL(${dataType.precision}, ${dataType.scale})`;
        case 'JSON': return 'JSON';
        case 'ENUM': return `ENUM(${dataType.values.map((v) => `'${v}'`).join(', ')})`;
        case 'UUID': return 'CHAR(36)';
        default: throw new Error(`Unsupported MySQL type: ${dataType.type}`);
    }
};
exports.default = mapToMySQLType;
