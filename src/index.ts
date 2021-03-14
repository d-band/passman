import * as crypto from 'crypto';
import { createRNG } from './csprng';

export interface PassOptions {
  length?: number;
  uppers?: number;
  lowers?: number;
  digits?: number;
  symbols?: number;
  allowedSymbols?: string;
}

export class CharList {
  private chars = '';
  private minLens: number[] = [];
  private map: { [char: string]: number } = {};
  private len: number;
  private data: string[] = [];
  constructor(options?: PassOptions) {
    options = {
      uppers: 3,
      lowers: 3,
      digits: 1,
      symbols: 1,
      ...options
    };
    this.len = options.length || 10;
    if (options.lowers) {
      this.update('abcdefghijklmnopqrstuvwxyz', options.lowers);
    }
    if (options.uppers) {
      this.update('ABCDEFGHIJKLMNOPQRSTUVWXYZ', options.uppers);
    }
    if (options.digits) {
      this.update('0123456789', options.digits);
    }
    if (options.symbols) {
      const symbols = options.allowedSymbols || '!#%)*+,-.:=>?@]^_}~';
      this.update(symbols, options.symbols);
    }
    const min = this.minLens.reduce((a, b) => a + b, 0);
    if (this.len < min || this.chars.length === 0) {
      throw new Error('Invalid password options');
    }
  }
  private update(chars: string, minLen: number) {
    if (minLen < 0) {
      throw new Error('Invalid options');
    }
    this.chars += chars;
    for (let i = 0; i < chars.length; i++) {
      this.map[chars[i]] = this.minLens.length;
    }
    this.minLens.push(minLen);
  }
  check(): boolean {
    if (this.data.length < this.len) return false;
    const counts = Array(this.minLens.length).fill(0);
    this.data.forEach((ch) => {
      counts[this.map[ch]]++;
    });
    for (let i = 0; i < this.minLens.length; i++) {
      if (counts[i] < this.minLens[i]) return false;
    }
    return true;
  }
  add(v: number): boolean {
    if (this.data.length >= this.len) {
      this.data = [];
    }
    const max = this.chars.length;
    const pos = Math.floor((v * max) / 256);
    this.data.push(this.chars[pos]);
    return this.check();
  }
  toString(): string {
    return this.data.join('');
  }
}

export async function genPass(
  password: crypto.BinaryLike,
  realm: crypto.BinaryLike,
  seed?: string | Buffer,
  options?: PassOptions
): Promise<string> {
  const chars = new CharList(options);
  const rng = await createRNG(password, realm, seed);
  return new Promise((resolve, reject) => {
    rng.on('data', (buf) => {
      if (chars.add(buf[0])) {
        rng.destroy();
        resolve(chars.toString());
      }
    });
    rng.on('error', (err) => reject(err));
  });
}

export * from './csprng';
