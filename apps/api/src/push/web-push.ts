import { createCipheriv, createECDH, createHmac, createPrivateKey, randomBytes, sign } from 'crypto';

/**
 * Web Push without a library: payload encryption (RFC 8291, aes128gcm) and
 * VAPID authentication (RFC 8292), on top of Node's crypto.
 */

export interface PushTarget {
  endpoint: string;
  /** Browser's P-256 public key, base64url (65 bytes, uncompressed). */
  p256dh: string;
  /** Browser's auth secret, base64url (16 bytes). */
  auth: string;
}

export interface VapidKeys {
  /** base64url, 65-byte uncompressed P-256 point. */
  publicKey: string;
  /** base64url, 32-byte private scalar. */
  privateKey: string;
  /** Contact for the push service: a mailto: or https: URL. */
  subject: string;
}

const b64url = (buf: Buffer) => buf.toString('base64url');
const fromB64url = (s: string) => Buffer.from(s, 'base64url');
const hmac = (key: Buffer, data: Buffer) => createHmac('sha256', key).update(data).digest();

/** Record size advertised in the header; the whole payload fits in one record. */
const RECORD_SIZE = 4096;

/** Encrypts `payload` for one subscription. `salt` and `serverKeys` are injectable for tests. */
export function encrypt(
  payload: Buffer,
  target: Pick<PushTarget, 'p256dh' | 'auth'>,
  opts: { salt?: Buffer; serverPrivateKey?: Buffer } = {},
): Buffer {
  const uaPublic = fromB64url(target.p256dh);
  const authSecret = fromB64url(target.auth);
  const ecdh = createECDH('prime256v1');
  if (opts.serverPrivateKey) ecdh.setPrivateKey(opts.serverPrivateKey);
  else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const sharedSecret = ecdh.computeSecret(uaPublic);

  const prkKey = hmac(authSecret, sharedSecret);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]);
  const ikm = hmac(prkKey, keyInfo);

  const salt = opts.salt ?? randomBytes(16);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);

  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  // 0x02 marks the last (and only) record, with no padding.
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(RECORD_SIZE, 16);
  header.writeUInt8(asPublic.length, 20);
  return Buffer.concat([header, asPublic, body]);
}

/** `Authorization` header value proving the sender to the push service (ES256 JWT, 12 h). */
export function vapidAuthorization(endpoint: string, keys: VapidKeys, now = Date.now()): string {
  const pub = fromB64url(keys.publicKey);
  const key = createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d: keys.privateKey, x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)) },
    format: 'jwk',
  });
  const header = b64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(
    Buffer.from(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: keys.subject })),
  );
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${header}.${claims}.${b64url(signature)}, k=${keys.publicKey}`;
}

/** New VAPID key pair, base64url encoded. */
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return { publicKey: b64url(ecdh.getPublicKey()), privateKey: b64url(ecdh.getPrivateKey()) };
}

/**
 * Sends one notification. Resolves with the push service status: 201 means
 * delivered to the service; 404/410 mean the subscription is gone.
 */
export async function sendPush(target: PushTarget, payload: unknown, keys: VapidKeys, ttlSeconds = 120): Promise<number> {
  const res = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapidAuthorization(target.endpoint, keys),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttlSeconds),
      Urgency: 'high',
    },
    body: new Uint8Array(encrypt(Buffer.from(JSON.stringify(payload)), target)),
    signal: AbortSignal.timeout(10_000),
  });
  return res.status;
}
