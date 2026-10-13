// In-memory cookie jar + request-header store standing in for next/headers.
// Tests drive cookies through signIn()/signOut() in tests/helpers.mjs and
// headers through setRequestHeaders().
const jar = new Map();
let requestHeaders = new Headers();

export function __jar() {
  return jar;
}

export function setRequestHeaders(init = {}) {
  requestHeaders = new Headers(init);
}

export async function cookies() {
  return {
    get: (name) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    has: (name) => jar.has(name),
    set: (name, value) => void jar.set(name, value),
    delete: (name) => void jar.delete(name),
  };
}

export async function headers() {
  return requestHeaders;
}
