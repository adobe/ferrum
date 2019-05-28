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
  compose, typedArrays, isdef, type, typename, isPrimitive, HybridWeakMap,
  TraitNotImplemented, Trait, supports, valueSupports, typeIsImmutable,
  isImmutable, assertEquals, assertUneq, size, empty, Size, shallowclone,
  deepclone, pairs, keys, values, get, has, assign, del, setdefault, replace,
  each, dict, uniq, range0, map, all, first, takeDef, zip, count, extend,
} = require('../src/index');
const { ckEqSeq, ckThrows } = require('./util');

it('isdef()', () => {
  each([null, undefined], v => assert(!isdef(v)));
  each([false, [], {}, 0], v => assert(isdef(v)));
});

it('type()', () => {
  assert.strictEqual(type(null), null);
  assert.strictEqual(type(undefined), undefined);
  assert.strictEqual(type(2), Number);
  assert.strictEqual(type({}), Object);
});

it('typename()', () => {
  const examples = {
    null: null,
    undefined,
    Number:
   22,
    Object: {},
    Map: new Map(),
  };

  each(examples, ([k, v]) => assert.strictEqual(typename(type(v)), k));
});

it('isPrimitive()', () => {
  assert(isPrimitive(null));
  assert(isPrimitive(undefined));
  assert(isPrimitive(0));
  assert(isPrimitive(true));
  assert(isPrimitive('hello'));
  assert(isPrimitive(Symbol('')));
  assert(!isPrimitive({}));
  // eslint-disable-next-line no-new-wrappers
  assert(!isPrimitive(new Number(0)));
});

it('HybridWeakMap', () => {
  const o1 = {};
  const o2 = {};
  const m = new HybridWeakMap([[null, 22], [1, 42], [o1, 13], [Function, 44]]);
  m.set(o2, 14);
  m.set(Object, 99);
  m.set(2, 32);
  m.set(null, 24);
  m.set(Function, 49);

  assert.strictEqual(m.get(null), 24);
  assert.strictEqual(m.get(1), 42);
  assert.strictEqual(m.get(o1), 13);
  assert.strictEqual(m.get(Function), 49);
  assert.strictEqual(m.get(o2), 14);
  assert.strictEqual(m.get(Object), 99);
  assert.strictEqual(m.get(2), 32);
  assert.strictEqual(m.get(44), undefined);
  assert.strictEqual(m.get({}), undefined);
  assert.strictEqual(m.get(undefined), undefined);

  assert(m.has(o1));
  assert(m.has(o2));
  assert(m.has(Object));
  assert(m.has(2));
  assert(m.has(null));
  assert(!m.has(undefined));
  assert(!m.has(44));
  assert(!m.has({}));

  m.delete(Object);
  m.delete(2);
  assert(!m.has(Object));
  assert(!m.has(2));
  assert(m.has(o1));
  assert(m.has(o2));

  // The rest must be stored in the weak map
  assert.strictEqual(size(m.primitives), 2);
});

describe('Trait', () => {
  const Foo = new Trait('Foo');
  let callcount = 0;

  Foo.implStatic(42, () => {
    callcount += 1;
    return 'static_42';
  });

  Foo.implStatic(undefined, () => {
    callcount += 1;
    return 'static_undef';
  });

  Foo.implStatic('hello', () => {
    callcount += 1;
    return 'static_hello';
  });

  Foo.impl(Object, () => {
    callcount += 1;
    return 'dynamic_obj';
  });

  Foo.impl(String, () => {
    callcount += 1;
    return 'dynamic_str';
  });

  class Bar {
    [Foo.sym]() {
      callcount += 1;
      return 'prop_bar';
    }
  }
  class Baz extends Bar {}

  class Bang {}
  class Borg {}

  const SubFoo = new Trait('SubFoo');
  SubFoo.impl(Borg, () => 'subfoo');

  const SubBar = new Trait('SubBar');
  SubBar.impl(Borg, () => 'subbar');

  Foo.implDerived([SubFoo, SubBar], ([sf, sb], v) => {
    assert(v instanceof Borg);
    callcount += 1;
    return `${sf(v)}_${sb(v)}`;
  });

  Foo.implWildStatic((nr) => {
    const fn = () => {
      callcount += 1;
      return 'wild_neg';
    };
    return type(nr) === Number && nr < 0 ? fn : undefined;
  });

  const o1 = Function;
  Foo.implWild(what => (what === o1 ? (() => {
    callcount += 1;
    return 'wild_o1';
  }) : undefined));

  const examples = [
    [42, 'static_42'],
    [undefined, 'static_undef'],
    ['hello', 'static_hello'],
    ['hello ', 'dynamic_str'],
    ['hel', 'dynamic_str'],
    [{}, 'dynamic_obj'],
    [{ foo: 42 }, 'dynamic_obj'],
    [new Bar(), 'prop_bar'],
    [new Baz(), 'prop_bar'],
    [new Borg(), 'subfoo_subbar'],
    [-1, 'wild_neg'],
    [-100, 'wild_neg'],
    [o1, 'wild_o1'],
  ];

  each(examples, ([what, expect]) => {
    it(`yields ${expect} for ${what}`, () => {
      callcount = 0;
      assert(valueImplements(what));
      assert.strictEqual(Foo.invoke(what), expect);
      assert.strictEqual(callcount, 1);
    });
  });

  it('supports()', () => {
    assert(supports(String, Foo));
    assert(supports(Object, Foo));
    assert(supports(Bar, Foo));
    assert(supports(Baz, Foo));
    assert(!supports(Number, Foo));
  });

  each([13, new Bang(), null], (what) => {
    const err = ckThrows(Error, () => Foo.invoke(what));
    assert.strictEqual(err.trait, Foo);
  });

  it('supports different symbols', () => {
    const s = Symbol('Boom');
    const Boom = new Trait('Boom', s);
    assert.strictEqual(s, Boom.sym);
  });
});

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
    assert.strictEqual(size(arg), expect);
    assert.strictEqual(count(arg), expect);
    assert.strictEqual(empty(arg), expect === 0);
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
  ck(new Set([1, 2, 3]), 3);
  ck(new Map(), 0);
  ck(new Map([[1, 2]]), 1);
  ck('assd', 4);
  ck(new Bar(), 42);
  ck(new Bang(), 42);
  ck(new Baz(), 23);

  each(typedArrays, (Typ) => {
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
    each(primitive, v => assertEquals(v, v));
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
    ...(map(typedArrays, Typ => () => new Typ([1, 2, 3, 4]))),
  ];


  it('complex values', () => {
    each(complex, fn => assertEquals(fn(), fn()));
  });

  it('complex values non equal', () => {
    each(range0(size(complex)), (idxa) => {
      const a = complex[idxa];
      each(primitive, b => assertUneq(a, b));

      each(range0(size(complex)), (idxb) => {
        if (idxa !== idxb) {
          assertUneq(a, complex[idxb]);
        }
      });
    });
  });

  const containers = [
    v => [v],
    v => [42, v],
    v => ({ foo: v }),
    v => ({ foo: v, bar: 42 }),
    v => new Map([[42, v]]),
    v => new Map([[42, v], [32, 23]]),
  ];

  it('containers', () => {
    each(containers, (contfn) => {
      each(complex, (valfn) => {
        assertEquals(contfn(valfn()), contfn(valfn()));
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
    const dat = { foo: dict({ bar: [{}] }) };
    const dat2 = { foo: dict({ bar: [{}] }) };
    assertEquals(dat, dat2);
  });

  it('throws', () => {
    ckThrows(assert.AssertionError, () => assertEquals(1, 2));
    ckThrows(assert.AssertionError, () => assertUneq(1, 1));
  });
});

it('Shallowclone', () => {
  const o = { foo: {} };
  const m = new Map([['foo', {}]]);
  const s = 'ford prefect';
  const a = ['foo', 'bar', {}];
  const se = new Set([{}]);

  const ck = (v) => {
    const v2 = shallowclone(v);
    assertEquals(v, v2);
    assert(type(v) === type(v2));
    return v2;
  };

  const o2 = ck(o);
  assert(o !== o2);
  assert(o.foo === o2.foo);

  const m2 = ck(m);
  assert(m !== m2);
  assert(get(m, 'foo') === get(m2, 'foo'));

  const s2 = ck(s);
  assert.strictEqual(s, s2);

  const a2 = ck(a);
  assert(a !== a2);
  assert.strictEqual(a[2], a2[2]);

  const se2 = ck(se);
  assert(se !== se2);
  assert.strictEqual(first(se2), first(se));

  each(typedArrays, (Typ) => {
    const orig = new Typ([1, 2, 3, 4]);
    const nu = ck();
    assert(orig !== nu);
  });

  each([new Date(), ...map(typedArrays, Typ => new Typ([1, 2, 3]))], (val) => {
    const nu = ck(val);
    assert(val !== nu);
  });

  each([null, undefined, Symbol('')], (val) => {
    assert.strictEqual(val, shallowclone(val));
  });
});

it('Deepclone', () => {
  const dat = { foo: dict({ bar: [[{}]] }) };
  const dat2 = deepclone(dat);
  assertEquals(dat, dat2);

  // All values must not be the same recursively
  const g = compose(
    extend(cont => (empty(cont) ? undefined : first(values(cont)))),
    takeDef,
  );
  assert(all(map(zip([g(dat), g(dat2)]), ([a, b]) => a !== b)));

  // Does not clone Map keys
  const m = new Map([[{}, {}]]);
  const m2 = deepclone(m);
  assertEquals(m, m2);
  assert.strictEqual(first(keys(m)), first(keys(m2)));

  each(typedArrays, (Typ) => {
    const orig = new Typ([1, 2, 3, 4]);
    const nu = deepclone(orig);
    assert.strictEqual(type(orig), type(nu));
    assertEquals(orig, nu);
    assert(orig !== nu);
  });

  each([new Date(), ...map(typedArrays, Typ => new Typ([1, 2, 3]))], (val) => {
    const nu = deepclone(val);
    assert.strictEqual(type(val), type(nu));
    assertEquals(val, nu);
    assert(val !== nu);
  });

  each([null, undefined, Symbol('')], (val) => {
    assert.strictEqual(val, deepclone(val));
  });
});

it('Pairs', () => {
  const ar = ['a', 's', 'd', 'f'];
  ar[5] = 'x';
  ckEqSeq(pairs(ar), [[0, 'a'], [1, 's'], [2, 'd'], [3, 'f'], [4, undefined], [5, 'x']]);
  ckEqSeq(pairs('asdf'), [[0, 'a'], [1, 's'], [2, 'd'], [3, 'f']]);
  ckEqSeq(pairs(new Set(['foo'])), [['foo', 'foo']]);
  ckEqSeq(pairs({ hello: 'world' }), [['hello', 'world']]);
  ckEqSeq(pairs(dict({ hello: 'world' })), [['hello', 'world']]);

  each(typedArrays, (Typ) => {
    ckEqSeq(pairs(new Typ([42, 23])), [[0, 42], [1, 23]]);
  });
});

it('keys', () => {
  const ar = ['a', 's', 'd', 'f'];
  ar[5] = 'x';
  ckEqSeq(keys(ar), [0, 1, 2, 3, 4, 5]);
  ckEqSeq(keys('asdf'), [0, 1, 2, 3]);
  ckEqSeq(keys(new Set(['foo'])), ['foo']);
  ckEqSeq(keys({ hello: 'world' }), ['hello']);
  ckEqSeq(keys(dict({ hello: 'world' })), ['hello']);
  each(typedArrays, (Typ) => {
    ckEqSeq(keys(new Typ([42, 23])), [0, 1]);
  });
});

it('values', () => {
  const ar = ['a', 's', 'd', 'f'];
  ar[5] = 'x';
  ckEqSeq(values(ar), ['a', 's', 'd', 'f', undefined, 'x']);
  ckEqSeq(values('asdf'), ['a', 's', 'd', 'f']);
  ckEqSeq(values(new Set(['foo'])), ['foo']);
  ckEqSeq(values({ hello: 'world' }), ['world']);
  ckEqSeq(values(dict({ hello: 'world' })), ['world']);
  each(typedArrays, (Typ) => {
    ckEqSeq(values(new Typ([42, 23])), [42, 23]);
  });
});

it('Get', () => {
  const o = { foo: 42 };
  const m = new Map([['foo', 42]]);
  const s = 'ford prefect';
  const a = ['foo', 'bar', 42];
  const se = new Set(['foo']);

  const wm = new WeakMap([[o, 42]]);
  const hwm = new HybridWeakMap([['foo', 42]]);
  const wse = new WeakSet([o]);

  const ck = (cont, k, v) => assert.strictEqual(get(cont, k), v);
  ck(o, 'foo', 42);
  ck(m, 'foo', 42);
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

  each(typedArrays, (Typ) => {
    ck(new Typ([42, 23]), 1, 23);
  });
});

it('Has', () => {
  const o = { foo: 42 };
  const m = new Map([['foo', 42]]);
  const s = 'ford prefect';
  const a = ['foo', 'bar', 42];
  const se = new Set(['foo']);
  a[6] = 42;

  assert(has(o, 'foo'));
  assert(!has(o, 'bar'));
  assert(has(m, 'foo'));
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

  each(typedArrays, (Typ) => {
    const cont = new Typ([42, 23]);
    assert(has(cont, 1));
    assert(!has(cont, 4));
    assert(!has(cont, -1));
  });
});

it('Assign', () => {
  const o = { foo: 42 };
  const m = new Map([['foo', 42]]);
  const a = ['foo', 'bar', 42];
  const se = new Set(['foo']);

  assign(o, 'foo', 23);
  assign(o, 'bar', 99);
  assertEquals(o, { foo: 23, bar: 99 });

  assign(m, 'foo', 23);
  assign(m, 'bar', 99);
  assertEquals(m, dict({ foo: 23, bar: 99 }));

  assign(a, 4, 'helo');
  assertEquals(a, ['foo', 'bar', 42, undefined, 'helo']);

  assign(se, 4, 4);
  assertEquals(se, uniq(['foo', 4]));

  ckThrows(Error, () => assign(se, 4, 5));
  assertEquals(se, uniq(['foo', 4]));

  each(typedArrays, (Typ) => {
    const cont = new Typ([42, 23]);
    assign(cont, 0, 22);
    assertEquals(cont, new Typ([22, 23]));
  });
});

it('Del', () => {
  const o = { foo: 42 };
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
  del(o, 'bar');
  assert.strictEqual(size(o), 0);

  ck(m, 'foo');
  del(m, 'bar');
  assert.strictEqual(size(m), 0);

  ckThrows(TraitNotImplemented, () => ck(s, 5));
  ckThrows(TraitNotImplemented, () => ck(a, 5));

  ck(se, 'foo');
  assertEquals(se, uniq(['bar']));
});

it('Setdefault', () => {
  const o = { foo: 42 };
  const m = new Map([['foo', 42]]);
  const a = ['foo', 'bar', 42];

  assert.strictEqual(setdefault(o, 'foo', 23), 42);
  assert.strictEqual(setdefault(o, 'bar', 99), 99);
  assertEquals(o, { foo: 42, bar: 99 });

  assert.strictEqual(setdefault(m, 'foo', 23), 42);
  assert.strictEqual(setdefault(m, 'bar', 99), 99);
  assertEquals(m, dict({ foo: 42, bar: 99 }));

  assert.strictEqual(setdefault(a, 2, 23), 42);
  assert.strictEqual(setdefault(a, 4, 99), 99);
  assertEquals(a, ['foo', 'bar', 42, undefined, 99]);
});

it('Replace', () => {
  const o = { foo: 42 };
  const m = new Map([['foo', 42]]);
  const a = ['foo', 'bar', 42];

  assert.strictEqual(replace(o, 'foo', 23), 42);
  assert.strictEqual(replace(o, 'bar', 99), undefined);
  assertEquals(o, { foo: 23, bar: 99 });

  assert.strictEqual(replace(m, 'foo', 23), 42);
  assert.strictEqual(replace(m, 'bar', 99), undefined);
  assertEquals(m, dict({ foo: 23, bar: 99 }));

  assert.strictEqual(replace(a, 2, 23), 42);
  assert.strictEqual(replace(a, 4, 99), undefined);
  assertEquals(a, ['foo', 'bar', 23, undefined, 99]);
});
