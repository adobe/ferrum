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

/* global it, describe */
const assert = require('assert');
const {
  valueSupports, supports, each, type, HybridWeakMap, size, Trait,
} = require('../src/index');
const { ckEq, ckThrows } = require('./util');

it('HybridWeakMap', () => {
  const o1 = {};
  const o2 = {};
  const m = new HybridWeakMap([[null, 22], [1, 42], [o1, 13], [Function, 44]]);
  m.set(o2, 14);
  m.set(Object, 99);
  m.set(2, 32);
  m.set(null, 24);
  m.set(Function, 49);

  ckEq(m.get(null), 24);
  ckEq(m.get(1), 42);
  ckEq(m.get(o1), 13);
  ckEq(m.get(Function), 49);
  ckEq(m.get(o2), 14);
  ckEq(m.get(Object), 99);
  ckEq(m.get(2), 32);
  ckEq(m.get(44), undefined);
  ckEq(m.get({}), undefined);
  ckEq(m.get(undefined), undefined);

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
  ckEq(size(m.primitives), 2);
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
      assert(valueSupports(what));
      ckEq(Foo.invoke(what), expect);
      ckEq(callcount, 1);
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
    ckEq(err.trait, Foo);
  });

  it('supports different symbols', () => {
    const s = Symbol('Boom');
    const Boom = new Trait('Boom', s);
    ckEq(s, Boom.sym);
  });
});
