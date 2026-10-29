import { createDecipheriv, createECDH, createHmac, createPublicKey, randomBytes, verify } from 'crypto';
import { encrypt, generateVapidKeys, vapidAuthorization } from './web-push';

const hmac = (key: Buffer, data: Buffer) => createHmac('sha256', key).update(data).digest();

/** What the browser does on receipt (RFC 8291), written independently of the sender. */
function decrypt(body: Buffer, uaPrivate: Buffer, uaPublic: Buffer, auth: Buffer): Buffer {
  const salt = body.subarray(0, 16);
  const idlen = body.readUInt8(20);
  const asPublic = body.subarray(21, 21 + idlen);
  const ciphertext = body.subarray(21 + idlen);
  const ecdh = createECDH('prime256v1');
  ecdh.setPrivateKey(uaPrivate);
  const secret = ecdh.computeSecret(asPublic);
  const ikm = hmac(hmac(auth, secret), Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const decipher = createDecipheriv('aes-128-gcm', cek, nonce);
  decipher.setAuthTag(ciphertext.subarray(-16));
  const plain = Buffer.concat([decipher.update(ciphertext.subarray(0, -16)), decipher.final()]);
  expect(plain[plain.length - 1]).toBe(2);
  return plain.subarray(0, -1);
}

describe('web push', () => {
  it('encrypts a payload that the browser side can read back', () => {
    const ua = createECDH('prime256v1');
    ua.generateKeys();
    const auth = randomBytes(16);
    const body = encrypt(Buffer.from('{"title":"Mesa 7"}'), { p256dh: ua.getPublicKey('base64url'), auth: auth.toString('base64url') });
    expect(body.readUInt32BE(16)).toBe(4096);
    expect(decrypt(body, ua.getPrivateKey(), ua.getPublicKey(), auth).toString()).toBe('{"title":"Mesa 7"}');
  });

  it('signs a VAPID token for the push service origin', () => {
    const keys = { ...generateVapidKeys(), subject: 'https://elo.example' };
    const header = vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', keys, Date.UTC(2026, 0, 1));
    const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!;
    expect(k).toBe(keys.publicKey);
    const [h, c, s] = token.split('.');
    expect(JSON.parse(Buffer.from(c, 'base64url').toString())).toEqual({ aud: 'https://fcm.googleapis.com', exp: Date.UTC(2026, 0, 1) / 1000 + 43200, sub: 'https://elo.example' });
    const pub = Buffer.from(keys.publicKey, 'base64url');
    const key = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33).toString('base64url') }, format: 'jwk' });
    expect(verify('sha256', Buffer.from(`${h}.${c}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'))).toBe(true);
  });
});
