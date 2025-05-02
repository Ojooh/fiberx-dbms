"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_datasource_connector_1 = __importDefault(require("@/datasource_connectors/mysql_datasource_connector"));
const postgres_datasource_connector_1 = __importDefault(require("@/datasource_connectors/postgres_datasource_connector"));
const mongo_datasource_connector_1 = __importDefault(require("@/datasource_connectors/mongo_datasource_connector"));
class DatasourceRegistry {
    constructor() {
        this.registry = new Map();
    }
    static get instance() {
        if (!this._instance)
            this._instance = new DatasourceRegistry();
        return this._instance;
    }
    // method to register a data source connector
    register(name, connector) {
        this.registry.set(name, connector);
    }
    // method to get a connector for a data source
    get(name) {
        const connector = this.registry.get(name);
        if (!connector)
            throw new Error(`Connector not registered: ${name}`);
        return connector;
    }
    // method to list registered data source connectors
    list() {
        const obj = {};
        for (const [key, value] of this.registry.entries()) {
            obj[key] = value;
        }
        return obj;
    }
    // method to initialize a connector given name and connetion options
    async initializeConnector(name, options) {
        let connector;
        switch (name) {
            case 'mysql_db':
                connector = new mysql_datasource_connector_1.default(options);
                break;
            case 'postgressql_db':
                connector = new postgres_datasource_connector_1.default(options);
                break;
            case 'mongo_db':
                connector = new mongo_datasource_connector_1.default(options);
                break;
            default:
                throw new Error(`Unsupported datasource type: ${name}`);
        }
        await connector.connect();
        this.register(name, connector);
    }
}
exports.default = DatasourceRegistry;
