const MysqlDatasource           =  require("./mysql_datasource_connector");
const PostgresDatasource        =  require("./postgres_datasource_connector");
const MongoDatasource           =  require("./mongo_datasource_connector");


class DatasourceRegistry {
    constructor(logger = null) {
        this.registry       = new Map();
        this.logger         = logger || console;
    }

    static getInstance = (logger = null) => {
        if (!DatasourceRegistry.instance) {
            DatasourceRegistry.instance = new DatasourceRegistry(logger);
        }
        
        return DatasourceRegistry.instance;
    }

    // method to register a data source connector
    register = (name, connector) => { return this.registry.set(name, connector); }

    // method to get a connector for a data source
    getDataSource = (name) => {
        const connector = this.registry.get(name);
        if (!connector) { throw new Error(`Connector not registered: ${name}`); }
        return connector;
    }   

    // method to list registered data source connectors
    listDataSources = () => {
        const obj = {};
        for (const [key, value] of this.registry.entries()) { obj[key] = value; }
        return obj;
    }

    // method to initialize a connector given name and connetion options
    initializeConnector = async (name, options) => {
        let connector;

        switch (name) {
            case 'mysql_db':
                connector = new MysqlDatasource(options, this.logger);
                break;
            case 'postgressql_db':
                connector = new PostgresDatasource(options, this.logger);
                break;
            case 'mongo_db':
                connector = new MongoDatasource(options, this.logger);
                break;
            default:
                throw new Error(`Unsupported datasource type: ${name}`);
        }

        await connector.connect();
        this.register(name, connector);
    }
}

module.exports = DatasourceRegistry;
