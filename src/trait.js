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

const isPlainObject = require('lodash.isplainobject');
const { curry } = require('./functional');
const { isPrimitive, type, typename, isdef } = require('./typesafe');

/**
 * @module trait
 * @description Introducing type classes (from haskell)/traits (from rust) to javascript.
 */

/**
 * Drop-in replacement for [WeakMap](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
 * that can store primitives.
 *
 * Note that primitive keys won't be weakly referenced (they cannot
 * be garbage collected).
 *
 * Like the original WeakMap, the elements of a HybridWeakMap cannot be iterated over.
 *
 * ```js
 * const assert = require('assert');
 * const { strictEqual: assertIs } = require('assert');
 * const { HybridWeakMap } = require('ferrum');
 *
 * let data = { obj: {}, prim: 'foo' }
 *
 * const m = new HybridWeakMap([
 *   [data.prim,  42], // Primitive key, will be strongly referenced
 *   [data.obj,   23], // Object key, will be weakly referenced
 * ]);
 *
 * // Can retrieve the values
 * assertIs(m.get(data.prim), 42);
 * assertIs(m.get(data.obj),  23);
 * assert(m.has(data.prim));
 * assert(m.has(data.obj));
 *
 * // Won't prevent object keys from being garbage collected.
 * // This is especially important for large key/value pairs:
 * // In this example our key and value are very small (empty object and a string),
 * // but if they where large, allowing them to be freed could release
 * // significant amounts of memory.
 *
 * data = null; // Allow the {}/23 pair to be garbage collected.
 * ```
 *
 * Normally WeakMaps cannot store primitive values like Strings
 * or Numbers; this is mostly an implementation detail and there
 * still are some use cases where one would wish to store primitives
 * in a weak map even though those primitive values won't be garbage
 * collected.a
 *
 * This is what HybridWeakMap is for: It simply contains two maps; one
 * Weak map for objects, and one normal Map for primitives...
 *
 * @class
 */
class HybridWeakMap {
  constructor(iterable) {
    this.primitives = new Map();
    this.objs = new WeakMap();

    if (iterable) {
      for (const [k, v] of iterable) {
        this.set(k, v);
      }
    }
  }

  get(k) {
    return isPrimitive(k) ? this.primitives.get(k) : this.objs.get(k);
  }

  has(k) {
    return isPrimitive(k) ? this.primitives.has(k) : this.objs.has(k);
  }

  set(k, v) {
    return isPrimitive(k) ? this.primitives.set(k, v) : this.objs.set(k, v);
  }

  delete(k) {
    return isPrimitive(k) ? this.primitives.delete(k) : this.objs.delete(k);
  }
}

/**
 * Thrown thrown to indicate a trait is not implemented for a specific
 * type or value.
 *
 * ```js
 * const { strictEqual: assertIs, throws: assertThrows } = require('assert');
 * const { Size, size } = require('ferrum');
 *
 * class Bar {};
 * assertThrows(() => size(new Bar()));
 *
 * // The error goes away after implementing the trait
 * Size.impl(Bar, () => 42);
 * assertIs(size(new Bar()), 42);
 * ```
 *
 * @class
 * @property {Trait} trait The trait that was not implemented
 */
class TraitNotImplemented extends Error {}

/**
 * Helper for implementing generic functions/protocols.
 *
 * ```js
 * const assert = require('assert');
 * const { strictEqual: assertIs } = require('assert');
 * const { Trait } = require('ferrum');
 *
 * // Declaring a trait
 * const Size = new Trait('Size');
 *
 * // Using it
 * const size = (what) => Size.invoke(what);
 * const empty = (what) => size(what) === 0;
 *
 * // Providing implementations for own types
 * class MyType {
 *   [Size.sym]() {
 *     return 42;
 *   }
 * }
 *
 * // Providing implementations for third party types
 * Size.impl(Array, (x) => x.length); // Method of type Array
 * assertIs(size([1,2,3]), 3);
 *
 * Size.impl(String, (x) => x.length);
 * assertIs(size("foobar"), 6);
 *
 * Size.impl(Map, (x) => x.size);
 * assert(empty(new Map()), true);
 *
 * Size.impl(Set, (x) => x.size);
 * assert(!empty(new Set([1, 2])));
 *
 * Size.impl(Object, (x) => { // Note that this won't apply to subclasses
 *   let cnt = 0;
 *   for (const _ in x) cnt++;
 *   return cnt;
 * });
 * assertIs(size({foo: 42}), 1);
 *
 * // Note: The two following examples would be a bad idea in reality,
 * // they are just here toshow the mechanism
 * Size.implStatic(null, (_) => 0); // Static implementation (for a value and not a type)
 * assert(empty(null));
 *
 * // This implementation will be used if the underlying type/value
 * // implements the magnitude trait
 * //Size.implDerived([Magnitude], ([magnitude], v) => magnitude(v));
 *
 * // This will be called as a last resort, so this must be very fast!
 * // This example would implement the `size` trait for any even number.
 * // Note how we just return `undefined` for non even numbers
 * Size.implWildStatic(
 *    (x) => type(x) === Number && x % 2 == 0 ? (x => x) : undefined);
 *
 * // test if an object is a dom node
 * const isNode = o =>
 *     typeof Node === "object"
 *        ? o instanceof Node
 *        : o && typeof o === "object"
 *            && typeof o.nodeType === "number"
 *            && typeof o.nodeName==="string";
 *
 * // Last resort lookup for types. Implements Size for any dom nodes…
 * Size.implWild(
 *    (t) => isNodeType(t) ? ((elm) => elm.childElementCount) : undefined);
 * ```
 *
 * # Traits, an introduction: Very specific interfaces that let you choose your guarantees
 *
 * This helps to implement a concept known as type classes in haskell,
 * traits in rust, protocols in elixir, protocols (like the iteration protocol)
 * in javascript.
 * This helper is not supposed to replace ES6 protocols, instead it is supposed
 * to expand on them and make them more powerful.
 *
 * Basically this allows you to declare an interface, similar to interfaces in
 * C++ or C# or Java. You declare the interface; anyone implementing this generic
 * interface (like the iterator protocol, or Size interface which can be used to
 * determine the size of a container) promises to obey the rules and the laws of
 * the interface.
 * This is much more specific than having a size() method for instance; size() is
 * just an name which might be reasonably used in multiple circumstances; e.g. one
 * might use the name size() for a container that can have a `null` size, or return
 * a tuple of two numbers because the size is two dimensional. Or it might require
 * io to return the size or be complex to compute (e.g. in a linked list).
 *
 * A size() method may do a lot of things, the Size trait however has a highly specific
 * definition: It returns the size of a container, as a Number which must be greater than
 * zero and cannot be null. The size must be efficient to compute as well.
 *
 * By using the Size trait, the developer providing an implementation specifically says
 * 'I obey those rules'. There may even be a second trait called `Size` with it's own rules.
 * The trait class is written in a way so those two would not interfere.
 *
 * ## Traits do not provide type checks
 *
 * Because we are in javascript, these guarantees are generally not enforced by the type system
 * and the dev providing an implementation is still responsible for writing extensive tests.
 *
 * # Traits provide abstraction: Think about what you want to do, not how you want to do it
 *
 * One specific feature traits provide is that they let you state what you want to do instead of how
 * to do it.
 * Need to determine the size of a container? Use `.length` for arrays and strings,
 * use `.size` for ES6 Maps and Sets and a for loop to determine the size of an object.
 * Or you could just use the Size trait and call `size(thing)` which works for all of these
 * types. This is one of the features traits provide; define an implementation for a trait
 * once and you no longer have to think about how to achieve a thing, just what to achieve.
 *
 * # Implementing traits for third party types
 *
 * This is another feature that makes traits particularly useful! Java for instance
 * has interfaces, but the creator of a class/type must think of implementing a specific interface;
 * this is particularly problematic if the type is from a library; the interface must
 * either come from the standard library or from that particular library.
 *
 * This usually is not very helpful; with traits this is not a problem at all.
 * Just use `MyTrait.impl` as in the example above.
 *
 * # Subclassing the Trait class
 *
 * You may subclass Trait and overwrite any of it's methods.
 *
 * @class
 * @property {String|undefined} name The name of the trait
 * @property {Symbol} sym The symbol for lookup inside third party classes
 */
class Trait {
  /**
   * @constructs
   * @param {string} name The name of the trait
   * @param {Symbol|null} sym Symbol associated with the trait; this symbol
   *   will be available under `MyTrait.sym` for devs to implement their
   *   interfaces with. This parameter is usually left empty; in this case a
   *   new symbol is created for the trait. An example where the extra
   *   parameter is used is the `Sequence` trait in `sequence.js`; this trait
   *   is just a wrapper around the built in `Symbol.iterator` protocol, so
   *   it's using it's symbol.
   */
  constructor(name, sym) {
    this.name = name;
    this.sym = sym || Symbol(name);
    this.table = new HybridWeakMap();
    this.staticTable = new HybridWeakMap();
    this.derived = [];
    this.wild = [];
    this.wildStatic = [];
  }

  /**
   * Find the implementation of this trait for a specific value.
   * This is used by `.invoke()`, `.supports()` and `.valueSupports`.
   *
   * It uses the following precedence by default:
   *
   * - Implementations added with `implStatic`
   * - Implementations using the symbol in a method of a prototype
   * - Implementations added with `impl`
   * - Implementations added with `implDerived` in the order they where added
   * - Implementations added with `implWild` in the order…
   * - Implementations added with `implWildStatic` in the order…
   *
   * This function can be used directly in order to avoid a double lookup
   * of the implementation:
   *
   * ```js
   * const impl = MyTrait.lookupValue(what);
   * if (impl) {
   *   impl(what, ...);
   * } else {
   *   ...
   * }
   * ```
   *
   * @param {Any} what The thing to find an implementation for
   * @returns {Function|falsy-value} The function that was found or nothing.
   *   Takes the same parameters as `.invoke(what, ...args)`, so if you are not
   *   using invoke, you must specify `what` twice; once in the `lookupValue` call, once
   *   in the invocation.
   */
  lookupValue(what) {
    const Typ = type(what);
    // We use allowType to avoid interpreting things like the Array iterator
    // or the Map iterator as plain objects; hence the manual check…
    // For variables which are Objects but not plain objects we skip all type
    // based lookups and only perform value based lookups.
    // The reason for this is that those values should have custom types, but they
    // don't (they just use object), so we don't really have any appropriate type
    // info to go on...
    const badType = Typ === Object && (
      !isPlainObject(what)
      || typeof what[Symbol.iterator] === 'function'
      || typeof what[Symbol.asyncIterator] === 'function');
    const allowType = badType ? undefined : true;
    // NOTE: The Map iterator is a plain object with a [Symbol.iterator] plain property.
    // This is the reason we need a property (non-prototype-based) lookup and
    // why lookupProperty has a higher precedence than lookupTypeTable (the Sequence trait
    // uses an `impl(Object, ...)` which should of course not be used for Map iterators.)
    return this._lookupValueTable(what)
        || this._lookupProperty(what)
        || (allowType && this._lookupTypeTable(Typ))
        || (allowType && this._lookupTypeDerive(Typ))
        || this._lookupValueDerive(what)
        || (allowType && this._lookupTypeWild(Typ))
        || this._lookupValueWild(what);
  }

  /**
   * Lookup the implementation of this trait for a specific type.
   * Pretty much the same as lookupValue, just skips the value lookup steps…
   */
  lookupType(Typ) {
    return this._lookupMethod(Typ)
        || this._lookupTypeTable(Typ)
        || this._lookupTypeDerive(Typ)
        || this._lookupTypeWild(Typ);
  }

  _lookupTypeTable(Typ) {
    return this.table.get(Typ);
  }

  _lookupValueTable(what) {
    return this.staticTable.get(what);
  }

  _lookupProperty(what) {
    const prop = isdef(what) && what[this.sym];
    return prop ? (w, ...args) => prop.apply(w, args) : undefined;
  }

  _lookupMethod(Typ) {
    const method = isdef(Typ) && Typ.prototype[this.sym];
    return method ? (w, ...args) => method.apply(w, args) : undefined;
  }

  _lookupTypeDerive(Typ) {
    for (const [traits, fn] of this.derived) {
      const impls = traits.map((trait) => trait.lookupType(Typ));
      if (impls.reduce((a, b) => a && b, true)) { // All are implemented
        const nuFn = (...args) => fn(impls, ...args);
        this.impl(Typ, nuFn); // Cache the result in the lookup table...
        return nuFn;
      }
    }
    return undefined;
  }

  _lookupValueDerive(what) {
    for (const [traits, fn] of this.derived) {
      const impls = traits.map((trait) => trait.lookupValue(what));
      if (impls.reduce((a, b) => a && b, true)) { // All are implemented
        const nuFn = (...args) => fn(impls, ...args);
        // this.implStatic(what, fn); // Not caching this because it might be very many values
        return nuFn;
      }
    }
    return undefined;
  }

  _lookupTypeWild(Typ) {
    for (const fn of this.wild) {
      const impl = fn(Typ);
      if (impl) {
        this.impl(Typ, impl); // Cache the implementation for this type...
        return impl;
      }
    }
    return undefined;
  }

  _lookupValueWild(what) {
    for (const fn of this.wildStatic) {
      const impl = fn(what);
      if (impl) {
        // this.implStatic(Typ, what); // Not caching this because it might be very many values
        return impl;
      }
    }
    return undefined;
  }

  /** Invoke the implementation. See examples above. */
  invoke(what, ...args) {
    const impl = this.lookupValue(what);
    if (!impl) {
      const msg = `No implementation of trait ${typename(this)} for ${what} of type ${typename(type(what))}.`;
      const e = new TraitNotImplemented(msg);
      e.trait = this;
      throw e;
    }
    return impl(what, ...args);
  }

  /** Implement this trait for a class as a 'method'. See examples above */
  impl(Typ, impl) {
    this.table.set(Typ, impl);
  }

  /**
   * Implement this trait for a value/as a 'static method'. See examples above
   * Prefer impl() when possible since implementations using this function will
   * not show up in supports()/this.typeHasImpl().
   */
  implStatic(what, impl) {
    this.staticTable.set(what, impl);
  }

  /** Implements a trait based on other traits */
  implDerived(traits, fn) {
    this.derived.push([Array.from(traits), fn]);
  }

  /**
   * Arbitrary code implementation of this trait for types. See examples above
   * Prefer implWild() when possible since implementations using this function will
   * not show up in supports()/this.typeHasImpl().
   */
  implWild(impl) {
    this.wild.push(impl);
  }

  /** Arbitrary code implementation of this trait for values. See examples above */
  implWildStatic(impl) {
    this.wildStatic.push(impl);
  }
}

Trait._NullObj = {};
Trait._UndefObj = {};

/**
 * Test if the given trait has been implemented for the given type
 *
 * ```js
 * const assert = require('assert');
 * const { Size, supports } = require('ferrum');
 *
 * class Bar {};
 * assert(!supports(Bar, Size));
 *
 * // can be curried
 * const supportsSize = supports(Size);
 *
 * // After implementing the trait
 * Size.impl(Bar, () => 42);
 * assert(supportsSize(Bar));
 * ```
 *
 * @function
 * @param {Function} Typ The type
 * @param {Trait} trait The trait to check support for
 * @returns {Boolean}
 */
const supports = curry('supports', (Typ, trait) => Boolean(trait.lookupType(Typ)));

/**
 * Test if the given trait has been implemented for the given value
 *
 * ```js
 * const assert = require('assert');
 * const { Size, valueSupports } = require('ferrum');
 *
 * class Bar {};
 * assert(!valueSupports(new Bar(), Size));
 *
 * // can be curried
 * const valueSupportsSize = valueSupports(Size);
 *
 * // After implementing the trait
 * Size.impl(Bar, () => 42);
 * assert(valueSupportsSize(new Bar()));
 * ```
 *
 * @function
 * @param {Function} Typ The type
 * @param {Trait} trait The trait to check support for
 * @returns {Boolean}
 */
const valueSupports = curry('valueSupports', (val, trait) => Boolean(trait.lookupValue(val)));

module.exports = { HybridWeakMap, Trait, TraitNotImplemented, supports, valueSupports };
