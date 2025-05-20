

class BaseDatasourceConnector {

    constructor(options) {
        this.options = options;
    }

    // Method to connect to a data source
    connect = () => { return "connect to data source"};

    // Method to disconnet from a data source
    disconnect = ()=> { return "disconnect data source" };

    // method to execute a query with data source
    executeQuery = (query, params) => { return "execute a query" };

    // method to commit a transaction
    beginTransaction = () => { return "begin transaction" };

    // method to commit a transaction
    commitTransaction = (transaction) => { return "commit a transaction" };

    // Method to roll back a transaction
    rollbackTransaction = (transaction)=> { return "rollback a transaction" };
}

module.exports = BaseDatasourceConnector;
