import { TableSchemaInterface, QueryFormatOptionInterface, TableColumnInterface, ColumnPositionType } from "../types/common_types";
import BaseQueryBuilder from "./base_query_builder";
declare class PostgresQueryBuilder extends BaseQueryBuilder {
    escapeField(field: string): string;
    escapeValue(value: any): string;
    private formatCondition;
    private parse_condition;
    formatWhereClause(where?: any): string;
    formatOptions(options?: QueryFormatOptionInterface): string;
    beginTransaction(): string;
    commitTransaction(): string;
    rollbackTransaction(): string;
    select(table_name: string, fields: string[], where?: object, options?: object): string;
    selectCount(table_name: string, where?: object, options?: object): string;
    insert(table_name: string, data: object, options?: object): string;
    update(table_name: string, where: object, data: object, options?: object): string;
    delete(table_name: string, where: object, options?: object): string;
    createTable(table_schema: TableSchemaInterface): string;
    createIndex(table_name: string, index_fields: string[], unique: boolean): string;
    bulkInsert(table_schema: TableSchemaInterface, values: any[][]): string;
    addColumn(table_name: string, column_name: string, column_def: TableColumnInterface, position: ColumnPositionType): string;
    dropColumn(table_name: string, column_name: string): string;
    dropIndex(table_name: string, index_name: string): string;
    dropTable(table_name: string): string;
}
export default PostgresQueryBuilder;
