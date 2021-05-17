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

// This code contains a lot of functions that call each other;
// sometimes using mutual recursion and we do not have forward
// declaraions...
/* eslint-disable no-use-before-define, no-param-reassign, no-restricted-syntax, no-return-assign */

const assert = require('assert');
const { inspect } = require('util');
const { curry, pipe } = require('./functional');
const { plus, or, mul, and, is } = require('./op');
const { type } = require('./typesafe');
const { Trait } = require('./trait');
const { size, Size, pairs, eq, empty, _typedArrays, setdefault } = require('./stdtraits');

// ITERATOR GENERATORS ///////////////////////////////////////

/**
 * @module sequence
 * @description
 * Generic library for advanced utilization of es6 iterators.
 *
 * map, fold and so on...
 *
 * sequence.js functions are fully lazy and work with anything implementing
 * the iterator protocol; in addition, all functions also support treating
 * plain objects as sequences!
 *
 * The advantage of lazy implementations is that these functions work efficiently
 * with very long or even infinite sequences; assuming the following example is
 * given a sequence with ten billion elements, it would still start printing it's
 * output immediately and would not require creating another billion element array
 * as `Array.map` would do.
 * In practice the `x*2` would be calculated immediately before the result is printed.
 *
 * ```js,notest
 * const { each, map } = require('ferrum');
 * each(map([1,2,3], (x) => x*2), console.log);
 * ```
 *
 * A disadvantage of laziness is that side effects (e.g. a console.log inside a map())
 * are not executed, before the resulting sequence is actually being consumed by a
 * for loop or each() or fold() or similar functions…
 * So if you need to perform side effects, remember to use one of these
 * instead of lazy functions like map();
 *
 * sequence.js functions also support passing functions as the last argument:
 *
 * ```js,notest
 * const { each } = require('ferrum');
 * each([1,2,3,4], (elm) => {
 *   // doSomething(elm);
 *   console.log(elm);
 * });
 * ```
 *
 * is much more readable then the example below; especially when you
 * are using multiple nested each/map/fold calls and the function bodies
 * grow long!
 *
 * ```js,notest
 * const each = (fn, seq) => {
 *   for (const val of seq) fn(val);
 * };
 *
 * each((elm) => {
 *   // doSomething(elm);
 *   console.log(elm);
 * }, [1,2,3,4]);
 * ```
 *
 * Some of the utilities in here can *mostly* be implemented with
 * standard js6.
 * The emphasis here is on mostly, since sequence.js functions are
 * designed to have fewer edge cases that classical es6 pendants and
 * therefore make for a smoother coding experience.
 *
 * Examples:
 *
 * # Iteration
 *
 * ```notest
 * for (const v of {foo: 42, bar: 23}) console.log(v);
 * // throws TypeError: {(intermediate value)(intermediate value)} is not iterable
 * ```
 *
 * Does not work because plain objects do not implement the iterator protocol.
 *
 * # Replace With
 *
 * ```js,notest
 * const { each } = require('ferrum');
 * each({ foo: 42, bar: 23 }, console.log);
 * ```
 *
 * or
 *
 * ```
 * const { each } = require('ferrum');
 * each({ foo: 42, bar: 23 }, v => console.log(v));
 * ```
 *
 * or the following if the full power of a for loop is really required..
 *
 * ```js,notest
 * const { each, iter } = require('ferrum');
 * for (const v of iter({foo: 42})) {
 *   console.log(v);
 * }
 * ```
 *
 * # Array.forEach
 *
 * ```js,notest
 * const { each } = require('ferrum');
 * [1,2,3,4].forEach(console.log)
 *
 * // Outputs:
 * // 1 0 [ 1, 2, 3, 4 ]
 * // 2 1 [ 1, 2, 3, 4 ]
 * // 3 2 [ 1, 2, 3, 4 ]
 * // 4 3 [ 1, 2, 3, 4 ]
 * ```
 *
 * Unexpectedly yields a lot of output; that is because forEach also passes
 * the index in the array as well as the `thisArgument`.
 * This behaviour is often unexpected and forces us to define an intermediate
 * function.
 *
 * ## Replace With
 *
 * ```js,notest
 * const { each } = require('ferrum');
 * each([1,2,3,4], console.log);
 * // 1
 * // 2
 * // 3
 * // 4
 * ```
 *
 * If the index is really needed, `enumerate()` may be used:
 *
 * ```js,notest
 * const { each, enumerate } = require('ferrum');
 * each(enumerate([42, 23]), console.log)
 * // [ 0, 42 ]
 * // [ 1, 23 ]
 * ```
 *
 * As a sidenote this also effortlessly fits the concept of a key/value
 * container; the output of `enumerate([42, 23])` could easily passed
 * into `new Map(...)`;
 */

/**
 * Turn any object into an iterator.
 * Takes objects that implement the iterator protocol.
 * Plain objects are treated as key-value stores and yield
 * a sequence of their key value bytes, represented as size-2 arrays.
 *
 * Any value that is allowed as a parameter for this function shall be
 * considered to be a `Sequence` for the purpose of this file.
 *
 * This term shall be distinguished from Iterable in that Iterables
 * must implement the iterator protocol `iterable[Symbol.iterator]()`
 * while Sequences implement the Sequence trait. E.g. plain objects
 * would be sequences but not Iterables.
 *
 * ```js
 * const { iter, assertEquals } = require('ferrum');
 *
 * let it = iter({ foo: 42 });
 * assertEquals(it.next(), { value: [ 'foo', 42 ], done: false });
 * assertEquals(it.next(), { value: undefined, done: true });
 *
 * it = iter('asd');
 * assertEquals(it.next(), { value: 'a', done: false });
 * assertEquals(it.next(), { value: 's', done: false });
 * assertEquals(it.next(), { value: 'd', done: false });
 * assertEquals(it.next(), { value: undefined, done: true });
 * ```
 *
 * # Version history
 *
 * - 1.2.0 Support for objects with Symbol keys.
 *
 * @function
 * @param {Sequence} obj
 * @returns {Iterator}
 * @yields The data from the given elements
 */
const iter = (v) => Sequence.invoke(v);

/**
 * Trait for any iterable type.
 *
 * Uses the `Symbol.iterator` Symbol, so this is implemented for any
 * type that implements the iterator protocol.
 *
 * You generally won't want to use this, implement the iterator protocol
 * instead.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { Sequence, iter, assertEquals } = require('ferrum');
 *
 * // Sequence extends the iterator protocol; they use the same
 * // symbols
 * assertIs(Sequence.sym, Symbol.iterator)
 *
 * // Usually you want to implement the Sequence trait by implementing
 * // the iterator protocol.
 * class Foo {
 *   [Symbol.iterator]() {
 *     function* gen() {
 *       yield 2;
 *       yield 3;
 *       yield 4;
 *     }
 *     return gen();
 *   }
 * };
 *
 * // You can use iter() as a shorthand for getting the iterator.
 * // It is much less cumbersome than using mySeq[Symbol.iterator]().
 * it = iter(new Foo());
 * assertEquals(it.next(), { value: 2, done: false });
 * assertEquals(it.next(), { value: 3, done: false });
 * assertEquals(it.next(), { value: 4, done: false });
 * assertEquals(it.next(), { value: undefined, done: true });
 * ```
 *
 * @interface
 */
const Sequence = new Trait('Sequence', Symbol.iterator);
Sequence.impl(Object, pairs);

/**
 * Generates an iterator with the numeric range [start; end[
 * Includes start but not end.
 *
 * ```js
 * const {
 *  range, extend, takeWhile, assertSequenceEquals, take, pipe,
 *  mul,
 * } = require('ferrum');
 *
 * assertSequenceEquals(range(0, 4), [0, 1, 2, 3]);
 * assertSequenceEquals(range(-6, -3), [-6, -5, -4]);
 * assertSequenceEquals(range(0, 0), []);
 *
 * // You can even generate infinite sequences
 * assertSequenceEquals(take(range(10, Infinity), 3), [10, 11, 12]);
 *
 * // Note that for more sophisticated ranges (custom step, not on numbers)
 * // the following pattern (extend, takeWhile) can be used
 * assertSequenceEquals(
 *   // Range over all powers of two below 20
 *   pipe(
 *     2,                         // Start value
 *     extend(mul(2)),            // Step function
 *     takeWhile((v) => v < 20)), // Define the end condition
 *   [2, 4, 8, 16]);
 * ```
 *
 * @function
 * @param {Number} start
 * @param {Number} end Must be >= start
 * @returns {Iterator}
 */
function* range(start, end) {
  for (let idx = start; idx < end; idx += 1) {
    yield idx;
  }
}

/**
 * Like range(a, b) but always starts at 0
 *
 * ```js
 * const { range0, assertSequenceEquals, take } = require('ferrum');
 *
 * assertSequenceEquals(range0(4), [0, 1, 2, 3]);
 * assertSequenceEquals(range0(0), []);
 *
 * // You can even generate infinite sequences
 * assertSequenceEquals(take(range0(Infinity), 3), [0, 1, 2]);
 * ```
 *
 * @function
 * @param {Number} end
 * @returns {Iterator}
 */
const range0 = (b) => range(0, b);

/**
 * Generates an infinite iterator by invoking the
 * given function repeatedly.
 *
 * Note that this pretty much assumes that
 *
 * ```js
 * const { repeatFn, assertSequenceEquals, take } = require('ferrum');
 *
 * let i = 0;
 * assertSequenceEquals(
 *   take(repeatFn(() => i += 1), 4),
 *   [1, 2, 3, 4]);
 *
 * // This is a much better example for it's usefulness, although it
 * // is hard to test!
 * const randomSeq = () => repeatFn(Math.random);
 * ```
 *
 * @function
 * @param {Function} fn
 * @returns {Sequence}
 */
function* repeatFn(fn) {
  while (true) {
    yield fn();
  }
}

/**
 * Generates an infinite iterator of the given value.
 *
 * ```js
 * const { repeat, take, assertSequenceEquals } = require('ferrum');
 *
 * assertSequenceEquals(
 *   take(repeat(true), 4),
 *   [true, true, true, true]);
 * ```
 *
 * @function
 * @template T
 * @param {T} val
 * @returns {Sequence<T>}
 */
const repeat = (val) => repeatFn(() => val);

/**
 * Generate a sequence by repeatedly calling the same function on the
 * previous value.
 *
 * This is often used in conjunction with takeDef or takeWhile to generate
 * a non-infinite sequence.
 *
 * ```js
 * const { extend, take, assertSequenceEquals, mul, plus } = require('ferrum');
 *
 * // Use currying to generate a function that generates an
 * // infinite sequence counting down from the given number
 * const countDown = extend(plus(-1));
 *
 * assertSequenceEquals(
 *   take(countDown(3), 5),
 *   [3, 2, 1, 0, -1]);
 *
 * // Generate a list of all powers of a number
 * const powers = (base) => extend(base, mul(base));
 *
 * assertSequenceEquals(
 *   take(powers(3), 5),
 *   [3, 9, 27, 81, 243]);
 * ```
 *
 * @function
 * @param {Any} init
 * @param {Function} fn
 * @return {Iterator}
 */
const extend = curry('extend', function* extend(init, fn) {
  /* eslint-disable no-param-reassign */
  while (true) {
    yield init;
    init = fn(init);
  }
});

/**
 * Like extend(), but the resulting sequence does not contain
 * the initial element.
 *
 * ```js
 * const { take, extend1, plus, assertSequenceEquals } = require('ferrum');
 *
 * assertSequenceEquals(
 *   take(extend1(3, plus(-1)), 5),
 *   [2, 1, 0, -1, -2]);
 * ```
 *
 * @function
 * @param {Any} init
 * @param {Function} fn
 * @return {Iterator}
 */
const extend1 = curry('extend1', (init, fn) => trySkip(extend(init, fn), 1));

/**
 * Extract a list of values from any tree-like structure
 *
 * This is just a very thin wrapper (a transform) over a user provided
 * function that does all the heavy lifting.
 *
 * 1. Decide whether a given value in a tree is a node or a leaf (or both)
 * 2. Convert nodes into sequences so we can easily recurse into them
 * 3. Extract values from leaves
 *
 * ```js
 * const { flattenTree, pipe } = require('ferrum');
 *
 * flattenTree((node, recurse) => {
 *   if (isEmptyLeaf()) {
 *     return [];
 *
 *   } else if (isLeaf(node)) {
 *     return [node.value];
 *
 *   } else if (isMultiLeaf(node)) {
 *     return node.values;
 *
 *   } else if (isNode(node)) {
 *     return recurse(node.childNodes);
 *
 *   } else if (isLeafAndNode(node)) {
 *     return concat([node.value], recurse(node.childNodes));
 *   }
 * });
 * ```
 *
 * Functions implemented using flattenTree can usually be easily implemented
 * as a classical recursive algorithm, but still flattenTree provides three
 * important features:
 *
 * 1. It lets you implement those algorithms as anonymous functions
 * 2. It provides documentation that the code's purpose is to flatten
 *    a tree like structure
 * 3. It savey you from typing a bit of boilerplate
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const {
 *   isPrimitive, type, sum, map, flattenTree, filter, pipe,
 *   flatten,
 * } = require('ferrum');
 *
 * // In the following example, we'll be summing all the numbers from
 * // a json tree; first we'll implement the algorithm using a classical
 * // recursive function
 *
 * const sumNumbers1 = (v) => {
 *   if (!isPrimitive(v)) {
 *     return sum(map(v, sumNumbers1)); // Recurse!
 *
 *   } else if (type(v) === Number){
 *     return v;
 *
 *   } else {
 *     return 0;
 *   }
 * }
 *
 * // Now, the above algorithm is a bit hard, to read, because it does a lot
 * // of things at once (filtering out non-numbers, iterating over the tree, summing)
 * // We can use pipe() to do better.
 *
 * const sumNumbers2 = (json) => pipe(
 *   _flattenJSON(json),
 *   filter(x => type(x) === Number),
 *   sum);
 *
 * const _flattenJSON = (v) =>
 *   isPrimitive(v) ? [v] : flatten(map(Object.values(v), _flattenJSON));
 *
 * // Unfortunately, now we had to move the tree flattening step into it's
 * // own function… often moving code into it's own function is good! Doing
 * // so reduces the amount of code to look at to understand and it allows us
 * // to reduce code.
 * //
 * // In this case though, I would argue this is not the case. _flattenJSON
 * // arguably is an implementation detail of sumNumbers2; it is very unlikely
 * // that it can be used anywhere else without modification ("premature abstraction").
 * //
 * // Also, since we are using pipe() here, we already have a very good way
 * // of reducing the amount of code we have to keep in our head at one time.
 * // Using pipe() we don't need to look at the entire function to understand
 * // a bit of code, we just need need to look at a single pipeline step!
 *
 * const sumNumbers3 = (json) => pipe(
 *   flattenTree(json, (v, recurse) =>
 *      isPrimitive(v) ? [v] : recurse(Object.values(v))),
 *   filter(x => type(x) === Number),
 *   sum);
 *
 * const jsonTree = {
 *   foo: 3,
 *   bar: null,
 *   baz: [5, null, {bang: 4}],
 *   hello: 'world'
 * };
 *
 * assertIs(sumNumbers1(jsonTree), 12);
 * assertIs(sumNumbers2(jsonTree), 12);
 * assertIs(sumNumbers3(jsonTree), 12);
 * ```
 *
 * @function
 * @param {Any} val The tree to flatten
 * @param {Function} fn The function that does the actual flattening
 * @returns {Sequence} A sequence containing the actual values from the tree
 */
const flattenTree = curry('flattenTree', (val, fn) => fn(val,
  (seq) => flat(map(seq, (v) => flattenTree(v, fn)))));

// VALUE ACCESS //////////////////////////////////////////////

class IteratorEnded extends Error {}

/**
 * Extracts the next element from the iterator.
 *
 * ```js
 * const { strictEqual: assertIs, throws: assertThrows } = require('assert');
 * const {iter, next} = require('ferrum');
 *
 * const it = iter([1,2,3]);
 * assertIs(next(it), 1);
 * assertIs(next(it), 2);
 * assertIs(next(it), 3);
 * assertThrows(() => next(it)); // throws IteratorEnded
 * //next(it); // throws IteratorEnded
 * ```
 *
 * @function
 * @param {Sequence} seq Any sequence for which iter() is defined
 * @throws {IteratorEnded} If the sequence is empty
 * @returns {Any}
 */
const next = (seq) => {
  const { done, value } = iter(seq).next();
  if (done) {
    throw new IteratorEnded();
  } else {
    return value;
  }
};

/**
 * Extracts the next element from the iterator using a sentinel
 * value if the sequence has ended.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { iter, tryNext } = require('ferrum');
 *
 * const it = iter([1,2,3]);
 * assertIs(tryNext(it, null), 1);
 * assertIs(tryNext(it, null), 2);
 * assertIs(tryNext(it, null), 3);
 * assertIs(tryNext(it, null), null);
 *
 * // If you need to be able to handle null/undefined values, you
 * // can choose a different sentinel value. E.g. a custom symbol
 * // will by definition never be used by anyone else…
 * // This technique is used in a couple of places inside ferrum…
 *
 * const end = Symbol()
 * assertIs(tryNext(it, end), end);
 * ```
 *
 * @function
 * @param {Sequence} seq Any sequence for which iter() is defined
 * @param {Any} fallback The value to return if the sequence is empty
 * @returns {Any}
 */
const tryNext = curry('tryNext', (seq, fallback) => {
  const { done, value } = iter(seq).next();
  if (done) {
    return fallback;
  } else {
    return value;
  }
});

/**
 * Extract the nth element from the sequence returning a sentinel
 * value if the sequence has ended
 *
 * ```js
 * const { strictEqual: assertIs, throws: assertThrows } = require('assert');
 * const {iter, next, nth} = require('ferrum');
 *
 * const it = iter('hello world');
 * assertIs(nth(it, 3), 'l');
 * assertIs(next(it),   'o');
 *
 * const f = nth(4);
 * assertIs(f(it), 'l');
 * assertThrows(() => fourth(it)); // throws IteratorEnded
 * ```
 *
 * @function
 * @param {Sequence} seq Any sequence for which iter() is defined
 * @param {Number} idx The index of the element
 * @throws {IteratorEnded} If the sequence is too short
 * @returns {Any}
 */
const nth = curry('nth', (seq, idx) => next(skip(seq, idx)));

/**
 * Extract the first element from the sequence; this is effectively
 * an alias for next();
 *
 * ```
 * const { strictEqual: assertIs, throws: assertThrows } = require('assert');
 * const { first } = require('ferrum');
 *
 * assertIs(first([1,2]), 1);
 * assertThrows(() => first([])); // throws IteratorEnded
 * ```
 *
 * @function
 * @param {Sequence} seq Any sequence for which iter() is defined
 * @throws {IteratorEnded} If the sequence is too short
 * @returns {Any}
 */
const first = (seq) => next(seq);

/**
 * Extract the second element from the sequence
 *
 * ```
 * const { strictEqual: assertIs, throws: assertThrows } = require('assert');
 * const {second} = require('ferrum');
 *
 * assertIs(second([1,2]), 2);
 * assertThrows(() => second([1])); // throws IteratorEnded
 * ```
 *
 * @function
 * @param {Sequence} seq Any sequence for which iter() is defined
 * @throws {IteratorEnded} If the sequence is too short
 * @returns {Any}
 */
const second = (seq) => nth(seq, 1);

/**
 * Extract the last element from the sequence
 *
 * ```
 * const { strictEqual: assertIs, throws: assertThrows } = require('assert');
 * const { last, next, iter } = require('ferrum');
 *
 * const it = iter([1, 2, 3, 4, 5]);
 * assertIs(last(it), 5);
 * assertThrows(() => last(it)); // throws IteratorEnded
 * assertThrows(() => next(it));
 * ```
 *
 * @function
 * @param {Sequence} seq Any sequence for which iter() is defined
 * @throws {IteratorEnded} If the sequence is empty
 * @returns {Any}
 */
const last = (seq) => {
  const nothing = Symbol('');
  const v = tryLast(seq, nothing);
  if (v === nothing) {
    throw new IteratorEnded();
  } else {
    return v;
  }
};

/**
 * Extract the nth element from the sequence, returnng
 * a sentinel value if the sequence is too showrt
 *
 * ```
 * const { strictEqual: assertIs, throws: assertThrows } = require('assert');
 * const { iter, next, tryNth, nth } = require('ferrum');
 *
 * const it = iter('hello world');
 * assertIs(tryNth(it, 3, null), 'l');
 * assertIs(next(it), 'o');
 *
 * const fifth = tryNth(4, null);
 * assertIs(fifth(it), 'l');
 * assertIs(fifth(it), null);
 * ```
 *
 * @function
 * @param {Sequence} seq Any sequence for which iter() is defined
 * @param {Number} idx The index of the element
 * @param {Any} fallback The value to return if the sequence is too short
 * @returns {Any}
 */
const tryNth = curry('tryNth', (seq, idx, fallback) => tryNext(trySkip(seq, idx), fallback));

/**
 * Extract the first element from the sequence; this is effectively
 * an alias for tryNext();
 *
 * ```
 * const { strictEqual: assertIs, throws: assertThrows } = require('assert');
 * const { tryFirst } = require('ferrum');
 *
 * assertIs(tryFirst([1,2], null), 1);
 * assertIs(tryFirst([], null),  null);
 *
 * const fn = tryFirst(null);
 * fn([]); // => null
 * ```
 *
 * @function
 * @param {Sequence} seq Any sequence for which iter() is defined
 * @param {Any} fallback The value to return if the sequence is too short
 * @returns {Any}
 */
const tryFirst = curry('tryFirst', (seq, fallback) => tryNext(seq, fallback));

/**
 * Extract the second element from the sequence
 *
 * ```
 * const {trySecond} = require('ferrum');
 *
 * trySecond([1,2], null) // => 2
 * trySecond([1], null);  // => null
 *
 * const fn = trySecond(null);
 * fn([1]); // => null
 * ```
 *
 * @function
 * @param {Sequence} seq Any sequence for which iter() is defined
 * @param {Any} fallback The value to return if the sequence is too short
 * @returns {Any}
 */
const trySecond = curry('trySecond', (seq, fallback) => tryNth(seq, 1, fallback));

/**
 * Extract the last element from the sequence
 *
 * ```js
 * const { strictEqual: assertIs, throws: assertThrows } = require('assert');
 * const { tryLast } = require('ferrum');
 *
 * assertIs(tryLast([1,2,3,4,5], null), 5);
 * assertIs(tryLast([], null), null);
 *
 * const fn = tryLast(null);
 * assertIs(fn([]), null);
 * ```
 *
 * @function
 * @param {Sequence} seq Any sequence for which iter() is defined
 * @param {Any} fallback The value to return if the sequence is empty
 * @returns {Any}
 */
const tryLast = curry('tryLast', (seq, fallback) => {
  let r = fallback;
  each(seq, (v) => r = v);
  return r;
});

// ITERATOR SINKS ////////////////////////////////////////////

/**
 * Iterate over sequences: Apply the give function to
 * every element in the sequence
 *
 * ```js,notest
 * const { each } = require('ferrum');
 *
 * each({foo: 42, bar: 23}, ([key, value]) => {
 *   // console.log(`${key}: ${value}`);
 * });
 *
 * each([1,2,3], (v) => {
 *   // console.log(v);
 * });
 * ```
 *
 * # Version history
 *
 * - 1.2.0 Support for objects with Symbol keys.
 *
 * @function
 * @param {Sequence} seq Any sequence for which iter() is defined
 * @param {Function} fn Function taking a single parameter
 */
const each = curry('each', (seq, fn) => {
  for (const val of iter(seq)) {
    fn(val);
  }
});

/**
 * Return the first element in the sequence for which the predicate matches.
 *
 * ```js
 * const { strictEqual: assertIs, throws: assertThrows } = require('assert');
 * const { find } = require('ferrum');
 *
 * assertIs(find([1,2,3,4], v => v>2), 3);
 * assertThrows(() => find([1,2,3,4], v => v>10)); // throws IteratorEnded
 *
 * const findEven = find(v => v % 2 === 0);
 * assertIs(findEven([3,4,1,2]), 4);
 * assertThrows(() => findEven([])); // throws IteratorEnded
 * ```
 *
 * @function
 * @param {Sequence} seq Any sequence for which iter() is defined
 * @param {Function} fn The predicate
 * @throws {IteratorEnded} If no element in the sequence matches the predicate..
 * @returns *
 */
const find = curry('find', (seq, fn) => next(filter(seq, fn)));

/**
 * Return the first element in the sequence for which the predicate matches,
 * returning a sentinel value if there is no such element.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { tryFind } = require('ferrum');
 *
 * assertIs(tryFind([1,2,3,4], null, v => v>2), 3);
 * assertIs(tryFind([1,2,3,4], null, v => v>10), null);
 *
 * const findEven = tryFind(null, v => v%2 === 0);
 * assertIs(findEven([1,9,10,14]), 10);
 * assertIs(findEven([]), null);
 * ```
 *
 * @function
 * @param {Sequence} seq Any sequence for which iter() is defined
 * @param {*} fallback The value to return if no element in the sequence matches the predicate
 * @param {Function} fn The predicate
 * @returns *
 */
const tryFind = curry('tryFind', (seq, fallback, fn) => tryNext(filter(seq, fn), fallback));

/**
 * Test if the given sequence contains a value that matches the predicate.
 *
 * ```js
 * const assert = require('assert');
 * const { contains, eq, is, not } = require('ferrum');
 *
 * const containsEven = contains(x => x%2 === 0);
 * assert(containsEven([1,2,3,4]));
 * assert(!containsEven([1,3,5,7]));
 *
 * // Use is to search vor values using the === operator
 * const contains4 = contains(is(4));
* // const contains4 = contains(x => x === 4); // this is a bit longer & harder to read
* assert(!contains4([1,2,3])); // => false
* contains4([4,4,4]); // => true
*
* // You can use eq to search for values equal to another value
* const containsEmptyObject = contains(eq({}));
* containsEmptyObject([{foo: 42}]); // => false
* containsEmptyObject([{}]); // => true
* ```
*
* This function should be used over `tryFind` in cases where just the presence
* of a value should be tested for:
*
* ```
* const { tryFind, contains, is, not } = require('ferrum');
*
* // The usual pattern checking whether a value is contained would be this:
* tryFind([1,2,3,4], null, is(3)); // => 3 (truthy)
* tryFind([1,2,4,5], null, is(3)); // => null (falsy)
*
* // Obviously this pattern breaks down when searching for falsy values
* tryFind([0,1,2,3,4], null, is(0)); // => 0 (falsy - FALSE POSITIVE)
* tryFind([1,1,2,3,4], null, is(0)); // => null (falsy)
*
* // Using contains() gets you around this issue and does what you would expect
* contains([0,1,2,3,4], is(0)); // => true
* contains([1,1,2,3,4], is(0)); // => false
*
* // If you need to search for the value and do not want to run into this issue,
* // the following pattern (creating a symbol on the fly) can be used
* // This is also how contains() is implemented.
* // You could also use null or undefined as the sentinel value, but this is discouraged,
* // as the sequence could contain those values; this can never be the case with a symbol
* // you just created
*
* const nothing = Symbol('');
* const v = tryFind([1,2,3,null,4,0], nothing, not) // tryFindFalsy
* if (v === nothing) {
*   // handle that case
* } else {
*   // Got a valid, falsy value
* }
* ```
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @returns {Boolean}
*/
const contains = curry('contains', (seq, fn) => {
  const nothing = Symbol('');
  return tryFind(seq, nothing, fn) !== nothing;
});

/**
* Determine whether the items in two sequences are equal.
*
* ```
* const { seqEq, eq, dict } = require('ferrum');
*
* seqEq([1,2,3,4], [1,2,3,4]); // => true
* seqEq([1,2,3,4], [1,2,3]); // => false
*
* // The types of the objects being compared is not important,
* // just the contents of the iterator
* seqEq(new Set([1,2,3]), [1,2,3]); // => true
* seqEq(new Set([1,2,3,3]), [1,2,3,3]); // => false (the set discards the second 3)
*
* // Note that sets and maps should usually compared using eq() and not
* // seqEq, since seqEq cares about the infestation order while eq() does
* // not for sets and maps
* eq(new Set([1,2,3]), new Set([1,2,3])); // => true
* eq(new Set([3,2,1]), new Set([1,2,3])); // => true
*
* seqEq(new Set([1,2,3]), new Set([1,2,3])); // => true
* seqEq(new Set([3,2,1]), new Set([1,2,3])); // => false
*
* // Objects should never be compared using seqEq, because the order
* // in which the elements of an object are returned is undefined
* const obj = {foo: 23, bar: 42};
* seqEq(obj, obj); // UNDEFINED BEHAVIOUR; could be true or false
*
* // Same goes of course for es6 Maps created from objects
* seqEq(dict(obj), dict(obj)); // => UNDEFINED BEHAVIOUR; could be true or false
*
* // Objects as elements inside the iterator are OK; elements are compared
* // using eq() not seqEq()
* seqEq([{foo: 42, bar: 23}], [{bar: 23, foo: 42}]); // => true
* ```
*
* @function
* @param {Sequence} a Any sequence for which iter() is defined
* @param {Sequence} b Any sequence for which iter() is defined
* @returns {Boolean}
*/
const seqEq = (a, b) => pipe(
  zipLongest([a, b], Symbol('EqualToNothing')),
  map(([x, y]) => eq(x, y)),
  all,
);

/**
* Assert that two finite sequences are equals.
* @function
* @param {Sequence} a Any sequence for which iter() is defined
* @param {Sequence} b Any sequence for which iter() is defined
* @param {String|undefined} msg The error message to print
* @throws {AssertionError}
* @returns {Boolean}
*/
const assertSequenceEquals = (a, b, msg) => {
  const P = (v) => inspect(v, { depth: null, breakLength: 1, compact: false, sorted: true });

  a = list(a);
  b = list(b);
  if (!eq(a, b)) {
    throw new assert.AssertionError({
      message: `The sequences are not equal${msg ? `: ${msg}` : '!'}`,
      actual: P(a),
      expected: P(b),
      operator: 'seqEq()',
      stackStartFn: assertSequenceEquals,
    });
  }
};

/**
* Determine the number of elements in an iterator.
* This will try using trySize(), but fall back to iterating
* over the container and counting the elements this way if necessary.
*
* ```
* const {iter,count} = require('ferrum')
*
* count([1,2,3]); // => 3; O(1)
* count(iter([1,2,3])); // => 3; O(n)
* ```
*
* See: [https://en.wikipedia.org/wiki/Big_O_notation]()
*
* @function
* @param {Sequence} a Any sequence for which iter() is defined
* @returns {Number}
*/
const count = (val) => {
  const impl = Size.lookupValue(val);
  return impl ? impl(val) : foldl(val, 0, (v) => v + 1);
};

/**
* Turns any sequence into a list.
* Shorthand for `Array.from(iter())`.
* This is often utilized to cache a sequence so it can be
* iterated over multiple times.
*
* @function
* @param {Sequence} a The sequence to convert to a list.
* @returns {Array}
*/
const list = (seq) => Array.from(iter(seq));

/**
* Turns any sequence into a set.
* Shorthand for new Set(iter()).
* This often finds practical usage as a way of
* removing duplicates elements from a sequence.
*
* ```js
* const { uniq, assertEquals, assertSequenceEquals } = require('ferrum');
*
* // Removes duplicates
* assertEquals(
*   uniq([1, 1, 2, 1, 3, 4, 3]),
*   new Set([1, 2, 3, 4]));
*
* // Since this just creates a Set and Set outputs elements
* // in order of insertion, the order of elements output by
* // uniq() is well defined
* assertSequenceEquals(
*   uniq([4, 3, 3, 4, 1, 2, 1]),
*   [4, 3, 1, 2]);
* ```
*
* @function
* @param {Sequence} seq The sequence to convert to a set.
* @returns {Set}
*/
const uniq = (seq) => new Set(iter(seq));

/**
* Turns any sequence into an es6 map
* This is particularly useful for constructing es7 maps from objects...
*
* @function
* @param {Sequence} a The sequence to convert.
* @returns {Map}
*/
const dict = (seq) => {
  const r = new Map();
  each(seq, (pair) => {
    const [key, value] = iter(pair);
    r.set(key, value);
  });
  return r;
};

/**
* Turns any sequence into an object
*
* @function
* @param {Sequence} a The sequence to convert.
* @returns {Object}
*/
const obj = (seq) => {
  const r = {};
  each(seq, (pair) => {
    const [key, value] = iter(pair);
    r[key] = value;
  });
  return r;
};

/**
* Convert each element from a sequence into a string
* and join them with the given separator.
*
* ```
* const { join, assertEquals } = require('ferrum');
* assertEquals(
*   join(['Hello', 'World'], ' '),
*   'Hello World');
* ```
*
* @function
* @param {String} sep The separator
* @param {Sequence} seq The sequence to convert.
* @returns {String}
*/
const join = curry('join', (seq, sep) => list(seq).join(sep));

/**
* Convert values into a given type using the `Into` trait.
* Note that this has inverse parameters compared to the trait
* (sequence first, type second) for currying purposes.
*
* @function
* @param {Sequence} a The sequence to convert.
* @param {Type} T
* @returns {T}
*/
const into = curry('into', (seq, t) => Into.invoke(t, seq));

/**
* Into can be used to turn sequences back into other types.
*
* into is the inverse of `iter()`, meaning that taking the result
* of `iter()` and calling `into()`, yields the original value.
*
* So in a purely functional language, `into(iter(v))` would be a
* no-op; since we are in javascript, this essentially implements
* a poor mans shallow copy for some types
*
* ```
* const shallowcopy = (v) => into(v, v.constructor);
* ```
*
* # Interface
*
* `(T: Type/Function, v: Sequence) => r: T
*
* # Laws
*
* * `into(v, type(v)) <=> shallowclone(v)`
*
* # Specialization notes
*
* String: Uses toString() on each value from the sequence
*   and concatenates them into one string...
* Object: Expects key/value pairs; the keys must be strings;
*   sequences containing the same key multiple times and sequences
*   with bad key/value pairs are considered to be undefined behaviour.
*   The key/value pairs may be sequences themselves.
* Map: Same rules as for object.
* Set: Refer to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
*
* # Examples
*
* Practical uses of into include converting between types; e.g:
*
* ```
* const { into } = require('ferrum');
*
* into({foo:  42, bar: 23}, Map) // Map { 'foo' => 42, 'bar' }
* into(["foo", " bar"], String) // "foo bar"
* into([1,1,2,3,4,2], Set) // Set(1,2,3,4)
* ```
*
* Into is also useful to transform values using the functions
* in this class:
*
* ```
* const { into, filter } = require('ferrum');
*
* // Remove odd numbers from a set
* const st = new Set([1,1,2,2,3,4,5]);
* into(filter(st, n => n % 2 === 0), Set) // Set(2,4)
*
* // Remove a key/value pair from an object
* const obj = {foo: 42, bar: 5};
* into(filter(obj, ([k, v]) => k !== 'foo'), Object)
* // yields {bar: 5}
* ```
*
* It can be even used for more complex use cases:
*
* ```
* const { concat, into } = require('ferrum');
*
* // Merge multiple key/value containers into one sequence:
* const seq = concat([[99, 42]], new Map([[true, 23]]), {bar: 13});
* into(seq, Map) // Map( 99 => 42, true => 23, bar => 13 )
* ```
*
* @interface
*/
const Into = new Trait('Into');
Into.implStatic(Array, (t, v) => list(v));
Into.implStatic(String, (t, v) => join(v, ''));
Into.implStatic(Object, (t, v) => obj(v));
each([Set, Map, WeakSet, WeakMap, ..._typedArrays], (Typ) => {
  Into.implStatic(Typ, (t, v) => new Typ(iter(v)));
});

/**
* Combine all the values from a sequence into one value.
*
* This function is also often called reduce, because it reduces
* multiple values into a single value.
*
* Here are some common use cases of the foldl function:
*
* ```
* const all = (seq) => foldl(seq, true, (a, b) => a && b);
* const any = (seq) => foldl(seq, false, (a, b) => a || b);
* const sum = (seq) => foldl(seq, 0, (a, b) => a + b);
* const product = (seq) => foldl(seq, 1, (a, b) => a * b);
* ```
*
* Notice the pattern: We basically take an operator and apply
* it until the sequence is empty: sum([1,2,3,4]) is pretty much
* equivalent to `1 + 2 + 3 + 4`.
*
* (If you want to get very mathematical here...notice how we basically
* have an operation and then just take the operation's neutral element
* as the initial value?)
*
* @function
* @param {Sequence} seq The sequence to reduce
* @param {Any} initial The initial value of the reduce operation.
*   If the sequence is empty, this value will be returned.
* @returns {Any}
*/
const foldl = curry('foldl', (seq, initial, fn) => {
  let accu = initial;
  each(seq, (v) => {
    accu = fn(accu, v);
  });
  return accu;
});

/**
* Like foldl, but right-to-left
*
* @function
* @param {Sequence} seq The sequence to reduce
* @param {Any} initial The initial value of the reduce operation.
*   If the sequence is empty, this value will be returned.
* @returns {Any}
*/
const foldr = curry('foldr', (seq, ini, fn) => foldl(reverse(seq), ini, fn));

/**
* Test whether any element in the given sequence is truthy.
* Returns null if the list is empty.
*
* @function
* @param {Sequence} seq
* @returns {Boolean}
*/
const any = (seq) => foldl(seq, null, or);

/**
* Test whether all elements in the given sequence are truthy
* Returns true if the list is empty.
*
* @function
* @param {Sequence} seq
* @returns {Boolean}
*/
const all = (seq) => foldl(seq, true, and);

/**
* Calculate the sum of a list of numbers.
* Returns 0 is the list is empty.
*
* @function
* @param {Sequence} seq
* @returns {Number}
*/
const sum = (seq) => foldl(seq, 0, plus);

/**
* Calculate the product of a list of numbers.
* Returns 1 is the list is empty.
*
* @function
* @param {Sequence} seq
* @returns {Number}
*/
const product = (seq) => foldl(seq, 1, mul);

// ITERATOR FILTERS //////////////////////////////////////////

/**
* Lazily transform all the values in a sequence.
*
* ```
* const { into, map } = require('ferrum');
* into(map([1,2,3,4], n => n*2), Array); // [2,4,6,8]
* ```
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @param {Function} fn The function that transforms all the values in the sequence
* @returns {Iterator}
*/
const map = curry('map', function* map(seq, fn) {
  for (const val of iter(seq)) {
    yield fn(val);
  }
});

/**
* Remove values from the sequence based on the given condition.
*
* ```
* const { filter, range } = require('ferrum');
* filter(range(0,10), x => x%2 === 0); // [2,4,6,8]
* ```
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @param {Function} fn The function
* @returns {Iterator}
*/
const filter = curry('filter', function* filter(seq, fn) {
  for (const val of iter(seq)) {
    if (fn(val)) {
      yield val;
    }
  }
});

/**
* Opposite of filter: Removes values from the sequence if the function
* returns true.
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @param {Function} fn The function
* @returns {Iterator}
*/
const reject = curry('reject', (seq, fn) => filter(seq, (v) => !fn(v)));

/**
* Reverse a given sequence
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @returns {Array}
*/
const reverse = (seq) => {
  const r = list(seq);
  r.reverse();
  return r;
};

/**
* Extend the given sequences with indexes:
* Takes a sequence of values and generates
* a sequence where each element is a pair [index, element];
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @returns {Iterator}
*/
function* enumerate(seq) {
  let idx = -1;
  for (const val of iter(seq)) {
    idx += 1;
    yield [idx, val];
  }
}

/**
* Like skip, but returns an exhausted iterator if the sequence contains
* less than `no` elements instead of throwing IteratorEnded.
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @param {Number} no The number of elements to skip
* @returns {Iterator}
*/
const trySkip = curry('trySkip', (seq, no) => {
  const it = iter(seq);
  each(range0(no), () => it.next());
  return it;
});

/**
* Skip elements in a sequence.
* Throws IteratorEnded if the sequence contains less than `no` elements.
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @param {Number} no The number of elements to skip
* @returns {Iterator}
*/
const skip = curry('skip', (seq, no) => {
  const it = iter(seq);
  each(range(0, no), () => next(it));
  return it;
});

/**
* Skips elements in the given sequences until one is found
* for which the predicate is false.
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @param {Function} pred
* @returns {Iterator} The first element for which pred returns false
*   plus the rest of the sequence.
*/
const skipWhile = curry('skipWhile', (seq, pred) => {
  const it = iter(seq);
  while (true) {
    const { done, value } = it.next();
    if (done) {
      return iter([]);
    } else if (!pred(value)) {
      return concat([value], it);
    }
  }
});

/**
* Yields an iterator of the first `no` elements in the given
* sequence; the resulting iterator may contain less then `no`
* elements if the input sequence was shorter than `no` elements.
*
* @function
* @alias takeShort
* @param {Sequence} seq Any sequence for which iter() is defined
* @param {Number} no The number of elements to take
* @returns {Iterator} The first element for which pred returns false
*   plus the rest of the sequence.
*/
const tryTake = curry('tryTake', (seq, no) => {
  const Nothing = Symbol('Nothing');
  const it = iter(seq);
  return pipe(
    range0(no),
    map(() => tryNext(it, Nothing)),
    takeUntilVal(Nothing),
    list,
  );
});

const takeShort = tryTake;

/**
* Version of tryTake that will throw IteratorEnded
* if the given iterable is too short.
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @param {Number} no The number of elements to take
* @throws IteratorEnded
* @returns {Array}
*/
const take = curry('take', (seq, no) => {
  const it = iter(seq);
  return list(map(range0(no), (_) => next(it)));
});

/**
* Yields an iterator of the first `no` elements in the given
* in the sequence. If the sequence is too short, the fallback
* parameter will be substituted.
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @param {Number} no The number of elements to take
* @param {Any} fallback The value to supply if the input sequence is too short
* @returns {Array} The elements taken
*/
const takeWithFallback = curry('takeWithFallback', (seq, no, fallback) => {
  const it = iter(seq);
  return list(map(range0(no), (_) => tryNext(it, fallback)));
});

/**
* Cut off the sequence at the first point where the given condition is no
* longer met.
*
* `list(takeWhile([1,2,3,4,5,6...], x => x < 4))` yields `[1,2,3]`
*
* # Version History
*
* - 2.0.0 Add alias flatten()
*
* @function
* @alias flatten
* @param {Sequence} seq Any sequence for which iter() is defined
* @param {Function} fn The predicate function
* @returns {Iterator}
*/
const takeWhile = curry('takeWhile', function* takeWhile(seq, fn) {
  const it = iter(seq);
  while (true) {
    const { done, value } = it.next();
    if (done || !fn(value)) {
      return;
    }
    yield value;
  }
});

/**
* Cut off the sequence at the first point where the given condition is met.
*
* `list(takeUntil([1,2,3,4,5,6...], x => x > 4))` yields `[1,2,3,4]`
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @param {Function} fn The predicate function
* @returns {Iterator}
*/
const takeUntil = curry('takeUntil', (seq, fn) => takeWhile(seq, (v) => !fn(v)));

/**
* Cut of the sequence at the point where the given value is
* first encountered.
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @returns {Iterator}
*/
const takeUntilVal = curry('takeUntilVal', (seq, val) => takeUntil(seq, is(val)));

/**
* Cut of the given sequence at the first undefined or null value.
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @returns {Iterator}
*/
const takeDef = (seq) => takeWhile(seq, (v) => v !== null && v !== undefined);

/**
* Flattens a sequence of sequences.
* This function is not recursive (it will just expand the second level into the first).
*
* ```
* const { into, flat } = require('ferrum');
* into(flat([[1,2], [3,4]]), Array) // [1,2,3,4]
* into(flat({foo: 42}), Array) // ["foo", 42]
* ```
*
* @function
* @param {Sequence(Sequence)} seq Any sequence for which iter() is defined
* @returns {Sequence}
*/
function* flat(seq) {
  for (const sub of iter(seq)) {
    for (const val of iter(sub)) {
      yield val;
    }
  }
}

const flatten = flat;

/**
* Concatenate any number of sequences.
* This is just a variadic alias for `flat()`
*
* @function
* @param {...Sequence} seq
* @returns {Sequence}
*/
const concat = (...args) => flat(args);

/**
* Given a sequence and a value, prepend the value to the sequence,
* yielding a new iterator.
*
* @function
* @param {Sequence} seq
* @param {Any} val
* @returns {Sequence}
*/
const prepend = curry('prepend', (seq, val) => concat([val], seq));

/**
* Given a sequence and a value, append the value to the sequence,
* yielding a new iterator.
*
* @function
* @param {Sequence} seq
* @param {Any} val
* @returns {Sequence}
*/
const append = curry('prepend', (seq, val) => concat(seq, [val]));

/**
* Sort a sequence.
* The given function must turn map each parameter to a string or
* number. Objects will be sorted based on those numbers.A
* If the given parameters are already numbers/strings, you may
* just use identity as the mapping function.
*
* @function
* @param {Sequence} seq Any sequence for which iter() is defined
* @param {Function} fn
* @returns {Array}
*/
const mapSort = curry('mapSort', (seq, fn) => {
  const v = list(map(seq, (u) => [u, fn(u)]));
  // eslint-disable-next-line no-nested-ternary
  v.sort(([_x, a], [_y, b]) => (a === b ? 0 : (a < b ? -1 : 1)));
  for (const idx of range0(size(v))) {
    v[idx] = first(v[idx]);
  }
  return v;
});

// Helper used to implement all the other zip variants
function* zipBase(seqs) {
  const seq2 = list(map(seqs, iter));
  if (empty(seq2)) {
    return;
  }
  while (true) {
    yield list(map(seq2, (s) => s.next()));
  }
}

/**
* Zip multiple sequences.
* Puts all the first values from sequences into one sublist;
* all the second values, third values and so on.
* If the sequences are of different length, the output sequence
* will be the length of the *shortest* sequence and discard all
* remaining from the longer sequences...
*
* @function
* @param {Sequence} seq A sequence of sequences
* @returns {Iterator}
*/
const zipLeast = (seqs) => pipe(
  zipBase(seqs),
  takeWhile((elms) => all(map(elms, ({ done }) => !done))),
  map(map(({ value }) => value)),
  map(list),
);

/**
* Curryable version of zipLeast
*
* @function
* @param {Sequence} a
* @param {Sequence} b
* @returns {Sequence}
*/
const zipLeast2 = curry('zipLeast2', (a, b) => zipLeast([a, b]));

/**
* Zip multiple sequences.
* Puts all the first values from sequences into one sublist;
* all the second values, third values and so on.
* If the sequences are of different length, an error will be thrown.
*
* @function
* @param {Sequence} seq A sequence of sequences
* @throws {IteratorEnded}
* @returns {Iterator}
*/
function* zip(seqs) {
  for (const elms of zipBase(seqs)) {
    const doneCnt = count(filter(elms, ({ done }) => done));
    if (doneCnt === 0) {
      yield list(map(elms, ({ value }) => value));
    } else if (doneCnt === size(elms)) {
      return;
    } else {
      throw new IteratorEnded('zip() was given sequences of different length!');
    }
  }
}

/**
* Curryable version of zip
*
* @function
* @param {Sequence} a
* @param {Sequence} b
* @throws {IteratorEnded}
* @returns {Sequence}
*/
const zip2 = curry('zip2', (a, b) => zip([a, b]));

/**
* Zip multiple sequences.
* Puts all the first values from sequences into one sublist;
* all the second values, third values and so on...
* If the sequences are of different length, the resulting iterator
* will have the length of the longest sequence; the missing values
* from the shorter sequences will be substituted with the given
* fallback value.
*
* @function
* @param {Sequence} seq A sequence of sequences
* @returns {Iterator}
*/
const zipLongest = curry('zipLongest', (seqs, fallback) => pipe(
  zipBase(seqs),
  takeWhile((elms) => any(map(elms, ({ done }) => !done))),
  map(map(({ value, done }) => (done ? fallback : value))),
  map(list),
));

/**
* Curryable version of zipLongest
*
* @function
* @param {Sequence} a
* @param {Sequence} b
* @returns {Sequence}
*/
const zipLongest2 = curry('zipLongest2', (a, b, fallback) => zipLongest([a, b], fallback));

/**
* Inserts an element between every two elements of the given sequence.
*
* ```
* const { intersperse, assertSequenceEquals } = require('ferrum');
* assertSequenceEquals(
*   intersperse('ABC', '|'),
*   ['A', '|', 'B', '|', 'C']);
* ```
*
* @function
* @param {Any} what – The element to intersperse
* @param {Sequence} a
* @returns {Sequence}
*/
const intersperse = curry('intersperse', (seq, e) => pipe(
  seq,
  map((v) => [e, v]),
  flat,
  trySkip(1),
));

/**
* Forms a sliding window on the underlying iterator.
*
* `slidingWindow([1,2,3,4,5], 3)`
* yields `[[1,2,3], [2,3,4], [3,4,5]]`
*
* Will throw IteratorEnded if the sequence is shorter than
* the given window.
*
* Returns an empty sequence if `no === 0`.
*
* @function
* @param {Sequence} seq A sequence of sequences
* @throws {IteratorEnded}
* @returns {Iterator} Iterator of lists
*/
const slidingWindow = curry('slidingWindow', (seq, no) => {
  if (no === 0) {
    return iter([]);
  }

  const it = iter(seq);
  const cache = [];
  each(range0(no), () => cache.push(next(it)));

  // By making just this part a generator we make
  // sure that an error while filling the cache
  // above is thrown early
  function* slidingWindowImpl() {
    yield list(cache);
    for (const v of it) {
      cache.shift();
      cache.push(v);
      yield list(cache);
    }
  }

  return slidingWindowImpl();
});

/**
* Like slidingWindow, but returns an empty sequence if the given
* sequence is too short.
*
* Returns an empty sequence if `no === 0`.
*
* @function
* @param {Sequence} seq A sequence of sequences
* @returns {Iterator} Iterator of lists
*/
const trySlidingWindow = curry('trySlidingWindow', function* trySlidingWindow(seq, no) {
  if (no === 0) {
    return;
  }

  const it = iter(seq);
  const cache = [];
  for (let idx = 0; idx < no; idx += 1) {
    const { value, done } = it.next();
    if (done) {
      return;
    }
    cache.push(value);
  }

  yield list(cache);
  for (const v of it) {
    cache.shift();
    cache.push(v);
    yield list(cache);
  }
});

/**
* Almost like trySlidingWindow, but makes sure that
* every element from the sequence gets it's own subarray,
* even the last element. The arrays at the end are filled
* with the filler value to make sure they have the correct
* length.
*
* ```
* const { lookahead } = require('ferrum');
* lookahead([], 3, null) // => []
* lookahead([42], 3, null) // => [[42, null, null, null]]
* lookahead([42, 23], 3, null) // => [[42, 23, null, null], [23, null, null, null]]
* lookahead([42, 23], 0, null) // => [[42], [23]]
* ```
*
* Try sliding window would yield an empty array in each of the examples
* above.
*
* Returns an empty sequence if `no === 0`.
*
* @function
* @param {Sequence} seq
* @param {Number} no Number of elements to look ahead to.
* @param {Any} filler
* @returns {Sequence<Array>}
*/
const lookahead = curry('lookahead', (seq, no, filler) => {
  const filled = concat(seq, take(repeat(filler), no));
  return trySlidingWindow(filled, no + 1);
});

/**
* Split the given input sequence into chunks of a specific length.
* The last chunk may be shorter than the given chunk size if the input
* sequence is not long enough.
*
* ```
* const { list, chunkifyShort } = require('ferrum');
* list(chunkifyShort([1,2,3,4,5], 2)); // => [[1,2], [3,4], [5]]
* ```
*
* Returns an empty sequence if `no === 0`.
*
* @function
* @param {Sequence} seq A sequence of sequences
* @param {Number} len The length of the chunk
* @returns {Iterator} Sequence of lists
*/
const chunkifyShort = curry('chunkifyShort', (seq, len) => {
  if (len === 0) {
    return iter([]);
  }

  const it = iter(seq);
  return pipe(
    repeatFn(() => takeShort(it, len)),
    takeWhile((chunk) => !empty(chunk)),
  );
});

/**
* Split the given input sequence into chunks of a specific length.
* If the length of the sequence is not divisible by the chunk length
* IteratorEnded will be thrown.
*
* ```
* const { list, chunkify } = require('ferrum');
* list(chunkify([1,2,3,4], 2)); // => [[1,2], [3,4]]
* ```
*
* Returns an empty sequence if `no === 0`.
*
* @function
* @param {Sequence} seq A sequence of sequences
* @param {Number} len The length of the chunk
* @throws {IteratorEnded}
* @returns {Iterator} Sequence of lists
*/
const chunkify = curry('chunkify', (seq, len) => pipe(
  chunkifyShort(seq, len),
  map((chunk) => {
    if (size(chunk) === len) {
      return chunk;
    } else {
      throw new IteratorEnded('chunkify() needs sequences of the correct length!');
    }
  }),
));

/**
* Split the given input sequence into chunks of a specific length.
* If the input sequence is not long enough, the last chunk will be filled
* with the given fallback value.
*
* ```
* const { list, chunkifyWithFallback } = require('ferrum');
* list(chunkifyWithFallback([1,2,3,4,5], 2, 99)); // => [[1,2], [3,4], [5, 99]]
* ```
*
* @function
* @param {Sequence} seq A sequence of sequences
* @param {Number} len The length of the chunk
* @param {Any} fallback The value to use if the input sequence is too short.
* @returns {Iterator} Sequence of lists
*/
const chunkifyWithFallback = curry('chunkifyWithFallback', (seq, len, fallback) => pipe(
  chunkifyShort(seq, len),
  map((chunk) => {
    if (size(chunk) === len) {
      return chunk;
    } else {
      return take(concat(chunk, repeat(fallback)), len);
    }
  }),
));

/**
 * Group the elements of the user defined sequence using a custom container.
 *
 * This will:
 *
 * - Calculate the key for every element in the given sequence by
 *   applying the key function
 * - Create a bucket (array) for every key calculated
 * - Insert each element into the bucket associated with
 *   it's calculated key in order
 *
 * ```js,test
 * const { group, assertEquals } = require('ferrum');
 *
 * const seq = [
 *   { foo: 42, bar: 22 },
 *   { foo: 13, bar: 22 },
 *   { foo: 42, bar: 99 },
 * ];
 *
 * // Group by foo
 * assertEquals(
 *  group(seq, ({foo}) => foo),
 *  new Map([
 *    [42, [
 *      { foo: 42, bar: 22 }, // Note that the order in here is well defined
 *      { foo: 42, bar: 99 }]],
 *    [13, [
 *      { foo: 13, bar: 22 }]]
 *  ])
 * );
 *
 * // Group by bar
 * assertEquals(
 *  group(seq, ({bar}) => bar),
 *  new Map([
 *    [22, [
 *      { foo: 42, bar: 22 },
 *      { foo: 13, bar: 22 }]],
 *    [99, [
 *      { foo: 42, bar: 99 }]]
 *  ])
 * );
 * ```
 *
 * @function
 * @sourcecode
 * @param {Sequence} seq
 * @param {Function} keyfn
 * @returns {Map} The es6 map containing the keys.
 */
const group = curry('group', (seq, keyfn) => {
  const cont = new Map();
  each(seq, (elm) => setdefault(cont, keyfn(elm), []).push(elm));
  return cont;
});

/**
* Calculate the cartesian product of the given sequences.
 *
 * ```
 * const {cartesian, list} = require('ferrum');
 *
 * list(cartesian([])); // => []
 * list(cartesian([[1,2]])); // => [[1], [2]]
 * list(cartesian([[1,2], [3,4]])); // => [[1,3], [1, 4], [2, 3], [2, 4]]
 * list(cartesian([[1,2], [3,4], [5,6]]));
 * // => [[1,3,5], [1,3,6], [1,4,5], [1,4,6],
 * //     [2,3,5], [2,3,6], [2,4,5], [2,4,6]]
 * list(cartesian([[], [3,4], [5,6]])); // => []
 * ```
 *
 * @function
 * @param {Sequence} seqs A sequence of sequences
 * @yields {Array} The cartesian product
 */
const cartesian = function* cartesian(seqs) {
  seqs = list(map(seqs, list));
  const idxv = pipe(
    repeat(0),
    take(seqs.length),
    list,
  );

  if (empty(seqs) || any(map(seqs, empty))) {
    return;
  }

  yielding: while (true) {
    // Collect all elements with their respective indices
    yield list(map(enumerate(idxv), ([x, y]) => seqs[x][y]));

    // Increment indices
    for (let x = seqs.length - 1; x >= 0; x--) {
      idxv[x] = (idxv[x] + 1) % seqs[x].length;
      if (idxv[x] > 0) {
        continue yielding;
      }
    }

    return;
  }
};

/**
 * Calculate the cartesian product of two sequences.
 *
 * ```
 * const {cartesian2, list} = require('ferrum');
 *
 * list(cartesian2([1,2], [3,4])); // => [[1,3], [1, 4], [2, 3], [2, 4]]
 * list(cartesian2([3,4])([1,2])); // => [[1,3], [1, 4], [2, 3], [2, 4]]
 * list(cartesian2([])([1,2])); // => []
 * ```
 *
 * @function
 * @param {Sequence} a
 * @param {Sequence} b
 * @yields {Array} The cartesian product
 */
const cartesian2 = curry('cartesian2', (a, b) => cartesian([a, b]));

// TRANSFORMING NON SEQUENCES ////////////////////////////////

/**
 * Modify/Transform the given value.
 *
 * Applies the given value to the given function; after the return
 * value is known, that return value is converted into the type
 * of the given parameter.
 *
 * ```
 * const assert = require('assert');
 * const { mod, map, plus } = require('ferrum');
 * const s = new Set([1,2,3,4]);
 * const z = mod(s, map(plus(1))); // => new Set([2,3,4,5]),
 * assert(z.constructor === Set)
 * ```
 *
 * @function
 * @template T Just any type
 * @param {T} v The value to transform
 * @param {Function} fn The transformation function
 * @returns {T}
 */
const mod = curry('mod', (v, fn) => into(type(v))(fn(v)));

/**
 * Combine multiple map/set like objects.
 *
 * The return type is always the type of the first value.
 * Internally this just concatenates the values from all
 * parameters and then uses into to convert the values back
 * to the original type.
 *
 * `union({a: 42, b: 23}, new Map([['b', 99]]))` => `{a: 42, b: 99}`
 * `union(new Set(1,2,3,4), [4,6,99])` => `new Set([1,2,3,4,6,99])`AA
 *
 * Takes any number of values to combine.
 *
 * @function
 * @template T
 * @param {T} fst
 * @param {...Any} args
 * @returns {T}
 */
const union = (fst, ...args) => into(type(fst))(concat(fst, ...args));

/**
 * Curryable version of union
 *
 * @function
 * @template T
 * @param {T} a
 * @param {Any} b
 * @returns {T}
 */
const union2 = curry('union2', (a, b) => union(a, b));

module.exports = {
  iter,
  range,
  range0,
  repeatFn,
  repeat,
  extend,
  extend1,
  flattenTree,
  IteratorEnded,
  next,
  tryNext,
  nth,
  first,
  second,
  last,
  tryNth,
  tryFirst,
  trySecond,
  tryLast,
  seqEq,
  assertSequenceEquals,
  each,
  find,
  tryFind,
  contains,
  count,
  list,
  uniq,
  join,
  dict,
  obj,
  into,
  Into, // TODO ADD TESTS FOR FIX
  foldl,
  foldr,
  any,
  all,
  sum,
  product,
  map,
  filter,
  reject,
  reverse,
  enumerate,
  trySkip,
  skip,
  skipWhile,
  tryTake,
  takeShort,
  take,
  takeWithFallback,
  takeWhile,
  takeUntil,
  takeUntilVal,
  takeDef,
  flat,
  flatten,
  concat,
  prepend,
  append,
  mapSort,
  zipLeast,
  zip,
  zipLongest,
  zipLeast2,
  zip2,
  zipLongest2,
  intersperse,
  slidingWindow,
  trySlidingWindow,
  lookahead,
  chunkifyShort,
  chunkify,
  chunkifyWithFallback,
  group,
  cartesian,
  cartesian2,
  mod,
  union,
  union2,
  Sequence,
};
