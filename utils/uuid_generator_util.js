const { randomUUID } = require('crypto');

class UUIDGeneratorUtil {
    constructor() {}

    // Generates a standard UUID (Version 4) following RFC 4122.
    generateUUIDV1() {
        return randomUUID();
    }

    // Generates a unique code based on the current timestamp and random characters.
    generateUUIDV2(prefix = '') {
        const timestamp         = Date.now().toString();
        const time_stamp_part   = parseInt(timestamp, 10).toString(36); // base-36 encoding
        const random_part       = Math.random().toString(36).substring(2, 6); // 4 random characters
        const uniqueCode        = `${prefix.toUpperCase()}-${time_stamp_part}${random_part}`.toUpperCase();
        return uniqueCode;
    }

    // Generates a shorter unique code without hyphens: purely timestamp + random.
    generateUUIDV3() {
        const timestamp         = Date.now().toString();
        const time_stamp_part   = parseInt(timestamp, 10).toString(36);
        const random_part       = Math.random().toString(36).substring(2, 6);
        return `${time_stamp_part}${random_part}`.toUpperCase();
    }
}

module.exports = UUIDGeneratorUtil;
