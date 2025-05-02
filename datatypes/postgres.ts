const mapToPostgresType = (dataType: any): string => {
    switch (dataType.type) {
      case 'STRING': return `VARCHAR(${dataType.length})`;
      case 'TEXT': return 'TEXT';
      case 'INTEGER': return 'INTEGER';
      case 'BIGINT': return 'BIGINT';
      case 'BOOLEAN': return 'BOOLEAN';
      case 'DATE': return 'TIMESTAMP';
      case 'FLOAT': return 'REAL';
      case 'DECIMAL': return `DECIMAL(${dataType.precision}, ${dataType.scale})`;
      case 'JSON': return 'JSONB';
      case 'ENUM': return `EXT CHECK (${(dataType.values as string[]).map((v: string) => `'${v}'`).join(', ')})`;
      case 'UUID': return 'UUID';
      default: throw new Error(`Unsupported PostgreSQL type: ${dataType.type}`);
    }
}

export default mapToPostgresType;
  