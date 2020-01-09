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
 * ```
 * const {exec} = require('ferrum');
 *
 * // Normal scopes cannot return values
 * let r;
 * {
 *   let x = 42, y = 5;
 *   r = x + y;
 * }
 *
 * // Can be rewritten as
 * const q = exec(() => {
 *   let x = 42, y = 5;
 *   return  x + y;
 * });
 * ```
 */
const exec = (fn) => fn();

/**
 * Just a function that returns it's argument!
 *
 * ```
 * const {identity, list, filter, pipe} = require('ferrum');
 *
 * identity(null); // => null
 * identity(42); // => 42
 *
 * // Identity is sometimes useful in higher order functions like
 * // filter(); this example for instance removes all values from
 * // the list that are falsy
 * pipe(
 *   [null, "asd", "", "foo"],
 *   filter(identity),
 *   list
 * );
 * // => ["asd", "foo"]
 * ```
 */
const identity = (a) => a;

/**
 * Pipeline a value through multiple function calls.
 *
 * ```
 * const { pipe, filter, uniq, map, plus, identity } = require('ferrum');
 *
 * // Sometimes you get very nested function invocations:
 *
 * pipe(
 *   [1,2,null,3,4,null,5,1,3,2,null,1,4],
 *   filter(identity),
 *   uniq,
 *   map(plus(2)),
 * )
 * console.log(pipe(
 *   4,
 *   (x) => x+2,
 *   (x) => x*3
 * ));
 * // => 18
 * ```
 *
 * @param {Any} val The value to pipe through the functions
 * @param {Function} fns Multiple functions
 * @returns {Any}
 */
const pipe = (val, ...fns) => fns.reduce((v, fn) => fn(v), val);

/**
 * Function composition.
 *
 * This essentially behaves like `pipe()` without taking the initial argument:
 * executed left-to-right/top-to-bottom.
 *
 * ```
 * const {compose} = require('ferrum');
 *
 * const fn = compose(
 *   (x) => x+2,
 *   (x) => x*3,
 *   (x) => `My Number ${x}`
 * );
 *
 * console.log(fn(4)); // => "My Number 18"
 * ```
 *
 * @param {Function} fns Multiple functions
 * @returns {Function} All the functions in the sequence composed into one
 */
const compose = (...fns) => (val) => pipe(val, ...fns);

/**
 * Manually assign a name to a function.
 * @param {String} name The new name of the function.
 * @param {Function} fn The function to assign a name to
 * @returns {Function} Just returns `fn` again.
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
 * ```
 * const { map } = require('ferrum');
 *
 * const toNumber = (seq) => map(seq, n => Number(n));
 *
 * // is the same as
 *
 * const toNumber2 = map(n => Number(n));
 *
 * // or even
 *
 * const toNumber3 = map(Number);
 * ```
 *
 * Note how in the second version we specified the last parameter
 * first due to currying.
 *
 * Reverse order only applies in separate invocations:
 *
 * ```
 * const { foldl, plus } = require('ferrum');
 *
 * const sum = (seq) => foldl(seq, 0, (a, b) => a+b);
 *
 * // is the same as
 *
 * const sum2 = foldl(0, (a, b) => a+b);
 *
 * // or even
 *
 * const sum3 = foldl(0, plus);
 * ```
 *
 * Note how in version two, we specify the parameters in order 2, 3, and then 1:
 *
 * `fn(a, b, c) <=> fn(c)(b)(a) <=> fn(b, c)(a)`
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

const apply = curry('apply', (args, fn) => fn(...args));

/* eslint-disable-next-line */ // (using the comma operator here)
const mutate = curry('mutate', (v, fn) => (fn(v), v));

module.exports = {
  exec, identity, pipe, compose, withFunctionName, curry, apply, mutate,
};
