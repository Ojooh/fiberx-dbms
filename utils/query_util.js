

class QueryUtil {
    constructor() {

    }

    // method to escape field
    escapeField = (field) => { return `${field}`; }

    // method to escape value
    escapeValue = (value) => {
        if (typeof value === 'string') { return `'${value.replace(/'/g, "''")}'`; }

        return value === null ? 'NULL' : value.toString();
    }

    // method to format where condtions
    formatWhereCondition(key, operator, operand) {
        switch (operator) {
			case 'IN':
				return `${this.escapeField(key)} IN (${operand.map(v => this.escapeValue(v)).join(', ')})`;
			case 'LIKE':
				return `${this.escapeField(key)} LIKE ${this.escapeValue(operand)}`;
			case '=':
			case '>':
			case '<':
			case '>=':
			case '<=':
			case '!=':
				return `${this.escapeField(key)} ${operator} ${this.escapeValue(operand)}`;
			default:
				throw new Error(`Unsupported operator: ${operator}`);
        }
    }
}

module.exports = QueryUtil;