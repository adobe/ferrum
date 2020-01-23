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

/**
 * @module functional
 * @description Generic library for functional programming & working with functions.
 */

/**
 * Immediately execute the given function.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const {exec} = require('ferrum');
 *
 * // Normal scopes cannot return values
 * let r;
 * {
 *   let x = 42, y = 5;
 *   r = x + y;
 * }
 * assertIs(r, 47);;
 *
 * // Can be rewritten as
 * const q = exec(() => {
 *   let x = 42, y = 5;
 *   return  x + y;
 * });
 * assertIs(q, 47);;
 * ```
 *
 * @function
 * @param {Function} fn
 * @returns Whatever the given function returns.
 */
const exec = (fn) => fn();

/**
 * Just a function that returns it's argument!
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { assertSequenceEquals, identity, filter } = require('ferrum');
 *
 * assertIs(identity(null), null);
 * assertIs(identity(42),   42);
 *
 * // Identity is sometimes useful in higher order functions like
 * // filter(); this example for instance removes all values from
 * // the list that are falsy
 * assertSequenceEquals(
 *   filter([null, "asd", "", 42], identity),
 *   ["asd", 42]);
 * ```
 *
 * @function
 * @template T
 * @param T {a}
 * @returns {T} The parameter
 */
const identity = (a) => a;

/**
 * Pipeline a value through multiple function calls.
 *
 * ```js
 * const { assertSequenceEquals, pipe, filter, uniq, map, plus, identity } = require('ferrum');
 *
 * // Sometimes you want to use a lot of sequence transformations;
 * // When you nest them this gets very hard to read
 * assertSequenceEquals(
 *   map(
 *     uniq(
 *       filter(
 *         [1, 2, null, 3, 4, null, 5, 1, 3, 2, null, 1, 4],
 *         identity
 *       )
 *     ),
 *     plus(2)),
 *   [3, 4, 5, 6, 7]);
 *
 * // Pipe lets you reformat this complex, nested expression so that
 * // the transformer that is first applied, is mentioned first in the
 * // pipeline. Note that currying is used to make functions like filter
 * // or map work nicely with pipe
 * assertSequenceEquals(
 *   pipe(
 *     [1, 2, null, 3, 4, null, 5, 1, 3, 2, null, 1, 4],
 *     filter(identity),
 *     uniq,
 *     map(plus(2))),
 *   [3, 4, 5, 6, 7]);
 * ```
 *
 * @function
 * @param {*} val The value to pipe through the functions
 * @param {Function} fns Multiple functions
 * @returns {*}
 */
const pipe = (val, ...fns) => fns.reduce((v, fn) => fn(v), val);

/**
 * Function composition.
 *
 * This essentially behaves like `pipe()` without taking the initial argument:
 * executed left-to-right/top-to-bottom.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { compose, plus, mul } = require('ferrum');
 *
 * const fn = compose(plus(2), mul(3), x => `My Number ${x}`);
 * assertIs(fn(4), 'My Number 18');
 * ```
 *
 * @function
 * @param {Function} fns Multiple functions
 * @returns {Function} All the functions in the sequence composed into one
 */
const compose = (...fns) => (val) => pipe(val, ...fns);

/**
 * Manually assign a name to a function.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { withFunctionName } = require('ferrum');
 *
 * const fn = () => {};
 * assertIs(fn.name, 'fn');
 *
 * const alias = withFunctionName('foo', fn)
 * assertIs(fn.name, 'foo');
 * assertIs(alias.name, 'foo');
 * ```
 *
 * @function
 * @param {String} name The new name of the function.
 * @param {Function} fn The function to assign a name to
 * @returns {Function} The function
 */
const withFunctionName = (name, fn) => {
  Object.defineProperty(fn, 'name', { value: name });
  return fn;
};

/**
 * Autocurry a function!
 *
 * https://en.wikipedia.org/wiki/Currying
 *
 * Any function that has a fixed number of parameters may be curried!
 * Curried parameters will be in reverse order. This is useful for
 * functional programming, because it allows us to use function parameters
 * in the suffix position when using no curring:
 *
 * ```js
 * const { strictEqual: assertIs, throws: assertThrows } = require('assert');
 * const { assertSequenceEquals, iter, curry } = require('ferrum');
 *
 * // Declare a curried function
 * const fmt = curry('fmt', (a, b) => `${a} | ${b}`);
 * assertIs(fmt.name, 'fmt [CURRY]');
 *
 * // Now you derive a secondary function like this:
 * const fmtZ = fmt('Z');
 *
 * // And finally use it. Notice how the parameters are
 * // applied in reverse order?
 * assertIs(fmtZ('Y'), 'Y | Z');
 *
 * // Reverse order is not applied when we specify multiple arguments.
 * // In this example, arguments are applied in the order you would
 * // normally expect.
 * assertIs(fmt(1, 2), '1 | 2');
 *
 * // This property is useful for functions like the iterator map function…
 * const map = curry('map', function* (seq, fn) {
 *   for (const v of iter(seq)) {
 *     yield fn(v);
 *   }
 * });
 * assertIs(map.name, 'map [CURRY]');
 *
 * // We can curry map with the function, as you would expect
 * const addOneToEach = map(x => x+1);
 * assertSequenceEquals(
 *   addOneToEach([1,2,3]),
 *   [2, 3, 4]);
 *
 * // We can use the map function either at once, with the function in the prefix
 * // position. This is a lot more convenient than having the function as the first
 * // argument, especially for functions that span multiple lines.
 * assertSequenceEquals(
 *   map([1, 2, 3], (x) => x+1),
 *   [2, 3, 4]);
 *
 * // When a function has multiple parameters this rule is pretty much the same,
 * // arguments applied together in normal order, arguments applied in separate
 * // steps are in reverse order. This keeps the function as the last parameter
 * // in most cases.
 * const foldl = curry('foldl', (seq, init, fn) => {
 *   let r = init;
 *   for (const v of iter(seq)) {
 *     r = fn(r, v);
 *   }
 *   return r;
 * });
 * assertIs(foldl.name, 'foldl [CURRY]');
 *
 * // Applies init, fn
 * const sum = foldl(0, (a, b) => a+b);
 *
 * // Finally applies the sequence
 * assertIs(sum([1, 2, 3]), 6);
 *
 * // Curried functions will throw when invoked with the wrong number
 * // of arguments
 * assertThrows(() => sum(1, 2, 3));
 * ```
 *
 * @function
 * @param {String} name The name to given to the function
 * @param {Function} fn The function to curry
 * @returns {Function} The curryable function!
 */
const curry = (name, fn) => curry.impl(name, fn, fn.length, []);
curry.impl = (name, fn, arity, got) => withFunctionName(`${name} [CURRY]`, (...args) => {
  args.push(...got);
  if (args.length === arity) {
    return fn(...args);
  } else if (args.length < arity) {
    return curry.impl(name, fn, arity, args);
  } else {
    throw new Error(`Too many arguments passed to ${name}; `
                    + `got ${args.length}; expected ${arity}`);
  }
});

/**
 * Apply a list of arguments to a function.
 *
 * This is very similar to [Function.prototype.apply()](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Function/Apply),
 * or the [spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax).
 *
 * What makes this function special is that it is curried, so it can actually
 * be used to transform a function taking multiple arguments into on taking a
 * single array.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { plus, apply, zip2, assertSequenceEquals, map } = require('ferrum');
 *
 * // Usage like the spread operator (you should probably just use
 * // the spread operator...)
 * const args = [5, 6];
 * assertIs(plus(...args),     11);
 * assertIs(apply(args, plus), 11);
 *
 * // Here is an example of how to use apply to transform a function into
 * // one that takes it's arguments as a list…e.g. to cleverly implement
 * // a function that can sum to vectors
 * const sumVec = (a, b) => map(zip2(a, b), apply(plus));
 * assertSequenceEquals(
 *   sumVec([2, 4, 6], [3, 6, 9]),
 *   [5, 10, 15]);
 *
 * // This could also be written with the usual spread operator
 * const sumVec2 = (a, b) => map(zip2(a, b), (pair) => plus(...pair));
 * assertSequenceEquals(
 *   sumVec2([2, 4, 6], [3, 6, 9]),
 *   [5, 10, 15]);
 * ```
 *
 * @function
 * @param {Array} args
 * @param {Function} fn The function to apply to
 * @returns {*} Whatever the function returns
 */
const apply = curry('apply', (args, fn) => fn(...args));

/**
 * This is a simple wrapper that allows you to mutate a value and
 * return hat value..
 *
 * ```js
 * const { mutate, del, assertEquals, compose, pipe, isdef } = require('ferrum');
 *
 * // Del is a function that – by design – mutates its value instead
 * // of transforming it without returning the original value.
 * // If you still need to use it like an expression (i.e. returning a
 * // value for some reason) you can use mutate.
 * assertEquals(
 *   mutate({ foo: 42, bar: 11 }, del('foo')),
 *   { bar: 11 });
 *
 * // The example above would probably have better been implemented using
 * // a variable instead of mutate, but using mutate can be beneficial
 * // to avoid breaking up pipe() based functions – especially if they are less
 * // contrived than this example
 * const mutObject = (o) => pipe(
 *   o,
 *   mutate((v) => {
 *     v.bar = isdef(v.foo) ? v.foo*2 : 42;
 *   }),
 *   mutate(del('foo')));
 * assertEquals(mutObject({}),          { bar: 42 });
 * assertEquals(mutObject({ foo: 11 }), { bar: 22 })
 * ```
 *
 * @function
 * @template T
 * @param {T} v The value to mutate
 * @param {Function} fn The mutator function
 * @returns {T} Just returns the parameter v
 */
/* eslint-disable-next-line */ // (using the comma operator here)
const mutate = curry('mutate', (v, fn) => (fn(v), v));

module.exports = {
  exec, identity, pipe, compose, withFunctionName, curry, apply, mutate,
};
