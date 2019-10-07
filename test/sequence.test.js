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
  and, plus, or, mul, not, curry,
  size, TraitNotImplemented, _typedArrays,
  iter, range, range0, repeat, repeatFn, extend, extend1, flattenTree,
  IteratorEnded, next, tryNext, nth, first, second, last, tryNth, tryFirst,
  trySecond, tryLast, seqEq, each, find, tryFind, contains, count, list,
  uniq, join, dict, obj, into, foldl, foldr, any, all, sum, product, map,
  filter, reject, reverse, enumerate, trySkip, skip, skipWhile, tryTake,
  takeShort, takeWithFallback, chunkifyShort, chunkify, chunkifyWithFallback,
  take, takeWhile, takeUntilVal, takeDef, flat, concat, prepend, append,
  mapSort, zipLeast, zip, zipLongest, zipLeast2, zip2, zipLongest2,
  slidingWindow, trySlidingWindow, lookahead, mod, union, union2,
  cartesian, cartesian2, intersperse,
} = require('../src/index');
const { ckEq, ckEqSeq, ckThrows } = require('./util');

it('count()', () => {
  const ck = (seq, expect) => {
    ckEq(count(seq), expect);
    ckEq(count(iter(seq)), expect);
  };
  ck({}, 0);
  ck({ foo: 42, bar: 23 }, 2);
  ck(new Map([[23, 42]]), 1);
  ck([1, 2, 3], 3);
});

const sy = Symbol('foo');
const str = 'Hello World';
const arr = [42, 23];
const o = { foo: 42, [sy]: 23 };
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
    each(seq, (v) => actual.push(v));
    ckEqSeq(actual, expected);
  };
  checkEach(str, Array.from(str));
  checkEach(arr, arr);
  checkEach(o, [['foo', 42], [sy, 23]]);
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
  ckEq(
    Array.from(enumerate('abc')),
    [[0, 'a'], [1, 'b'], [2, 'c']],
  );
});

it('range(), range0()', () => {
  const ck = (a, b, l) => ckEq(list(range(a, b)), list(l));
  ck(0, 5, [0, 1, 2, 3, 4]);
  ck(0, -1, []);
  ck(0, 0, []);
  ck(7, 9, [7, 8]);
  ckEq(list(range0(4)), [0, 1, 2, 3]);
});

it('repeat()', () => {
  ckEqSeq(tryTake(repeat(2), 4), [2, 2, 2, 2]);

  let x = 0;
  const fn = () => {
    x += 1;
    return x;
  };
  ckEqSeq(tryTake(repeatFn(fn), 4), [1, 2, 3, 4]);
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
    ckEq(fn({ foo: 42 }), ['foo', 42]);
    each([{}, [], ''], (cont) => {
      ckThrows(IteratorEnded, () => fn(cont));
    });
  });
});

it('tryNext(), tryFirst()', () => {
  each([tryNext, tryFirst], (fn) => {
    ckEq(fn(null)({ foo: 42 }), ['foo', 42]);
    each([{}, [], ''], (cont) => {
      ckEq(fn(null)(cont), null);
    });
  });
});

it('nth(), tryNth()', () => {
  ckThrows(IteratorEnded, () => nth([1, 2, 3, 4], 10));
  ckEq(nth([1, 2, 3, 4], 2), 3);

  ckEq(tryNth(null)(5)([1, 2, 3]), null);
  ckEq(tryNth(null)(2)([1, 2, 3]), 3);
});

it('second(), trySecond', () => {
  ckThrows(IteratorEnded, () => second([4]));
  ckEq(second([4, 3]), 3);

  ckEq(trySecond(null)([]), null);
  ckEq(trySecond(null)([1, 2, 3]), 2);
});

it('last()', () => {
  ckThrows(IteratorEnded, () => last([]));
  ckEq(last([4, 3]), 3);

  ckEq(tryLast(null)([]), null);
  ckEq(tryLast(null)([1, 2, 3]), 3);
  ckEq(tryLast(null)([1, 2, 3, 4]), 4);
});

it('into(), list()', () => {
  each([list, into(Array)], (fn) => {
    ckEq(fn({ a: 42 }), [['a', 42]]);
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
  ckEq(join(['Hello', 'World'], ' '), 'Hello World');
  ckEq(into(String)(['Hello', 'World']), 'HelloWorld');
});

it('into()', () => {
  each([into(Object), obj], (fn) => {
    const o2 = fn([['foo', 42], ['bar', 23], ['foo', 11]]);
    ckEq(o2.foo, 11);
    ckEq(o2.bar, 23);

    each([into(Map), dict], (fn2) => {
      const mo = fn2(o2);
      ckEq(size(mo), 2);
      ckEq(mo.get('foo'), 11);
      ckEq(mo.get('bar'), 23);
    });
  });

  each(_typedArrays, (Typ) => {
    const fn = into(Typ);
    ckEq(fn(iter([1, 2])), new Typ([1, 2]));
  });
});

it('fold', () => {
  each([any, foldl(null, or), foldl(or)(null)], (fn) => {
    ckEq(fn([]), null);
    ckEq(fn([1]), 1);
    ckEq(fn([1, null]), 1);
    ckEq(fn([0, true, null]), true);
  });
  each([all, foldl(true, and)], (fn) => {
    ckEq(fn([]), true);
    ckEq(fn([1]), 1);
    ckEq(fn([1, null]), null);
    ckEq(fn([null, true, 0]), null);
  });
  each([sum, foldl(0, plus)], (fn) => {
    ckEq(fn([]), 0);
    ckEq(fn([1, 0]), 1);
    ckEq(fn([2, 3, 4]), 9);
  });
  each([product, foldl(1, mul)], (fn) => {
    ckEq(fn([]), 1);
    ckEq(fn([1, 0]), 0);
    ckEq(fn([2, 3, 4]), 24);
  });
  ckEq(
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
  ckEqSeq(skipWhile((x) => x < 4)(range0(10)), [4, 5, 6, 7, 8, 9]);
  ckEqSeq(skipWhile((x) => x < 4)([]), []);
});

it('take/...', () => {
  ckEqSeq(tryTake(4)(range0(10)), [0, 1, 2, 3]);
  ckEqSeq(tryTake(4)(range0(2)), [0, 1]);
  ckEqSeq(tryTake(4)([]), []);
  ckEqSeq(takeWithFallback(4, 99)(range0(2)), [0, 1, 99, 99]);
  ckEqSeq(takeWithFallback(4, 99)([]), [99, 99, 99, 99]);
  ckEqSeq(take(2)(range0(2)), [0, 1]);
  ckThrows(IteratorEnded, () => take(4)(range0(2)));

  const it = iter(range0(12));
  ckEq(take(it, 0), []);
  ckEq(take(it, 3), [0, 1, 2]);
  ckEq(take(it, 2), [3, 4]);
  ckEq(tryTake(it, 0), []);
  ckEq(takeShort(it, 1), [5]);
  ckEq(tryTake(it, 2), [6, 7]);
  ckEq(takeWithFallback(it, 0, null), []);
  ckEq(takeWithFallback(it, 2, null), [8, 9]);
  ckEq(takeWithFallback(it, 4, null), [10, 11, null, null]);
  ckEq(takeWithFallback(it, 0, null), []);
  ckEq(take(it, 0), []);
  ckEq(takeShort(it, 0), []);
  ckEq(takeWithFallback(it, 0, null), []);
});

it('takeWhile()', () => {
  ckEqSeq(takeWhile((x) => x < 4)(range0(10)), [0, 1, 2, 3]);
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
  each([flat, (a) => concat(...a)], (fn) => {
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
    ckEqSeq(fn(0)([1, 2, 3]), []);
    ckEqSeq(fn(0)([]), []);
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

it('chunkify/chunkifyShort/chunkifyWithFallback', () => {
  const withFallback = curry('withFallback', (seq, len) => chunkifyWithFallback(len, null)(seq));
  each([chunkify, withFallback, chunkifyShort], (fn) => {
    ckEqSeq(fn(2)([1, 2, 3, 4]), [[1, 2], [3, 4]]);
    ckEqSeq(fn(2)([]), []);
    ckEqSeq(fn(1)([1, 2, 3, 4]), [[1], [2], [3], [4]]);
    ckEqSeq(fn(1)([]), []);
    ckEqSeq(fn(0)([1, 2, 3, 4]), []);
    ckEqSeq(fn(0)([]), []);
  });

  ckEqSeq(chunkifyShort([1, 2, 3, 4], 3), [[1, 2, 3], [4]]);
  ckEqSeq(chunkifyWithFallback([1, 2, 3, 4], 3, null), [[1, 2, 3], [4, null, null]]);
  ckThrows(IteratorEnded, () => list(chunkify([1, 2, 3, 4], 3)));
});

it('cartesian', () => {
  ckEqSeq(cartesian([]), []);
  ckEqSeq(cartesian([[]]), []);
  ckEqSeq(cartesian([[], [42, 23]]), []);
  ckEqSeq(cartesian([[42, 23], [42, 23], []]), []);
  ckEqSeq(cartesian([[42, 23], [], [22]]), []);
  ckEqSeq(cartesian([[1]]), [[1]]);
  ckEqSeq(cartesian([[1, 2, 3, 4, 5]]), [[1], [2], [3], [4], [5]]);
  ckEqSeq(cartesian([[1], [2]]), [[1, 2]]);
  ckEqSeq(cartesian([[1], [2], [3]]), [[1, 2, 3]]);
  ckEqSeq(cartesian([[1], [2, 3], [4]]), [[1, 2, 4], [1, 3, 4]]);
  ckEqSeq(cartesian([[1, 2], [3, 4], [5]]), [[1, 3, 5], [1, 4, 5], [2, 3, 5], [2, 4, 5]]);
  ckEqSeq(cartesian2([])([1, 2, 3]), []);
  ckEqSeq(cartesian2([4, 5, 6])([1, 2, 3]), [
    [1, 4], [1, 5], [1, 6],
    [2, 4], [2, 5], [2, 6],
    [3, 4], [3, 5], [3, 6]]);
});

it('mod', () => {
  const s = new Set([1, 2, 3, 4]);
  const t = mod(s, map(mul(2)));
  assert(s.constructor === Set);
  ckEqSeq(s, [1, 2, 3, 4]); // no modify
  ckEqSeq(t, [2, 4, 6, 8]); // no modify
});

it('find, tryFind, contains', () => {
  ckEq(find([1, 2, 3, 4], (x) => x > 2), 3);
  ckThrows(IteratorEnded, () => find([1, 2, 3, 4], (x) => x > 10));

  ckEq(tryFind([1, 2, 3, 4], null, (x) => x > 2), 3);
  ckEq(tryFind([1, 2, 3, 4], null, (x) => x > 10), null);

  const containsFalsy = contains(not);
  assert(!containsFalsy([]));
  assert(containsFalsy([null]));
  assert(containsFalsy([undefined]));
  assert(containsFalsy([0]));
});

it('union/union2', () => {
  const o2 = {
    a: 42, b: 23, c: 1, d: 14,
  };
  const m2 = dict({ b: 99, x: 13 });
  const gen2 = () => iter([['c', 22], ['y', 44]]);

  const a = union2(o2)(m2);
  ckEq(a.constructor, Map);
  ckEq(size(a), 5);
  ckEq(a.get('x'), 13);
  ckEq(a.get('b'), 23);
  ckEq(a.get('d'), 14);

  const b = union(o2, m2, gen2());
  ckEq(b.constructor, Object);
  ckEq(size(b), 6);
  ckEq(b.a, 42);
  ckEq(b.b, 99);
  ckEq(b.c, 22);
  ckEq(b.x, 13);
  ckEq(b.y, 44);

  const c = union2(['a', 2, 13])(new Set([2, 44]));
  ckEq(c.constructor, Set);
  ckEq(size(c), 4);
  assert(c.has('a'));
  assert(c.has(2));
  assert(c.has(13));
  assert(c.has(44));

  // o2, m should not have been mutated
  ckEq(size(o2), 4);
  ckEq(o2.a, 42);
  ckEq(o2.b, 23);
  ckEq(o2.c, 1);
  ckEq(o2.d, 14);

  ckEq(size(m2), 2);
  ckEq(m2.get('b'), 99);
  ckEq(m2.get('x'), 13);
});

it('intersperse', () => {
  ckEqSeq(intersperse('', 'x'), '');
  ckEqSeq(intersperse('a', 'x'), 'a');
  ckEqSeq(intersperse('ab', 'x'), 'axb');
  ckEqSeq(intersperse('abc', 'x'), 'axbxc');
});
