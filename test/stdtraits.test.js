/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-disable class-methods-use-this */
/* global describe, it */
const assert = require('assert');
const {
  compose, _typedArrays, type, HybridWeakMap, TraitNotImplemented,
  typeIsImmutable, isImmutable, assertUneq, size, empty, Size,
  shallowclone, deepclone, pairs, keys, values, get, has, assign, del,
  setdefault, replace, each, dict, uniq, range0, map, all, first, takeDef, zip,
  count, extend,
} = require('../src/index');
const { ckEq, ckEqSeq, ckThrows } = require('./util');

it('Immutable', () => {
  each([String, Number, Symbol, undefined, RegExp, Function], (Typ) => {
    assert(typeIsImmutable(Typ));
  });
  each([Object, Map], (Typ) => {
    assert(!typeIsImmutable(Typ));
  });
  each(['asd', null, undefined, 2, Symbol('')], (Typ) => {
    assert(isImmutable(Typ));
  });
  each([{}, new Set()], (Typ) => {
    assert(!isImmutable(Typ));
  });
});

it('size(), empty(), count()', () => {
  const ck = (arg, expect) => {
    ckEq(size(arg), expect);
    ckEq(count(arg), expect);
    ckEq(empty(arg), expect === 0);
  };
  class Foo {}
  class Bar {
    [Size.sym]() { return 42; }
  }
  class Bang extends Bar {}
  class Baz {}
  Size.impl(Baz, () => 23);

  ck([1, 2, 3], 3);
  ck([], 0);
  ck({}, 0);
  ck({ foo: 42 }, 1);
  ck({ [Symbol('foo')]: 42 }, 1);
  ck({ foo: 42, [Symbol('foo')]: 23 }, 2);
  ck(new Set([1, 2, 3]), 3);
  ck(new Map(), 0);
  ck(new Map([[1, 2]]), 1);
  ck('assd', 4);
  ck(new Bar(), 42);
  ck(new Bang(), 42);
  ck(new Baz(), 23);

  each(_typedArrays, (Typ) => {
    ck(new Typ([]), 0);
    ck(new Typ([1, 2]), 2);
  });

  each([new Foo(), 0, null], (val) => {
    ckThrows(TraitNotImplemented, () => count(val));
    each([size, empty], (fn) => {
      ckThrows(TraitNotImplemented, () => fn(val));
    });
  });
});

describe('Equals', () => {
  const primitive = [
    1, 2, 42, -3, 'hello', 'world', null, undefined,
    true, false, Symbol('foo'), Symbol('bar'), () => {}, () => 42,
    new Error(),
  ];

  it('primitive values', () => {
    each(primitive, (v) => ckEq(v, v));
  });

  it('primitive values non equal', () => {
    each(range0(size(primitive)), (idxa) => {
      each(range0(size(primitive)), (idxb) => {
        if (idxa !== idxb) {
          assertUneq(primitive[idxa], primitive[idxb]);
        }
      });
    });
  });

  const complex = [
    () => /asd/ig,
    () => /asd/,
    () => /x/ig,
    () => new RegExp('foo', 'i'),
    () => new Date('2019-04-24T19:45:16.687Z'),
    () => new Date('2019-04-24T19:46:15.566Z'),
    () => {},
    () => [],
    () => new Map(),
    () => new Set(),
    () => new Set(['foo', 42]),
    ...(map(_typedArrays, (Typ) => () => new Typ([1, 2, 3, 4]))),
  ];

  it('complex values', () => {
    each(complex, (fn) => ckEq(fn(), fn()));
  });

  it('complex values non equal', () => {
    each(range0(size(complex)), (idxa) => {
      const a = complex[idxa];
      each(primitive, (b) => assertUneq(a, b));

      each(range0(size(complex)), (idxb) => {
        if (idxa !== idxb) {
          assertUneq(a, complex[idxb]);
        }
      });
    });
  });

  const containers = [
    (v) => [v],
    (v) => [42, v],
    (v) => ({ foo: v }),
    (v) => ({ foo: v, bar: 42 }),
    (v) => new Map([[42, v]]),
    (v) => new Map([[42, v], [32, 23]]),
  ];

  it('containers', () => {
    each(containers, (contfn) => {
      each(complex, (valfn) => {
        ckEq(contfn(valfn()), contfn(valfn()));
      });
    });
  });

  it('containers non equal', () => {
    each(containers, (contfn) => {
      each(range0(size(complex)), (idxa) => {
        each(range0(size(complex)), (idxb) => {
          if (idxa !== idxb) {
            assertUneq(contfn(complex[idxa]()), contfn(complex[idxb]()));
          }
        });
      });
    });
  });

  it('specific examples', () => {
    const sy = Symbol('foo');
    const dat = { foo: { [sy]: dict({ fo: [{}] }) } };
    const dat2 = { foo: { [sy]: dict({ fo: [{}] }) } };
    const dat3 = { foo: { sy: dict({ fo: [{}] }) } };
    const dat4 = { foo: {} };
    ckEq(dat, dat2);
    assertUneq(dat, dat3);
    assertUneq(dat, dat4);
  });

  it('throws', () => {
    ckThrows(assert.AssertionError, () => ckEq(1, 2));
    ckThrows(assert.AssertionError, () => assertUneq(1, 1));
  });
});

it('Shallowclone', () => {
  const sy = Symbol('foo');
  const o = { foo: {}, [sy]: {} };
  const m = new Map([['foo', {}]]);
  const s = 'ford prefect';
  const a = ['foo', 'bar', {}];
  const se = new Set([{}]);

  const ck = (v) => {
    const v2 = shallowclone(v);
    ckEq(v, v2);
    assert(type(v) === type(v2));
    return v2;
  };

  const o2 = ck(o);
  assert(o !== o2);
  assert(o.foo === o2.foo);
  assert(o[sy] === o2[sy]);

  const m2 = ck(m);
  assert(m !== m2);
  assert(get(m, 'foo') === get(m2, 'foo'));

  const s2 = ck(s);
  ckEq(s, s2);

  const a2 = ck(a);
  assert(a !== a2);
  ckEq(a[2], a2[2]);

  const se2 = ck(se);
  assert(se !== se2);
  ckEq(first(se2), first(se));

  each(_typedArrays, (Typ) => {
    const orig = new Typ([1, 2, 3, 4]);
    const nu = ck();
    assert(orig !== nu);
  });

  each([new Date(), ...map(_typedArrays, (Typ) => new Typ([1, 2, 3]))], (val) => {
    const nu = ck(val);
    assert(val !== nu);
  });

  each([null, undefined, Symbol('')], (val) => {
    ckEq(val, shallowclone(val));
  });
});

it('Deepclone', () => {
  const sy = Symbol('foo');
  const dat = { foo: { [sy]: dict({ foo: [[{}]] }) } };
  const dat2 = deepclone(dat);
  ckEq(dat, dat2);

  // All values must not be the same recursively
  const g = compose(
    extend((cont) => (empty(cont) ? undefined : first(values(cont)))),
    takeDef,
  );
  assert(all(map(zip([g(dat), g(dat2)]), ([a, b]) => a !== b)));

  // Does not clone Map keys
  const m = new Map([[{}, {}]]);
  const m2 = deepclone(m);
  ckEq(m, m2);
  ckEq(first(keys(m)), first(keys(m2)));

  each(_typedArrays, (Typ) => {
    const orig = new Typ([1, 2, 3, 4]);
    const nu = deepclone(orig);
    ckEq(type(orig), type(nu));
    ckEq(orig, nu);
    assert(orig !== nu);
  });

  each([new Date(), ...map(_typedArrays, (Typ) => new Typ([1, 2, 3]))], (val) => {
    const nu = deepclone(val);
    ckEq(type(val), type(nu));
    ckEq(val, nu);
    assert(val !== nu);
  });

  each([null, undefined, Symbol('')], (val) => {
    ckEq(val, deepclone(val));
  });
});

it('Pairs', () => {
  const ar = ['a', 's', 'd', 'f'];
  ar[5] = 'x';
  const s = Symbol('foo');
  ckEqSeq(pairs(ar), [[0, 'a'], [1, 's'], [2, 'd'], [3, 'f'], [4, undefined], [5, 'x']]);
  ckEqSeq(pairs('asdf'), [[0, 'a'], [1, 's'], [2, 'd'], [3, 'f']]);
  ckEqSeq(pairs(new Set(['foo'])), [['foo', 'foo']]);
  ckEqSeq(pairs({ hello: 'world', [s]: 'bar' }), [['hello', 'world'], [s, 'bar']]);
  ckEqSeq(pairs(dict({ hello: 'world', [s]: 'bar' })), [['hello', 'world'], [s, 'bar']]);

  each(_typedArrays, (Typ) => {
    ckEqSeq(pairs(new Typ([42, 23])), [[0, 42], [1, 23]]);
  });
});

it('keys', () => {
  const ar = ['a', 's', 'd', 'f'];
  ar[5] = 'x';
  const s = Symbol('foo');
  ckEqSeq(keys(ar), [0, 1, 2, 3, 4, 5]);
  ckEqSeq(keys('asdf'), [0, 1, 2, 3]);
  ckEqSeq(keys(new Set(['foo'])), ['foo']);
  ckEqSeq(keys({ hello: 'world', [s]: 'bar' }), ['hello', s]);
  ckEqSeq(keys(dict({ hello: 'world', [s]: 'bar' })), ['hello', s]);
  each(_typedArrays, (Typ) => {
    ckEqSeq(keys(new Typ([42, 23])), [0, 1]);
  });
});

it('values', () => {
  const ar = ['a', 's', 'd', 'f'];
  ar[5] = 'x';
  const s = Symbol('foo');
  ckEqSeq(values(ar), ['a', 's', 'd', 'f', undefined, 'x']);
  ckEqSeq(values('asdf'), ['a', 's', 'd', 'f']);
  ckEqSeq(values(new Set(['foo'])), ['foo']);
  ckEqSeq(values({ hello: 'world', [s]: 'bar' }), ['world', 'bar']);
  ckEqSeq(values(dict({ hello: 'world', [s]: 'bar' })), ['world', 'bar']);
  each(_typedArrays, (Typ) => {
    ckEqSeq(values(new Typ([42, 23])), [42, 23]);
  });
});

it('Get', () => {
  const sy = Symbol('foo');
  const o = { foo: 42, [sy]: 23 };
  const m = new Map([['foo', 42], [sy, 23]]);
  const s = 'ford prefect';
  const a = ['foo', 'bar', 42];
  const se = new Set(['foo']);

  const wm = new WeakMap([[o, 42]]);
  const hwm = new HybridWeakMap([['foo', 42]]);
  const wse = new WeakSet([o]);

  const ck = (cont, k, v) => ckEq(get(cont, k), v);
  ck(o, 'foo', 42);
  ck(o, sy, 23);
  ck(m, 'foo', 42);
  ck(m, sy, 23);
  ck(wm, o, 42);
  ck(hwm, 'foo', 42);
  ck(s, 5, 'p');
  ck(a, 1, 'bar');
  ck(se, 'foo', 'foo');
  ck(wse, o, o);

  each([o, m, hwm, s, a, se], (cont) => {
    each(['bar', 42], (key) => {
      ck(cont, key, undefined);
    });
  });
  ck(wm, {}, undefined);
  ck(wse, {}, undefined);

  each(_typedArrays, (Typ) => {
    ck(new Typ([42, 23]), 1, 23);
  });
});

it('Has', () => {
  const sy = Symbol('foo');
  const o = { foo: 42, [sy]: 23 };
  const m = new Map([['foo', 42], [sy, 23]]);
  const s = 'ford prefect';
  const a = ['foo', 'bar', 42];
  const se = new Set(['foo']);
  a[6] = 42;

  assert(has(o, 'foo'));
  assert(has(o, sy));
  assert(!has(o, 'bar'));
  assert(has(m, 'foo'));
  assert(has(m, sy));
  assert(!has(m, 'bar'));
  assert(has(s, 4));
  assert(!has(s, -1));
  assert(!has(s, 20));

  assert(has(a, 2));
  assert(has(a, 5));
  assert(has(a, 6));
  assert(!has(a, 20));
  assert(!has(a, -1));

  assert(has(se, 'foo'));
  assert(!has(se, -1));

  each(_typedArrays, (Typ) => {
    const cont = new Typ([42, 23]);
    assert(has(cont, 1));
    assert(!has(cont, 4));
    assert(!has(cont, -1));
  });
});

it('Assign', () => {
  const sy = Symbol('foo');
  const o = { foo: 42 };
  const m = new Map([['foo', 42]]);
  const a = ['foo', 'bar', 42];
  const se = new Set(['foo']);

  assign(o, 'foo', 23);
  assign(o, 'bar', 99);
  assign(o, sy, 42);
  ckEq(o, { foo: 23, bar: 99, [sy]: 42 });

  assign(m, 'foo', 23);
  assign(m, 'bar', 99);
  ckEq(m, dict({ foo: 23, bar: 99 }));

  assign(a, 4, 'helo');
  ckEq(a, ['foo', 'bar', 42, undefined, 'helo']);

  assign(se, 4, 4);
  ckEq(se, uniq(['foo', 4]));

  ckThrows(Error, () => assign(se, 4, 5));
  ckEq(se, uniq(['foo', 4]));

  each(_typedArrays, (Typ) => {
    const cont = new Typ([42, 23]);
    assign(cont, 0, 22);
    ckEq(cont, new Typ([22, 23]));
  });
});

it('Del', () => {
  const sy = Symbol('foo');
  const o = { foo: 42, [sy]: 23 };
  const m = new Map([['foo', 42]]);
  const s = 'ford prefect';
  const a = ['foo', 'bar', 42];
  const se = new Set(['foo', 'bar']);
  a[6] = 42;

  const ck = (v, k) => {
    assert(has(v, k));
    del(v, k);
    assert(!has(v, k));
  };

  ck(o, 'foo');
  ck(o, sy);
  del(o, 'bar');
  ckEq(size(o), 0);

  ck(m, 'foo');
  del(m, 'bar');
  ckEq(size(m), 0);

  ckThrows(TraitNotImplemented, () => ck(s, 5));
  ckThrows(TraitNotImplemented, () => ck(a, 5));

  ck(se, 'foo');
  ckEq(se, uniq(['bar']));
});

it('Setdefault', () => {
  const sy = Symbol('foo');
  const o = { foo: 42 };
  const m = new Map([['foo', 42]]);
  const a = ['foo', 'bar', 42];

  ckEq(setdefault(o, 'foo', 23), 42);
  ckEq(setdefault(o, 'bar', 99), 99);
  ckEq(setdefault(o, sy, 100), 100);
  ckEq(setdefault(o, sy, 200), 100);
  ckEq(o, { foo: 42, bar: 99, [sy]: 100 });

  ckEq(setdefault(m, 'foo', 23), 42);
  ckEq(setdefault(m, 'bar', 99), 99);
  ckEq(m, dict({ foo: 42, bar: 99 }));

  ckEq(setdefault(a, 2, 23), 42);
  ckEq(setdefault(a, 4, 99), 99);
  ckEq(a, ['foo', 'bar', 42, undefined, 99]);
});

it('Replace', () => {
  const sy = Symbol('foo');
  const o = { foo: 42 };
  const m = new Map([['foo', 42]]);
  const a = ['foo', 'bar', 42];

  ckEq(replace(o, 'foo', 23), 42);
  ckEq(replace(o, 'bar', 99), undefined);
  ckEq(replace(o, sy, 100), undefined);
  ckEq(replace(o, sy, 200), 100);
  ckEq(o, { foo: 23, bar: 99, [sy]: 200 });

  ckEq(replace(m, 'foo', 23), 42);
  ckEq(replace(m, 'bar', 99), undefined);
  ckEq(m, dict({ foo: 23, bar: 99 }));

  ckEq(replace(a, 2, 23), 42);
  ckEq(replace(a, 4, 99), undefined);
  ckEq(a, ['foo', 'bar', 23, undefined, 99]);
});
