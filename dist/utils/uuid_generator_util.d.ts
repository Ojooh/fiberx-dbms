declare class UUIDGeneratorUtil {
    constructor();
    generateUUIDV1(): string;
    generateUUIDV2(prefix?: string): string;
    generateUUIDV3(): string;
}
export default UUIDGeneratorUtil;
