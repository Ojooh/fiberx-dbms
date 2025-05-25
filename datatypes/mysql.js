
const mapToMySQLType = (data_type) => {
  switch (data_type.type) {
    case 'STRING': return `VARCHAR(${data_type.length})`;

    case 'TEXT': return `${(data_type?.variant || "LONG").toUpperCase() }TEXT`;

    case 'INTEGER': return 'INT';

    case 'BIGINT': return 'BIGINT';

    case 'BOOLEAN': return 'TINYINT(1)';

    case 'DATE': return 'DATETIME';

    case 'FLOAT': return 'FLOAT';

    case 'DECIMAL': return `DECIMAL(${data_type?.precision}, ${data_type?.scale})`;

    case 'JSON': return 'JSON';

    case 'ENUM': return `ENUM(${(data_type?.values).map((v) => `'${v}'`).join(', ')})`;

    case 'UUID': return 'CHAR(36)';
    
    default: throw new Error(`Unsupported MySQL type: ${data_type?.type}`);
  }
}

module.exports = mapToMySQLType;
