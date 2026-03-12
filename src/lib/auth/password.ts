import crypto from "node:crypto";

export async function hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString("hex");

    const derivedKey = await new Promise<string>((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, key) => {
            if (err) reject(err);
            else resolve(key.toString("hex"));
        });
    });

    return `${salt}:${derivedKey}`;
}

export async function verifyPassword(password: string, storedHash: string) {
    const [salt, originalKey] = storedHash.split(":");

    if (!salt || !originalKey) return false;

    const derivedKey = await new Promise<string>((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, key) => {
            if (err) reject(err);
            else resolve(key.toString("hex"));
        });
    });

    const originalBuffer = Buffer.from(originalKey, "hex");
    const derivedBuffer = Buffer.from(derivedKey, "hex");

    if (originalBuffer.length !== derivedBuffer.length) return false;

    return crypto.timingSafeEqual(originalBuffer, derivedBuffer);
}