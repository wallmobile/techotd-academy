// In-memory cookie jar standing in for next/headers cookies(). Tests drive
// it through signIn()/signOut() in tests/helpers.mjs.
const jar = new Map();

export function __jar() {
  return jar;
}

export async function cookies() {
  return {
    get: (name) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    has: (name) => jar.has(name),
    set: (name, value) => void jar.set(name, value),
    delete: (name) => void jar.delete(name),
  };
}
