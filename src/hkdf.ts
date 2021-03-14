import { BinaryLike } from 'crypto';

export default function hkdf(
  digest: string,
  key: string | Buffer,
  salt: string | Buffer,
  info: BinaryLike,
  keylen: number
): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { hkdfSync } = require('crypto');
  if (hkdfSync) {
    const buf = hkdfSync(digest, key, salt, info, keylen);
    return Buffer.from(buf);
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('futoin-hkdf')(key, keylen, { salt, info, hash: digest });
}
