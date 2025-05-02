import { randomUUID } from 'crypto';

class UUIDGeneratorUtil {
    constructor() { }
    // Method to Generats a standard UUID (Version 4) following RFC 4122.
    generateUUIDV1(): string { return randomUUID();}

    // Method to Generate a unique code based on the current timestamp and random characters.
    generateUUIDV2(prefix: string = ''): string {
        const timestamp         = Date.now().toString();
        const time_stamp_part   = parseInt(timestamp, 10).toString(36); // Convert timestamp to base-36 (0-9, a-z)
        const random_part       = Math.random().toString(36).substring(2, 6); // 4 random characters
        const uniqueCode        = `${prefix.toUpperCase()}-${time_stamp_part}${random_part}`.toUpperCase();

        return uniqueCode;
    }

    // Method to Generate a shorter unique code without hyphens, purely timestamp + random.
    generateUUIDV3(): string {
        const timestamp         = Date.now().toString();
        const time_stamp_part   = parseInt(timestamp, 10).toString(36);
        const randomPart        = Math.random().toString(36).substring(2, 6);
        return `${time_stamp_part}${randomPart}`.toUpperCase();
    }
}

export default UUIDGeneratorUtil
