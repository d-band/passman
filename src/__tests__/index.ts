import { genPass, genSeed, CharList } from '../index';

test('genPass', async () => {
  const pass1 = await genPass('hello', 'world');
  const pass2 = await genPass('hello', 'world', undefined, {
    length: 10,
    uppers: 3,
    lowers: 3,
    digits: 1,
    symbols: 1
  });
  expect(pass1).toBe(pass2);
  expect(pass2).toBe('=Z0NIWbabQ');
});

test('genSeed', async () => {
  const seed = await genSeed('hello');
  const pass1 = await genPass('hello', 'world', seed);
  const pass2 = await genPass('hello', 'world', seed.toString('base64'));
  expect(pass1).toBe(pass2);
});

test('CharList', () => {
  const chars = new CharList({
    length: 5,
    uppers: 0,
    lowers: 2,
    digits: 3,
    symbols: 0
  });
  const arr = [8, 15, 255, 248, 241];
  for (const i of arr) {
    chars.add(i);
  }
  expect(chars.toString()).toBe('bc987');
  expect(() => {
    new CharList({
      uppers: 0,
      lowers: 0,
      digits: 0,
      symbols: 0
    });
  }).toThrowError('Invalid password options');
  expect(() => {
    new CharList({
      uppers: 3,
      lowers: 3,
      digits: 3,
      symbols: 2
    });
  }).toThrowError('Invalid password options');
});
