"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql_query_builder_1 = __importDefault(require("../query_builders/mysql_query_builder"));
const postgres_query_builder_1 = __importDefault(require("../query_builders/postgres_query_builder"));
const mongo_query_builder_1 = __importDefault(require("../query_builders/mongo_query_builder"));
const queryBuilderMap = {
    mysql_db: new mysql_query_builder_1.default(),
    postgresql_db: new postgres_query_builder_1.default(),
    mongo_db: new mongo_query_builder_1.default()
};
const getQueryBuilder = (datasourceId) => {
    const builder = queryBuilderMap[datasourceId];
    if (!builder)
        throw new Error(`No query builder for ${datasourceId}`);
    return builder;
};
exports.default = getQueryBuilder;
