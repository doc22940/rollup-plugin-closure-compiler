export function f(a) {
  _foo: for (const k of a) {
    if (k != null) {
      console.log(k);
      continue _foo;
    } else {
      break _foo;
    }
  }
}