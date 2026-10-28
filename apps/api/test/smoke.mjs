// Smoke manual contra a API rodando (pnpm --filter @elo/api start). Requer SUPERADMIN_KEY igual ao valor abaixo.
// Uso: SUPERADMIN_KEY=... node apps/api/test/smoke.mjs
const B = 'http://localhost:3001';
const jar = {};
async function call(method, path, { token, body, cookie } = {}) {
  const res = await fetch(B + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, setCookie: res.headers.get('set-cookie') };
}
const step = (name, r, expect) => {
  const ok = r.status === expect;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} -> ${r.status}${ok ? '' : ' ' + JSON.stringify(r.json)}`);
  if (!ok) process.exitCode = 1;
  return r.json;
};
const suf = Date.now().toString(36);

const sa = step('superadmin login', await call('POST', '/auth/superadmin', { body: { key: process.env.SUPERADMIN_KEY } }), 201);
step('bad superadmin key', await call('POST', '/auth/superadmin', { body: { key: 'x'.repeat(30) } }), 401);
const T = sa.accessToken;
const due = new Date(Date.now() + 10 * 86400000).toISOString();
const rest = step('create restaurant', await call('POST', '/admin/restaurants', { token: T, body: { name: 'Pizzaria ' + suf, managerName: 'Maria', managerContact: '11999999999', dueDate: due, adminUsername: 'adm' + suf, adminPassword: 'senha12345' } }), 201);
const adm = step('restaurant admin login', await call('POST', `/auth/restaurants/${rest.slug}/login`, { body: { username: 'adm' + suf, password: 'senha12345' } }), 201);
const A = adm.accessToken;
for (const [u, role] of [['wai', 'waiter'], ['kit', 'kitchen']]) {
  step('create ' + role, await call('POST', '/staff', { token: A, body: { username: u + suf, password: 'senha12345', role } }), 201);
}
const W = (await call('POST', `/auth/restaurants/${rest.slug}/login`, { body: { username: 'wai' + suf, password: 'senha12345' } })).json.accessToken;
const K = (await call('POST', `/auth/restaurants/${rest.slug}/login`, { body: { username: 'kit' + suf, password: 'senha12345' } })).json.accessToken;
const cat = step('create category', await call('POST', '/catalog/categories', { token: A, body: { name: 'Pizzas' } }), 201);
const prod = step('create product', await call('POST', '/catalog/products', { token: A, body: { categoryId: cat.id, name: 'Margherita', priceCents: 4000, options: [{ name: 'Tamanho', required: true, multiple: false, choices: [{ label: 'M', priceCents: 0 }, { label: 'G', priceCents: 1000 }] }] } }), 201);
const table = step('create table', await call('POST', '/tables', { token: A, body: { name: 'Mesa 01' } }), 201);
const qr = await call('GET', `/tables/${table.id}/qr`, { token: A });
console.log(qr.status === 200 ? 'OK   qr png' : 'FAIL qr ' + qr.status);
step('waiter cannot create table', await call('POST', '/tables', { token: W, body: { name: 'x' } }), 403);
step('public fixed-link menu', await call('GET', `/public/${rest.slug}/menu`), 200);
step('invalid token', await call('POST', `/public/${rest.slug}/${'a'.repeat(32)}/session`), 404);
const s = await call('POST', `/public/${rest.slug}/${table.token}/session`);
step('start session', s, 201);
const cookie = s.setCookie.split(';')[0];
step('order before open refused', await call('POST', '/public/session/orders', { cookie, body: { items: [{ productId: prod.id, quantity: 1, options: [{ group: 'Tamanho', label: 'G' }] }] } }), 400);
step('request open', await call('POST', '/public/session/open', { cookie }), 201);
step('second device blocked', await call('POST', `/public/${rest.slug}/${table.token}/session`), 409);
step('order still refused before validation', await call('POST', '/public/session/orders', { cookie, body: { items: [{ productId: prod.id, quantity: 1, options: [{ group: 'Tamanho', label: 'G' }] }] } }), 400);
step('waiter validates open', await call('POST', `/tables/${table.id}/validate-open`, { token: W }), 201);
step('order missing required option', await call('POST', '/public/session/orders', { cookie, body: { items: [{ productId: prod.id, quantity: 1 }] } }), 400);
step('extra field rejected', await call('POST', '/public/session/orders', { cookie, body: { items: [{ productId: prod.id, quantity: 1, priceCents: 1 }] } }), 400);
const order = step('submit order', await call('POST', '/public/session/orders', { cookie, body: { items: [{ productId: prod.id, quantity: 2, options: [{ group: 'Tamanho', label: 'G' }] }] } }), 201);
console.log('     unitCents', order.items?.[0]?.unitCents, '(expect 5000)');
step('kitchen skips step refused', await call('PATCH', `/orders/${order.id}/status`, { token: K, body: { status: 'ready' } }), 409);
step('kitchen received', await call('PATCH', `/orders/${order.id}/status`, { token: K, body: { status: 'received' } }), 200);
step('call waiter', await call('POST', '/public/session/call', { cookie }), 201);
const calls = step('waiter sees call', await call('GET', '/calls', { token: W }), 200);
console.log('     calls', calls.length);
step('customer cancels before prep', await call('POST', `/public/session/orders/${order.id}/cancel`, { cookie, body: {} }), 201);
step('request close', await call('POST', '/public/session/close', { cookie }), 201);
step('kitchen cannot close', await call('POST', `/tables/${table.id}/close`, { token: K }), 403);
step('waiter closes', await call('POST', `/tables/${table.id}/close`, { token: W }), 201);
step('session ended after close', await call('GET', '/public/session', { cookie }), 401);
// suspension
step('suspend', await call('POST', `/admin/restaurants/${rest.id}/suspend`, { token: T }), 201);
step('staff blocked when suspended', await call('GET', '/tables', { token: A }), 403);
step('subscription still visible', await call('GET', '/restaurant/subscription', { token: A }), 200);
step('public menu still active', await call('GET', `/public/${rest.slug}/menu`), 200);
step('reactivate', await call('POST', `/admin/restaurants/${rest.id}/reactivate`, { token: T }), 201);
step('staff ok again', await call('GET', '/tables', { token: A }), 200);
// tenant isolation
const other = step('create restaurant B', await call('POST', '/admin/restaurants', { token: T, body: { name: 'Burger ' + suf, managerName: 'Joao', managerContact: '11888888888', dueDate: due, adminUsername: 'admb' + suf, adminPassword: 'senha12345' } }), 201);
const B2 = (await call('POST', `/auth/restaurants/${other.slug}/login`, { body: { username: 'admb' + suf, password: 'senha12345' } })).json.accessToken;
const bt = (await call('GET', '/tables', { token: B2 })).json;
console.log(bt.length === 0 ? 'OK   B sees none of A tables' : 'FAIL isolation');
step('B cannot read A table qr', await call('GET', `/tables/${table.id}/qr`, { token: B2 }), 404);
