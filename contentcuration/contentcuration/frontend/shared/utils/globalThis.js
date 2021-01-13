let globalThis;

if (typeof self !== 'undefined') {
  globalThis = self;
}
if (typeof window !== 'undefined') {
  globalThis = window;
}
if (typeof global !== 'undefined') {
  globalThis = global;
}

export default globalThis;
