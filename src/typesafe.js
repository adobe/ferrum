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
 * ```
 * const {isdef} = require('ferrum');
 *
 * isdef(null) # => false
 * isdef(undefined) # => false
 * isdef(0) # => true
 * isdef(false) # => true
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
const isdef = v => v !== undefined && v !== null;

/**
 * Apply the given function to the value only if the value is defined
 * (not null or undefined).
 *
 * This basically implements Optional semantics using null/undefined.
 *
 * ```
 * const {plus, pipe, isdef, ifdef} = require('ferrum');
 *
 * const o = {
 *   foo: 42
 * };
 *
 * ifdef(o['foo'], plus(2)); // 44
 * ifdef(o['bar'], plus(2)); // undefined
 *
 * // This is particularly useful for map or curry
 * pipe(
 *   [1,2,null,3],
 *   map(ifdef(x => x*3))
 *   list);
 * // yields [3,6,null,9]
 *
 * // Without ifdef the pipe above would have to be manually written,
 * // which is a bit harder to read
 * pipe(
 *   [1,2,null,3],
 *   map(x => isdef(x) ? x : x*3)
 *   list);
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
 * ```
 * const {type} = require('ferrum');a
 *
 * class Bar {};
 *
 * type(null) # => null
 * type(undefined) # => undefined
 * type(42) # => Number
 * type(new Number(42)) # => Number
 * type(new Bar()) # => Bar
 *
 * // The usual strategy to get the type is this
 * new Bar().constructor
 *
 * // Which fails for null and undefined...
 * null.constructor
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
const type = v => (isdef(v) ? v.constructor : v);

/**
 * Given a type, determine it's name.
 *
 * ```
 * const {type, typename} = require('ferrum');
 *
 * class Bar {};
 *
 * typename(type(null)) # => "null"
 * typename(type(undefined)) # => "undefined"
 * typename(type(42)) # => "Number"
 * typename(Bar) # => "Bar"
 *
 * // The usual strategy to get the name of a value's type is this
 * new Bar().constructor.name
 *
 * // But this obviously fails for null & undefined
 * null.constructor.name
 * null.name // still throws
 * ```
 *
 * This is useful as a replacement for val.constructor.name,
 * since this can deal with null and undefined.
 *
 * @function
 * @param {Function|null|undefined} The type to get the name of
 * @returns {String}
 */
const typename = t => (isdef(t) ? t.name : `${t}`);

/**
 * Test if a value is primitive
 *
 * ```
 * const {isPrimitive} = require('ferrum');
 *
 * isPrimitive(null) # => true
 * isPrimitive(undefined) # => true
 * isPrimitive(42) # => true
 * isPrimitive({}) # => false
 * isPrimitive(new Number(42)) # => false
 * ```
 *
 * @function
 * @template T
 * @param {T} v
 * @returns {Boolean}
 */
const isPrimitive = v => v !== Object(v);

module.exports = {
  isdef, ifdef, type, typename, isPrimitive,
};
