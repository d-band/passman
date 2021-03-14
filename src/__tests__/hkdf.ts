jest.mock('crypto', () => {
  const crypto = jest.requireActual('crypto');
  return { __esModule: true, ...crypto, hkdfSync: undefined };
});

test('hkdf', async () => {
  const hkdf = await import('../hkdf');
  const key = hkdf.default('sha256', 'hello', 'world', 'info', 32);
  expect(key.toString('base64')).toBe(
    'Z7RVM8EVhDHrUXb8Vv0Pt6OUDh16W2K8YoYG4Ev7ao4='
  );
});
