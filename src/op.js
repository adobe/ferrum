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
 * @module op
 * @description Provides common javascript operators as curryable functions.
 */

/** Curryable operators as functions. */

const { curry } = require('./functional');

// Boolean/selection operators ------------

/**
 * The `&&` operator as a function.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { and } = require('ferrum');
 *
 * assertIs(and("",   true),   "");
 * assertIs(and(true)(""),     "");
 * assertIs(and(true, 42),     42);
 * assertIs(and(42)(true),     42);
 * ```
 *
 * @function
 * @template A
 * @template B
 * @param {A} a
 * @param {B} b
 * @returns {A|B}
 */
const and = curry('and', (a, b) => a && b);

/**
 * The `||` operator as a function
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { or } = require('ferrum');
 *
 * assertIs(or(42, false), 42);
 * assertIs(or(false)(42), 42);
 * assertIs(or(5, true),   5);
 * assertIs(or(true)(5),   5);
 * ```
 *
 * @function
 * @template A
 * @template B
 * @param {A} a
 * @param {B} b
 * @returns {A|B}
 */
const or = curry('or', (a, b) => a || b);

// Pure boolean operators -----------------

/**
 * The `!` as a function
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { not } = require('ferrum');
 *
 * assertIs(not(42),   false);
 * assertIs(not(null), true);
 * ```
 *
 * @function
 * @template A
 * @param {A} a
 * @returns {Boolean}
 */
const not = (a) => !a;

/**
 * NAND as a function.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { nand } = require('ferrum');
 *
 * assertIs(nand(true, 42),    false);
 * assertIs(nand(true)(42),    false);
 * assertIs(nand(null, false), true);
 * assertIs(nand(null)(false), true);
 * assertIs(nand(true, false), true);
 * assertIs(nand(true)(false), true);
 * ```
 *
 * @function
 * @template A
 * @template B
 * @param {A} a
 * @param {B} b
 * @returns {Boolean}
 */
const nand = curry('nand', (a, b) => !(a && b));

/**
 * NOR as a function.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { nor } = require('ferrum');
 *
 * assertIs(nor(true, true),   false);
 * assertIs(nor(true)(true),   false);
 * assertIs(nor(false, true),  false);
 * assertIs(nor(false)(true),  false);
 * assertIs(nor(false, false), true);
 * assertIs(nor(false)(false), true);
 * ```
 *
 * @function
 * @template A
 * @template B
 * @param {A} a
 * @param {B} b
 * @returns {Boolean}
 */
const nor = curry('nor', (a, b) => !(a || b));

/**
 * XOR as a function.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { xor } = require('ferrum');
 *
 * assertIs(xor(true, true),   false);
 * assertIs(xor(true)(true),   false);
 * assertIs(xor(false, false), false);
 * assertIs(xor(false)(false), false);
 * assertIs(xor(false, true),  true);
 * assertIs(xor(true)(false),  true);
 * assertIs(xor(true, false),  true);
 * assertIs(xor(false)(true),  true);
 * ```
 *
 * @function
 * @template A
 * @template B
 * @param {A} a
 * @param {B} b
 * @returns {Boolean}
 */
const xor = curry('xor', (a, b) => Boolean(a) !== Boolean(b));

/**
 * XNOR as a function.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { xnor } = require('ferrum');
 *
 * assertIs(xnor(true, true),   true);
 * assertIs(xnor(true)(true),   true);
 * assertIs(xnor(false, false), true);
 * assertIs(xnor(false)(false), true);
 * assertIs(xnor(false, true),  false);
 * assertIs(xnor(true)(false),  false);
 * assertIs(xnor(true, false),  false);
 * assertIs(xnor(false)(true),  false);
 * ```
 *
 * @function
 * @template A
 * @template B
 * @param {A} a
 * @param {B} b
 * @returns {Boolean}
 */
const xnor = curry('xnor', (a, b) => Boolean(a) === Boolean(b));

// Comparison operators -------------------

/**
 * `===` as a function
 *
 * See [eq()](./module-stdtraits.html#~eq) for a content aware comparison function.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const {is, count, filter, pipe} = require('ferrum');
 *
 * assertIs(is(42, 42), true);
 * assertIs(is(42)(42), true);
 * assertIs(is(42, ""), false);
 * assertIs(is(42)(""), false);
 * assertIs(is({}, {}), false); // Can only successfully compare primitives
 * assertIs(is({})({}), false);
 *
 * // Count how many times the value `42` occurs in the list
 * const cnt = pipe(
 *   [42, 23, 1, 4, 17, 22, 42],
 *   filter(is(42)),
 *   count);
 * assertIs(cnt, 2);
 * ```
 *
 * @function
 * @template A
 * @template B
 * @param {A} a
 * @param {B} b
 * @returns {Boolean}
 */
const is = curry('is', (a, b) => a === b);

/**
 * `!==` as a function
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { assertSequenceEquals, aint, filter, pipe } = require('ferrum');
 *
 * assertIs(aint(42, 42), false);
 * assertIs(aint(42)(42), false);
 * assertIs(aint(42, ""), true);
 * assertIs(aint(42)(""), true);
 * assertIs(aint({}, {}), true); // Can only successfully compare primitives
 * assertIs(aint({})({}), true);
 *
 * // Remove the value 42 from the list
 * assertSequenceEquals(
 *   filter([1,2,3,4,42,5,24], aint(42)),
 *   [1,2,3,4,5,24]);
 * ```
 *
 * @function
 * @template A
 * @template B
 * @param {A} a
 * @param {B} b
 * @returns {Boolean}
 */
const aint = curry('aint', (a, b) => a !== b);

// Math operators -------------------------

/**
 * The `+` operator as a function:
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { assertSequenceEquals, plus, list, map, pipe } = require('ferrum');
 *
 * assertIs(plus(3, 4), 7);
 * assertIs(plus(3)(4), 7);
 * assertIs(plus(3, -4), -1); // Can also be used for subtraction
 * assertIs(plus(3)(-4), -1);
 * assertIs(plus("foo", "bar"), "foobar");
 * assertIs(plus("bar")("foo"), "foobar");
 *
 * // Subtract one from each element in the list
 * assertSequenceEquals(
 *   map([1, 2, 3, 4, 5], plus(-1)),
 *   [0, 1, 2, 3, 4]);
 * ```
 *
 * NOTE: There is no subtract function, if you need subtraction just
 * negate the value to subtract with the  operator please: `const minus = (a, b) => plus(a, -b)`
 *
 * @function
 * @param {Number|String} a
 * @param {Number|String} b
 * @returns {Number|String}
 */
const plus = curry('plus', (a, b) => a + b);

/**
 * The `*` operator as a function:
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { assertSequenceEquals, mul, map } = require('ferrum');
 *
 * assertIs(mul(3, 4), 12)
 * assertIs(mul(4)(3), 12);
 * assertIs(mul(10, 1/2), 5); // Can also be used for division
 * assertIs(mul(1/2)(10), 5);
 *
 * // Divide each element in the list by two
 * assertSequenceEquals(
 *   map([2, 4, 6, 8], mul(1/2)),
 *   [1, 2, 3, 4]);
 * ```
 *
 * NOTE: There is no division function, if you need division just
 * do this: `const div = (a, b) => mul(a, 1/b)`;
 *
 * @function
 * @param {Number} a
 * @param {Number} b
 * @returns {Number}
 */
const mul = curry('mul', (a, b) => a * b);

module.exports = {
  and, or, not, nand, nor, xor, xnor, is, aint, plus, mul,
};
