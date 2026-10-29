import { createECDH } from 'crypto';

// Prints a new Web Push key pair to paste into .env.
const ecdh = createECDH('prime256v1');
ecdh.generateKeys();
console.log(`VAPID_PUBLIC_KEY=${ecdh.getPublicKey('base64url')}`);
console.log(`VAPID_PRIVATE_KEY=${ecdh.getPrivateKey('base64url')}`);
