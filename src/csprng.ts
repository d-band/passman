import * as crypto from 'crypto';
import { Readable } from 'stream';
import hkdf from './hkdf';

function passKey(
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 4096, 32, 'sha256', (err, key) => {
      err ? reject(err) : resolve(key);
    });
  });
}

export async function gcmEncrypt(
  password: crypto.BinaryLike,
  data: crypto.BinaryLike
): Promise<Buffer> {
  const salt = crypto.randomBytes(12);
  const key = await passKey(password, salt);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, salt);
  // Length: 12 + data.length + 16
  return Buffer.concat([
    salt,
    cipher.update(data),
    cipher.final(),
    cipher.getAuthTag()
  ]);
}

export async function gcmDecrypt(
  password: crypto.BinaryLike,
  data: string | Buffer
): Promise<Buffer> {
  if (typeof data === 'string') {
    data = Buffer.from(data, 'base64');
  }
  const salt = data.slice(0, 12);
  const tag = data.slice(-16);
  const key = await passKey(password, salt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, salt);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    salt,
    decipher.update(data.slice(12, -16)),
    decipher.final(),
    tag
  ]);
}

export function genSeed(password: crypto.BinaryLike): Promise<Buffer> {
  const seed = crypto.randomBytes(256 - 12 - 16);
  return gcmEncrypt(password, seed);
}

class ZeroStream extends Readable {
  _read() {
    if (this.destroyed) return;
    this.push(Buffer.alloc(1));
  }
}

export async function createRNG(
  password: crypto.BinaryLike,
  realm: crypto.BinaryLike,
  seed?: string | Buffer
): Promise<crypto.Cipher> {
  let key: Buffer;
  if (seed) {
    const uSeed = await gcmDecrypt(password, seed);
    const salt = Buffer.concat([uSeed.slice(0, 12), uSeed.slice(-16)]);
    key = hkdf('sha256', uSeed, salt, realm, 32);
  } else {
    key = await passKey(password, realm);
  }
  const iv = Buffer.alloc(16);
  const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
  const zeroStream = new ZeroStream();
  zeroStream.pipe(cipher);
  return cipher;
}
