const mapToPostgresType = (data_type) => {
    switch (data_type.type) {
      case 'STRING': return `VARCHAR(${data_type.length})`;

      case 'TEXT': return 'TEXT';

      case 'INTEGER': return 'INTEGER';

      case 'BIGINT': return 'BIGINT';

      case 'BOOLEAN': return 'BOOLEAN';

      case 'DATE': return 'DATE';

      case 'DATETIME': return 'TIMESTAMP';

      case 'FLOAT': return 'REAL';

      case 'DECIMAL': return `DECIMAL(${data_type.precision}, ${data_type.scale})`;

      case 'JSON': return 'JSONB';

      case 'ENUM': return `EXT CHECK (${(data_type.values).map((v) => `'${v}'`).join(', ')})`;

      case 'UUID': return 'UUID';
      
      default: throw new Error(`Unsupported PostgreSQL type: ${data_type.type}`);
    }
}

module.exports = mapToPostgresType;
  