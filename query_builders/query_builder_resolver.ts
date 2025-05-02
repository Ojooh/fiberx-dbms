import BaseQueryBuilder from "../query_builders/base_query_builder";
import MysqlQueryBuilder from "../query_builders/mysql_query_builder";
import PostgresQueryBuilder from "../query_builders/postgres_query_builder";
import MongoQueryBuilder from "../query_builders/mongo_query_builder";

const queryBuilderMap: Record<string, BaseQueryBuilder> = {
    mysql_db: new MysqlQueryBuilder(),
    postgresql_db: new PostgresQueryBuilder(),
    mongo_db: new MongoQueryBuilder()
};

const getQueryBuilder = (datasourceId: string): BaseQueryBuilder => {
    const builder = queryBuilderMap[datasourceId];
    if (!builder) throw new Error(`No query builder for ${datasourceId}`);
    return builder;
};

export default getQueryBuilder
