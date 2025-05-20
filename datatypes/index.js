const DataTypes = {
    STRING: (length = 255) => ({ type: 'STRING', length }),
    
    // 'tiny' | 'medium' | 'long'
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

module.exports = DataTypes;
  