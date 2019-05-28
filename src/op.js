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

/** Curryable operators as functions. */

const { curry } = require('./functional.js');

// Boolean/selection operators ------------

/** The && operator as a function */
const and = curry('and', (a, b) => a && b);
/** The|| operator as a function */
const or = curry('or', (a, b) => a || b);

// Pure boolean operators -----------------

/** ! as a function */
const not = a => !a;

/**
 * NAND as a function.
 * @returns {Boolean}
 */
const nand = curry('nand', (a, b) => !(a && b));
/**
 * NOR as a function.
 * @returns {Boolean}
 */
const nor = curry('nor', (a, b) => !(a || b));
/**
 * XOR as a function.
 * @returns {Boolean}
 */
const xor = curry('xor', (a, b) => Boolean(a) !== Boolean(b));
/**
 * XNOR as a function.
 * @returns {Boolean}
 */
const xnor = curry('xnor', (a, b) => Boolean(a) === Boolean(b));

// Comparison operators -------------------

/** === as a function */
const is = curry('is', (a, b) => a === b);
/** !== as a function */
const aint = curry('aint', (a, b) => a !== b);

// Math operators -------------------------

/** The + operator as a function */
const plus = curry('plus', (a, b) => a + b);
/** The * operator as a function */
const mul = curry('mul', (a, b) => a * b);

module.exports = {
  and, or, not, nand, nor, xor, xnor, is, aint, plus, mul,
};
