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
 * @module typesafe
 * @description Helpers for working with types; specifically designed
 * to allow null/undefined to be treated the same as any other value.
 */
const { curry } = require('./functional');

/**
 * Checks whether a value is null or undefined
 *
 * ```js
 * const assert = require('assert');
 * const { isdef } = require('ferrum');
 *
 * assert(isdef(0));
 * assert(isdef(false));
 * assert(!isdef(null));
 * assert(!isdef(undefined));
 * ```
 *
 * This function considers all values that are not null
 * and not undefined to be defined.
 *
 * @function
 * @template T
 * @param {T} v
 * @returns {Boolean}
 */
const isdef = (v) => v !== undefined && v !== null;

/**
 * Apply the given function to the value only if the value is defined
 * (not null or undefined).
 *
 * This basically implements Optional semantics using null/undefined.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { assertSequenceEquals, plus,  isdef, ifdef, map } = require('ferrum');
 *
 * const o = {
 *   foo: 42
 * };
 *
 * assertIs(ifdef(o['foo'], plus(2)), 44);
 * assertIs(ifdef(o['bar'], plus(2)), undefined);
 *
 * // This is particularly useful for map or curry
 * assertSequenceEquals(
 *   map([1, 2, null, 3], ifdef(x => x*3)),
 *   [3,6,null,9]);
 *
 * // Without ifdef the pipe above would have to be manually written,
 * // which is a bit harder to read
 * assertSequenceEquals(
 *   map([1, 2, null, 3], (x) => isdef(x) ? x*3 : x),
 *   [3, 6, null, 9]);
 * ```
 *
 * @function
 * @param {T} v
 * @param {Function} fn
 * @returns null | undefined | typeof(fn())
 */
const ifdef = curry('ifdef', (v, fn) => (isdef(v) ? fn(v) : v));

/**
 * Determine type of an object.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { type } = require('ferrum');
 *
 * class Bar {};
 *
 * assertIs(type(null),           null);
 * assertIs(type(undefined),      undefined);
 * assertIs(type({}),             Object);
 * assertIs(type(42),             Number);
 * assertIs(type(new Number(42)), Number);
 * assertIs(type(new Bar()),      Bar);
 *
 * // The usual strategy to get the type is this
 * assertIs(new Bar().constructor, Bar);
 *
 * // Which fails for null and undefined...
 * //null.constructor
 * // Thrown:
 * // TypeError: Cannot read property 'constructor' of null
 * ```
 *
 * Like obj.constructor, but won't fail for null/undefined and just
 * returns the value itself for those.
 * This is a useful feature for code that is supposed to be
 * null/undefined-safe since those need not be special cased.
 *
 * @function
 * @template T
 * @param {T} v
 * @returns {Function|null|undefined} The type of the given parameter
 */
const type = (v) => (isdef(v) ? v.constructor : v);

/**
 * Given a type, determine it's name.
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { type, typename } = require('ferrum');
 *
 * class Bar {};
 *
 * assertIs(typename(null),            "null");
 * assertIs(typename(undefined),       "undefined");
 * assertIs(typename(type(null)),      "null");
 * assertIs(typename(type(undefined)), "undefined");
 * assertIs(typename(type({})),        "Object");
 * assertIs(typename(type(42)),        "Number");
 * assertIs(typename(Bar),             "Bar");
 *
 * // The usual strategy to get the name of a value's type is this
 * assertIs(new Bar().constructor.name, "Bar");
 *
 * // But this obviously fails for null & undefined
 * //null.constructor.name
 * //null.name // still throws
 * ```
 *
 * This is useful as a replacement for val.constructor.name,
 * since this can deal with null and undefined.
 *
 * @function
 * @param {Function|null|undefined} The type to get the name of
 * @returns {String}
 */
const typename = (t) => (isdef(t) ? t.name : `${t}`);

/**
 * Test if a value is primitive
 *
 * ```js
 * const { strictEqual: assertIs } = require('assert');
 * const { isPrimitive } = require('ferrum');
 *
 * assertIs(isPrimitive(null),      true);
 * assertIs(isPrimitive(undefined), true);
 * assertIs(isPrimitive(true),      true);
 * assertIs(isPrimitive(false),     true);
 * assertIs(isPrimitive(Symbol()),  true);
 * assertIs(isPrimitive(""),        true);
 * assertIs(isPrimitive(42),        true);
 * assertIs(isPrimitive({}),        false);
 * assertIs(isPrimitive(new Number(42)), false);
 * ```
 *
 * @function
 * @template T
 * @param {T} v
 * @returns {Boolean}
 */
const isPrimitive = (v) => v !== Object(v);

module.exports = {
  isdef, ifdef, type, typename, isPrimitive,
};
