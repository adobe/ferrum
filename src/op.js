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
 * ```
 * const {and} = require('ferrum');
 *
 * and("", true) // => ""
 * and(true, 42) // => 42
 *
 * and(true)("") // => ""
 * and(42)(true) // => 42
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
 * ```
 * const {or} = require('ferrum');
 *
 * or(42, false) // => 42
 * or(true, 5) // => 5
 *
 * or(false)(42) // => 42
 * or(5)(true) // => 5
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
 * ```
 * const {not} = require('ferrum');
 *
 * not(42); // => false
 * not(null); // => true
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
 * ```
 * const {nand} = require('ferrum');
 *
 * nand(true, 42) // => false
 * nand(null, false) // => true
 * nand(true, false) // => true
 *
 * nand(true)(42) // => false
 * nand(null)(false) // => true
 * nand(true)(false) // => true
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
 * ```
 * const {nor} = require('ferrum');
 *
 * nor(true, true) // => false
 * nor(false, true) // => false
 * nor(false, false) // => true
 *
 * nor(true)(true) // => false
 * nor(false)(true) // => false
 * nor(false)(false) // => true
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
 * ```
 * const {xor} = require('ferrum');
 *
 * xor(true, true) // => false
 * xor(false, true) // => true
 * xor(true, false) // => true
 * xor(false, false) // => false
 *
 * xor(true)(true) // => false
 * xor(false)(true) // => true
 * xor(true)(false) // => true
 * xor(false)(false) // => false
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
 * ```
 * const {xnor} = require('ferrum');
 *
 * xnor(true, true) // => true
 * xnor(false, true) // => false
 * xnor(true, false) // => false
 * xnor(false, false) // => true
 *
 * xnor(true)(true) // => true
 * xnor(false)(true) // => false
 * xnor(true)(false) // => false
 * xnor(false)(false) // => true
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
 * ```
 * const {is, count, filter, pipe} = require('ferrum');
 *
 * is(42, 42) // => true
 * is(42, "") // => false
 * is({}, {}) // => false (Can only successfully compare primitives)
 *
 * is(42)(42) // => true
 * is(42)("") // => false
 * is({})({}) // => false (Can only successfully compare primitives)
 *
 * // Count how many times the value `42` occurs in the list
 * const cnt = pipe(
 *   [42, 23, 1, 4, 17, 22, 42],
 *   filter(is(42)),
 *   count
 * );
 * assert(cnt == 42);
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
 * ```
 * const {aint, list, filter, pipe} = require('ferrum');
 *
 * aint(42, 42) // => false
 * aint(42, "") // => true
 * aint({}, {}) // => true (Can only successfully compare primitives)
 *
 * aint(42)(42) // => false
 * aint(42)("") // => true
 * aint({})({}) // => false (Can only successfully compare primitives)
 *
 * // Remove the value 42 from the list
 * pipe(
 *   [1,2,3,4,42,5,24],
 *   filter(aint(42)),
 *   list;
 * )
 * // => [1,2,3,4,5]
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
 * ```
 * const {plus, list, map, pipe} = require('ferrum');
 *
 * plus(3, 4) // => 7
 * plus(3, -4) // => -1; Can also be used for subtraction
 * plus("foo", "bar") // => "foobar"
 *
 * plus(3)(4) // => 7
 * plus(3)(-4) // => -1; Can also be used for subtraction
 * plus("bar")("foo") // => "foobar"
 *
 * // Subtract one from each element in the list
 * pipe(
 *   [1,2,3,4,5],
 *   plus(-1),
 *   list
 * );
 * // => [0,1,2,3,4]
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
 * ```
 * const {mul, list, map, pipe} = require('ferrum');
 *
 * mul(3, 4) // => 12
 * mul(3, 1/10) // => -1; Can also be used for s
 *
 * plus(3)(4) // => 7
 * plus(3)(-4) // => -1; Can also be used for subtraction
 *
 * // Divide each element in the list by ten
 * pipe(
 *   [1,2,3,4,5],
 *   map(div(1/10)),
 *   list
 * );
 * // [0.1, 0.2, 0.3, 0.4, 0.5]
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
