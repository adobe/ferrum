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

/* global describe, it */
/* eslint-disable class-methods-use-this */

const assert = require('assert');
const {
  and, plus, or, mul,
  size, TraitNotImplemented, _typedArrays, assertEquals,
  iter, range, range0, repeat, extend, extend1, flattenTree,
  IteratorEnded, next, nth, first, second, seqEq, each, count, list, uniq,
  join, dict, obj, into, foldl, foldr, any, all, sum, product, map,
  filter, reject, reverse, enumerate, trySkip, skip, skipWhile, tryTake,
  take, takeWhile, takeUntilVal, takeDef, flat, concat, prepend, append,
  mapSort, zipLeast, zip, zipLongest, zipLeast2, zip2, zipLongest2,
  slidingWindow, trySlidingWindow, lookahead, mod, union, union2,
} = require('../src/index');
const { ckEqSeq, ckThrows } = require('./util');

it('count()', () => {
  const ck = (seq, expect) => {
    assert.strictEqual(count(seq), expect);
    assert.strictEqual(count(iter(seq)), expect);
  };
  ck({}, 0);
  ck({ foo: 42, bar: 23 }, 2);
  ck(new Map([[23, 42]]), 1);
  ck([1, 2, 3], 3);
});

const str = 'Hello World';
const arr = [42, 23];
const o = { foo: 42 };
const m = new Map([['tardigrade', 'cute']]);
const richObj = {
  [Symbol.iterator]: function* generate() {
    yield 42;
    yield 23;
  },
};
function* gen() {
  yield null;
  yield undefined;
  yield 42;
}

describe('iter()', () => {
  it('yields iterators ', () => {
    [str, arr, o, m, gen(), iter(str), '', {}, new Map(), new Int32Array()].forEach((seq) => {
      const fst = iter(seq).next();
      assert(Object.prototype.hasOwnProperty.call(fst, 'value'));
      assert(Object.prototype.hasOwnProperty.call(fst, 'done'));
      assert(fst.done.constructor === Boolean);
    });
  });

  it('iter() fails for types lacking iteration', () => {
    class Foo {}
    ckThrows(TraitNotImplemented, () => iter(new Foo()));
  });
});

it('each() can iterate the sequences', () => {
  const checkEach = (seq, expected) => {
    const actual = [];
    each(seq, v => actual.push(v));
    ckEqSeq(actual, expected);
  };
  checkEach(str, Array.from(str));
  checkEach(arr, arr);
  checkEach(o, [['foo', 42]]);
  checkEach(m, [['tardigrade', 'cute']]);
  checkEach(richObj, [42, 23]);
  checkEach(gen(), [null, undefined, 42]);
  checkEach('', []);
  checkEach([], []);
  checkEach({}, []);
  each(_typedArrays, (Typ) => {
    checkEach(new Typ([42, 23]), [42, 23]);
  });
});

it('enumerate()', () => {
  assert.deepStrictEqual(
    Array.from(enumerate('abc')),
    [[0, 'a'], [1, 'b'], [2, 'c']],
  );
});

it('range(), range0()', () => {
  const ck = (a, b, l) => assert.deepStrictEqual(list(range(a, b)), list(l));
  ck(0, 5, [0, 1, 2, 3, 4]);
  ck(0, -1, []);
  ck(0, 0, []);
  ck(7, 9, [7, 8]);
  assert.deepStrictEqual(list(range0(4)), [0, 1, 2, 3]);
});

it('repeat()', () => {
  ckEqSeq(tryTake(repeat(2), 4), [2, 2, 2, 2]);
});

it('extend(), extend1()', () => {
  ckEqSeq(tryTake(extend(mul(2))(3), 4), [3, 6, 12, 24]);
  ckEqSeq(tryTake(extend1(mul(-1))(1), 4), [-1, 1, -1, 1]);
});

it('flattenTree()', () => {
  class Node {
    constructor(vals, ...children) {
      this.values = vals;
      this.children = children;
    }
  }

  const tree = new Node([1, 2, 3, 4],
    new Node([7, 14]),
    new Node(),
    new Node(undefined,
      new Node([1, 2, 3],
        new Node([1, 4]))),
    new Node('foo'));

  const flt = (node, recurse) => {
    let vals = [];
    if (node.values === undefined) {
      vals = [];
    } else if (node.values.constructor === Array) {
      vals = node.values;
    } else if (node.values.constructor === String) {
      vals = [node.values];
    }

    return concat(vals, recurse(node.children));
  };

  ckEqSeq(flattenTree(flt)(tree), [1, 2, 3, 4, 7, 14, 1, 2, 3, 1, 4, 'foo']);
});

it('next(), first()', () => {
  each([next, first], (fn) => {
    assert.deepStrictEqual(fn({ foo: 42 }), ['foo', 42]);
    each([{}, [], ''], (cont) => {
      ckThrows(IteratorEnded, () => fn(cont));
    });
  });
});

it('nth()', () => {
  ckThrows(IteratorEnded, () => nth([1, 2, 3, 4], 5));
  assert.strictEqual(nth([1, 2, 3, 4], 2), 3);
});

it('second()', () => {
  ckThrows(IteratorEnded, () => second([4]));
  assert.strictEqual(second([4, 3]), 3);
});

it('into(), list()', () => {
  each([list, into(Array)], (fn) => {
    assert.deepStrictEqual(fn({ a: 42 }), [['a', 42]]);
  });
  ckThrows(TraitNotImplemented, () => into([], Number));
});

it('into(), uniq()', () => {
  each([uniq, into(Set)], (fn) => {
    const v = fn([1, 1, 3, 1, 4]);
    assert(v.constructor === Set);
    ckEqSeq(list(v).sort(), [1, 3, 4]);
  });
});

it('join()', () => {
  assert.deepStrictEqual(join(['Hello', 'World'], ' '), 'Hello World');
  assert.deepStrictEqual(into(String)(['Hello', 'World']), 'HelloWorld');
});

it('into()', () => {
  each([into(Object), obj], (fn) => {
    const o2 = fn([['foo', 42], ['bar', 23], ['foo', 11]]);
    assert.strictEqual(o2.foo, 11);
    assert.strictEqual(o2.bar, 23);

    each([into(Map), dict], (fn2) => {
      const mo = fn2(o2);
      assert.strictEqual(size(mo), 2);
      assert.strictEqual(mo.get('foo'), 11);
      assert.strictEqual(mo.get('bar'), 23);
    });
  });

  each(_typedArrays, (Typ) => {
    const fn = into(Typ);
    assertEquals(fn(iter([1, 2])), new Typ([1, 2]));
  });
});

it('fold', () => {
  each([any, foldl(null, or), foldl(or)(null)], (fn) => {
    assert.strictEqual(fn([]), null);
    assert.strictEqual(fn([1]), 1);
    assert.strictEqual(fn([1, null]), 1);
    assert.strictEqual(fn([0, true, null]), true);
  });
  each([all, foldl(true, and)], (fn) => {
    assert.strictEqual(fn([]), true);
    assert.strictEqual(fn([1]), 1);
    assert.strictEqual(fn([1, null]), null);
    assert.strictEqual(fn([null, true, 0]), null);
  });
  each([sum, foldl(0, plus)], (fn) => {
    assert.strictEqual(fn([]), 0);
    assert.strictEqual(fn([1, 0]), 1);
    assert.strictEqual(fn([2, 3, 4]), 9);
  });
  each([product, foldl(1, mul)], (fn) => {
    assert.strictEqual(fn([]), 1);
    assert.strictEqual(fn([1, 0]), 0);
    assert.strictEqual(fn([2, 3, 4]), 24);
  });
  assert.strictEqual(
    foldr(['foo', 'bar'], 'Helo', (a, b) => `${a} ${b}`),
    'Helo bar foo',
  );
});

it('seqEq', () => {
  assert(seqEq([], {}));
  assert(seqEq(new Map([['foo', 42]]), { foo: 42 }));
  assert(seqEq(new Map([['foo', [1, 2, 3]]]), { foo: [1, 2, 3] }));
});

it('map()', () => {
  ckEqSeq(map(first)({ foo: 42 }), ['foo']);
});

it('filter(), reject()', () => {
  ckEqSeq(filter(second)({ foo: false, bar: '42' }), [['bar', '42']]);
  ckEqSeq(reject(second)({ foo: false, bar: '42' }), [['foo', false]]);
});

it('reverse()', () => {
  const v = reverse(iter([4, 3, 2, 1]));
  assert(v.constructor === Array);
  ckEqSeq(v, [1, 2, 3, 4]);
});

it('trySkip', () => {
  ckEqSeq(trySkip(2)([]), []);
  ckEqSeq(trySkip(2)([1, 2, 3, 4]), [3, 4]);
});

it('skip', () => {
  ckThrows(IteratorEnded, () => ckEqSeq(skip(1)([]), []));
  ckEqSeq(skip(0)([]), []);
  ckEqSeq(skip(2)([1, 2, 3, 4]), [3, 4]);
});

it('skipWhile', () => {
  ckEqSeq(skipWhile(x => x < 4)(range0(10)), [4, 5, 6, 7, 8, 9]);
  ckEqSeq(skipWhile(x => x < 4)([]), []);
});

it('take/tryTake', () => {
  ckEqSeq(tryTake(4)(range0(10)), [0, 1, 2, 3]);
  ckEqSeq(tryTake(4)(range0(2)), [0, 1]);
  ckEqSeq(take(2)(range0(2)), [0, 1]);
  ckThrows(IteratorEnded, () => take(4)(range0(2)));
});

it('takeWhile()', () => {
  ckEqSeq(takeWhile(x => x < 4)(range0(10)), [0, 1, 2, 3]);
});

it('takeUntilVal', () => {
  ckEqSeq(takeUntilVal(44)(range0(6)), [0, 1, 2, 3, 4, 5]);
  ckEqSeq(takeUntilVal(2)(range0(6)), [0, 1]);
});

it('takeDef', () => {
  ckEqSeq(takeDef([1, 2, 3, undefined, 4, 5, 6]), [1, 2, 3]);
  ckEqSeq(takeDef([1, 2, 3, null, 4, 5, 6]), [1, 2, 3]);
  ckEqSeq(takeDef(range0(6)), [0, 1, 2, 3, 4, 5]);
});

it('flat(), concat()', () => {
  each([flat, a => concat(...a)], (fn) => {
    ckEqSeq(
      fn(iter([iter([1, 2, 3, 4]), { foo: 42 }])),
      [1, 2, 3, 4, ['foo', 42]],
    );
  });
});

it('prepend(), append()', () => {
  ckEqSeq(append(42)(prepend(3)({ foo: 42 })), [3, ['foo', 42], 42]);
});

it('mapSort()', () => {
  const a = { id: 42 };
  const b = { id: 23 };
  const c = { id: 11 };

  const v = mapSort(({ id }) => id)([b, a, b, c, b]);
  ckEqSeq(v, [c, b, b, b, a]);
  const u = mapSort([a, c, b], ({ id }) => -id);
  ckEqSeq(u, [a, b, c]);
});

it('zipLeast', () => {
  ckEqSeq(zipLeast([]), []);
  ckEqSeq(zipLeast([['foo', 'bar']]), [['foo'], ['bar']]);
  ckEqSeq(zipLeast2('asdfg')([1, 2, 3, 4]), [[1, 'a'], [2, 's'], [3, 'd'], [4, 'f']]);
  ckEqSeq(
    zipLeast([[1, 2, 3], ['x', 'y'], [-1, -2, -3, -4]]),
    [[1, 'x', -1], [2, 'y', -2]],
  );
});

it('zip', () => {
  ckEqSeq(zip([]), []);
  ckEqSeq(zip([['foo', 'bar']]), [['foo'], ['bar']]);
  ckEqSeq(zip2('asdf')([1, 2, 3, 4]), [[1, 'a'], [2, 's'], [3, 'd'], [4, 'f']]);
  ckEqSeq(
    zip([[1, 2], ['x', 'y'], [-1, -2]]),
    [[1, 'x', -1], [2, 'y', -2]],
  );
  ckThrows(IteratorEnded, () => list(zip([[1, 2], [1]])));
  ckThrows(IteratorEnded, () => list(zip2([1, 2, 3, 4])('asdfg')));
});

it('zipLongest', () => {
  ckEqSeq(zipLongest(null)([]), []);
  ckEqSeq(zipLongest(null)([['foo', 'bar']]), [['foo'], ['bar']]);
  ckEqSeq(zipLongest2(null)('asdfg')([1, 2, 3, 4]), [[1, 'a'], [2, 's'], [3, 'd'], [4, 'f'], [null, 'g']]);
  ckEqSeq(
    zipLongest(null)([[1, 2, 3], ['x', 'y'], [-1, -2, -3, -4]]),
    [[1, 'x', -1], [2, 'y', -2], [3, null, -3], [null, null, -4]],
  );
});

it('slidingWindow', () => {
  each([slidingWindow, trySlidingWindow], (fn) => {
    ckEqSeq(fn(1)([1, 2, 3]), [[1], [2], [3]]);
    ckEqSeq(fn(2)([1, 2, 3]), [[1, 2], [2, 3]]);
    ckEqSeq(fn(3)([1, 2, 3]), [[1, 2, 3]]);
  });
  ckThrows(IteratorEnded, () => slidingWindow(4)([1, 2]));
  ckEqSeq(trySlidingWindow(4)([1, 2, 3]), []);
});

it('lookahead', () => {
  const ck = (seq, no, filler, expect) => {
    ckEqSeq(lookahead(seq, no, filler), expect);
  };

  ck([], 3, null, []);
  ck([42], 3, null, [[42, null, null, null]]);
  ck([42, 23], 3, null, [[42, 23, null, null], [23, null, null, null]]);
  ck([42, 23], 0, null, [[42], [23]]);
});

it('mod', () => {
  const s = new Set([1, 2, 3, 4]);
  const t = mod(s, map(mul(2)));
  assert(s.constructor === Set);
  ckEqSeq(s, [1, 2, 3, 4]); // no modify
  ckEqSeq(t, [2, 4, 6, 8]); // no modify
});

it('union/union2', () => {
  const o2 = {
    a: 42, b: 23, c: 1, d: 14,
  };
  const m2 = dict({ b: 99, x: 13 });
  const gen2 = () => iter([['c', 22], ['y', 44]]);

  const a = union2(o2)(m2);
  assert.strictEqual(a.constructor, Map);
  assert.strictEqual(size(a), 5);
  assert.strictEqual(a.get('x'), 13);
  assert.strictEqual(a.get('b'), 23);
  assert.strictEqual(a.get('d'), 14);

  const b = union(o2, m2, gen2());
  assert.strictEqual(b.constructor, Object);
  assert.strictEqual(size(b), 6);
  assert.strictEqual(b.a, 42);
  assert.strictEqual(b.b, 99);
  assert.strictEqual(b.c, 22);
  assert.strictEqual(b.x, 13);
  assert.strictEqual(b.y, 44);

  const c = union2(['a', 2, 13])(new Set([2, 44]));
  assert.strictEqual(c.constructor, Set);
  assert.strictEqual(size(c), 4);
  assert(c.has('a'));
  assert(c.has(2));
  assert(c.has(13));
  assert(c.has(44));

  // o2, m should not have been mutated
  assert.strictEqual(size(o2), 4);
  assert.strictEqual(o2.a, 42);
  assert.strictEqual(o2.b, 23);
  assert.strictEqual(o2.c, 1);
  assert.strictEqual(o2.d, 14);

  assert.strictEqual(size(m2), 2);
  assert.strictEqual(m2.get('b'), 99);
  assert.strictEqual(m2.get('x'), 13);
});
