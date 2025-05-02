"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mapToMongoType = (dataType) => {
    switch (dataType.type) {
        case 'STRING': return 'String';
        case 'TEXT': return 'String';
        case 'INTEGER':
        case 'BIGINT':
        case 'FLOAT':
        case 'DECIMAL': return 'Number';
        case 'BOOLEAN': return 'Boolean';
        case 'DATE': return 'Date';
        case 'JSON': return 'Object';
        case 'ENUM': return 'String'; // Add enum validator later
        case 'UUID': return 'String';
        default: throw new Error(`Unsupported MongoDB type: ${dataType.type}`);
    }
};
exports.default = mapToMongoType;
