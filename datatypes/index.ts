const DataTypes = {
    STRING: (length: number = 255) => ({ type: 'STRING', length }),
    TEXT: (variant: 'tiny' | 'medium' | 'long' = 'medium') => ({ type: 'TEXT', variant }),
    INTEGER: () => ({ type: 'INTEGER' }),
    BIGINT: () => ({ type: 'BIGINT' }),
    BOOLEAN: () => ({ type: 'BOOLEAN' }),
    DATE: () => ({ type: 'DATE' }),
    FLOAT: () => ({ type: 'FLOAT' }),
    DECIMAL: (precision: number = 10, scale: number = 2) => ({ type: 'DECIMAL', precision, scale }),
    JSON: () => ({ type: 'JSON' }),
    ENUM: (...values: string[]) => ({ type: 'ENUM', values }),
    UUID: () => ({ type: 'UUID' }),
};

export default DataTypes;
  