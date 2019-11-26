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

const assert = require('assert');
const { curry, withFunctionName } = require('./functional');

const { assign } = Object;

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

/**
 * Instantiate a class bypassing it's constructor.
 *
 * [createFrom()](module-typesafe.html#~createFrom) contains a
 * more detailed discussion of why you would want to use this.
 *
 * ```js
 * const assert = require('assert');
 * const { create, type } = require('ferrum');
 *
 * class Foo {
 *   constructor() {
 *      assert(false, "Unreachable!");
 *   }
 * };
 *
 * // Create bypasses the normal constructor
 * const foo = create(Foo);
 * assert.strictEqual(type(foo), Foo);
 *
 * // Create() is null and undefined safe. (Remember type(null|undefined) = null|undefined)
 * assert.strictEqual(create(type(null)), null);
 * assert.strictEqual(create(type(undefined)), undefined);
 * assert.strictEqual(create(null), null);
 * assert.strictEqual(create(undefined), undefined);
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @function
 * @param {Function|null|undefined} t The type to construct.
 * @returns {t} The instance of the given type.
 * @see [createFrom()](module-typesafe.html#~createFrom)
 */
const create = (t) => (isdef(t) ? Object.create(t.prototype) : t);

/**
 * Instantiate a class and set fields, bypassing it's constructor.
 *
 *
 * ```js
 * const assert = require('assert');
 * const { createFrom, type } = require('ferrum');
 *
 * class Foo {
 *   constructor() {
 *      assert(false, "Unreachable!");
 *   }
 * };
 *
 * // Bypasses the constructor and sets fields.
 * const foo = createFrom(Foo, { answer: 42 });
 * assert.strictEqual(type(foo), Foo);
 * assert.strictEqual(foo.answer, 42);
 * ```
 *
 * // Create bypasses the normal constructor
 * const foo = create(Foo);
 * assert.strictEqual(type(foo) === Foo);
 *
 * This can be very useful when defining multiple constructors,
 * when bypassing the default constructor in a method or when
 * the normal constructor can not be used because construction
 * is async.
 *
 * ```js
 * const assert = require('assert');
 * const { createFrom, curry } = require('ferrum');
 * const { assign } = Object;
 *
 * const { abs } = Math;
 *
 * const xor = (a, b) => Boolean(a) ^ Boolean(b) ? (a||b) : null;
 *
 * const gcd = (a, b) => {
 *   if (a < b)
 *     return gcd(b, a);
 *   else if (b === 0)
 *     return a;
 *   else
 *     return gcd(b, a%b);
 * };
 *
 * // Represents a fraction a/b
 * class Rational {
 *   constructor(numerator, denominator) {
 *     // Normalize the fraction so we use a normalized representation:
 *     // The fraction is fully reduced and the sign is stored in the numerator
 *     const n = abs(numerator), d = abs(denominator);
 *     const s = xor(numerator<0, denominator<0) ? -1 : +1;
 *     const g = gcd(n, d);
 *     assign(this, {
 *       numerator: s*n/g,
 *       denominator: d/g,
 *     });
 *   }
 *
 *   mul(otr) {
 *     // Circumvent the construction as we multiplying two normalized
 *     // Rational yields another normalized Rational; no use wasting cycles
 *     return createFrom(Rational, {
 *       numerator: this.numerator * otr.numerator,
 *       denominator: this.denominator * otr.denominator,
 *     });
 *   }
 *
 *   // ... other methods ...
 * };
 *
 * Rational.new = curry('Rational.new', (num, den) =>
 *   new Rational(num, den));
 *
 * // Provide a constructor from int; again we know this
 * // is normalized; no use wasting cycles
 * Rational.fromInteger = (i) => createFrom(Rational, {
 *   numerator: i,
 *   denominator: 1,
 * });
 *
 * // Finally we can shortcut the constructor while testing
 * assert.deepStrictEqual(
 *   new Rational(15, 3),
 *   createFrom(Rational, { numerator: 5, denominator: 1 }));
 * assert.deepStrictEqual(
 *   Rational.new(6, 8),
 *   createFrom(Rational, { numerator: 3, denominator: 4 }));
 * assert.deepStrictEqual(
 *   Rational.new(6, -8),
 *   createFrom(Rational, { numerator: -3, denominator: 4 }));
 * assert.deepStrictEqual(
 *   Rational.new(6, -8).mul(Rational.new(-3, 2)),
 *   createFrom(Rational, { numerator: 9, denominator: 8 }));
 * ```
 *
 * Finally, it can be used to create classes with async constructors using this pattern:
 *
 * ```js
 * const assert = require('assert');
 * const { createFrom, type } = require('ferrum');
 *
 * class MyDatabase {
 *   constructor() {
 *     assert(false, "Use await MyDatabase.new(), not new MyDatabase()")
 *   }
 * };
 *
 * MyDatabase.new = async (file) => {
 *   // ... do io ...
 *   return createFrom(MyDatabase, { file });
 * };
 *
 * const main = async () => {
 *   const p = MyDatabase.new("ford/prefect");
 *   assert.strictEqual(type(p), Promise);
 *   assert.deepStrictEqual(await p, createFrom(MyDatabase, { file: "ford/prefect" }));
 * };
 *
 * await main();
 * ```
 *
 * Create from is null and undefined safe.
 *
 * ```js
 * const assert = require('assert');
 * const { createFrom, type } = require('ferrum');
 *
 * assert.strictEqual(createFrom(type(null), {}), null);
 * assert.strictEqual(createFrom(type(undefined), {}), undefined);
 *
 * // type() is defined to be the identity function for null and undefined
 *
 * assert.strictEqual(createFrom(null, {}), null);
 * assert.strictEqual(createFrom(undefined, {}), undefined);
 *
 * // Do not supply data! Since data cannot be assigned to null and
 * // undefined, this will throw
 * assert.throws(() => createFrom(null, { foo: 42 }));
 * assert.throws(() => createFrom(undefined, { foo: 42 }));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @function
 * @param {Function|null|undefined} t The type to construct.
 * @returns {t} The instance of the given type.
 */
const createFrom = curry('createFrom', (t, props) => {
  if (!isdef(t)) {
    assert(Object.keys(props).length === 0,
      'Can not set keys on null or undefined!');
    return t;
  } else {
    return assign(create(t), props);
  }
});

/**
 * The constructor of a class into a function.
 *
 * ```js
 * const assert = require('assert');
 * const { assign } = Object;
 * const {
 *   createFrom, curry, builder, assertSequenceEquals, type, map,
 *   apply, Equals,
 * } = require('ferrum');
 *
 * // Represents a fraction a/b
 * class Rational {
 *   constructor(numerator, denominator) {
 *     assign(this, { numerator, denominator });
 *   }
 *
 *   [Equals.sym](otr) {
 *     return this.numerator === otr.numerator
 *         && this.denominator === otr.denominator;
 *   }
 * };
 *
 * // I like to provide a static, curryable new method; builder()
 * // sets the .length and .name properties; which is why I prefer it
 * // over an ad-hoc construction.
 * Rational.new = curry('Rational.new', builder(Rational));
 * const Halfs = Rational.new(2);
 * assert.deepStrictEqual(
 *   Halfs(3),
 *   createFrom(Rational, { numerator: 3, denominator: 2 }));
 *
 * // This is equivalent to
 * Rational.new2 = curry('Rational.new2',
 *   (numerator, denominator) =>
 *     new Rational(numerator, denominator));
 *
 * const par = [
 *   [3, 4],
 *   [14, 11],
 * ];
 * const ref = [
 *   createFrom(Rational, { numerator: 3, denominator: 4 }),
 *   createFrom(Rational, { numerator: 14, denominator: 11 }),
 * ];
 *
 * // Now you can use this function like any other function
 * assertSequenceEquals(map(par, apply(Rational.new)), ref);
 * assertSequenceEquals(map(par, apply(Rational.new2)), ref);
 *
 * // Of course you can use this on the fly too – most libraries
 * // wont come with classes featuring a .new method.
 * assertSequenceEquals(map(par, apply(builder(Rational))), ref);
 *
 * // Without builder you would have to write this:
 * assertSequenceEquals(map(par, (args) => new Rational(...args)), ref);
 *
 * // This function is null and undefined safe
 * assert.strictEqual(builder(type(null))(), null);
 * assert.strictEqual(builder(type(undefined))(), undefined);
 *
 * // And since type(null|undefined) is defined to be the
 * // identity function
 * assert.strictEqual(builder(null)(), null);
 * assert.strictEqual(builder(undefined)(), undefined);
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @function
 * @param {Function|null|undefined} T The type to get the construct off
 * @param {Function} fn The mutation procedure
 * @returns {*} obj
 */
const builder = (T) => {
  let fn = () => (T);
  if (isdef(T)) {
    fn = (...args) => new T(...args);
    Object.defineProperty(fn, 'length', { value: T.length });
  }
  withFunctionName(typename(T), fn);
  return fn;
};

module.exports = {
  isdef,
  ifdef,
  type,
  typename,
  isPrimitive,
  create,
  createFrom,
  builder,
};
