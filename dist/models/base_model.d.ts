import { TableSchemaInterface, ModelConstructorType } from "../types/common_types";
declare abstract class BaseModel {
    protected schema: TableSchemaInterface;
    protected datasource_id: string;
    private event_system;
    constructor(data: ModelConstructorType);
    protected getConnector(): import("../datasource_connectors/base_datasource_connector").default;
    protected getQueryBuilder(): import("../query_builders/base_query_builder").default;
    protected addComputedAttributes(): void;
    on(event: string, listener: Function): void;
    private triggerHook;
    private validatePermission;
    static findByPk<T extends BaseModel>(this: new (data: any) => T, id: string | number, fields: string[], options?: any): Promise<T | null>;
    static count<T extends BaseModel>(this: new (data: any) => T, where: object, options?: any): Promise<number>;
    static findOne<T extends BaseModel>(this: new (data: any) => T, fields: string[], where: object, options?: any): Promise<T | null>;
    static findAll<T extends BaseModel>(this: new (data: any) => T, fields: string[], where: object, options?: any): Promise<T[]>;
    static findAndCountAll<T extends BaseModel>(this: new (data: any) => T, fields: string[], where: object, options?: any): Promise<{
        count: number;
        rows: T[];
    }>;
    static create<T extends BaseModel>(this: new (data: any) => T, data: object, options?: any): Promise<T>;
    update(data: object, where?: object, options?: any): Promise<this>;
    destroy(where?: object, options?: any): Promise<this>;
    static update<T extends BaseModel>(this: new (data: any) => T, where: object, data: object, options?: any): Promise<T>;
    static delete<T extends BaseModel>(this: new (data: any) => T, where: object, options?: any): Promise<any>;
}
export default BaseModel;
