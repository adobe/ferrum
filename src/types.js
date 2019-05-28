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

/* eslint-disable no-use-before-define, no-param-reassign, array-callback-return */

const assert = require('assert');
const { inspect } = require('util');
const { isPlainObject } = require('lodash');
const { curry } = require('./functional.js');

/** List of all types that are typed arrays */
const typedArrays = [
  Int8Array, Uint8Array, Uint8ClampedArray, Int16Array,
  Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];

// URL is not available in some environments
const _maybeURL = typeof URL !== 'undefined' ? [URL] : [];

/**
 * Library for advanced type level programming in JS.
 *
 * See the trait class.
 *
 * The traits in this file usually are implemented for at least: Plain
 * Object, Map, Set, Array, String
 *
 * # Laws
 *
 * These apply to all traits in this class.
 *
 * - Arrays, Strings and any list-like data structures are treated
 *   as mappings from index -> value
 * - Array sparseness is ignored on read; any list-like container `has` a
 *   specific index if `size(myContainer) => key`; getting an unset value
 *   yields `undefined`
 * - Sets are treated as mappings from a key to itself
 */

/**
 * Checks whether a value is defined.
 * This function considers all values that are not null
 * and not undefined to be defined
 */
const isdef = v => v !== undefined && v !== null;

/**
 * Determine type of an object.
 * Like obj.constructor, but won't fail
 * for null/undefined and just returns the
 * value itself for those.
 * This is a useful feature for code that is supposed to be
 * null/undefined-safe since those need not be special cased.
 */
const type = v => (isdef(v) ? v.constructor : v);

/**
 * Given a type, determine it's name.
 * This is useful as a replacement for val.constructor.name,
 * since this can deal with null and undefined.
 */
const typename = t => (isdef(t) ? t.name : `${t}`);

/** Test if a value is primitive */
const isPrimitive = v => v !== Object(v);

/** Drop-in replacement for WeakMap that can store primitives. */
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

class TraitNotImplemented extends Error {}

/**
 * Helper for implementing generic functions/protocols.
 *
 * Want to see the code? Scroll down to `Show me the code`.
 *
 * # Traits, an introduction: Very specific interfaces that let you choose your guarantees
 *
 * This helps to implement a concept known as type classes in haskell,
 * traits in rust, protocols in elixir, protocols (like the iteration protocol)
 * in javascript.
 * This helper is not supposed to replace ES6 protocols, instead it is supposed
 * to expand on them and make them more powerfull.
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
 * # Show me the code
 *
 * ```
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
 * Size.impl(String, (x) => x.length);
 * Size.impl(Map, (x) => x.size);
 * Size.impl(Set, (x) => x.size);
 *
 * Size.impl(Object, (x) => { // Note that this won't apply to subclasses
 *   let cnt = 0;
 *   for (const _ in x) cnt++;
 *   return cnt;
 * });
 *
 * // Note: The two following examples would be a bad idea in reality,
 * // they are just here toshow the mechanism
 * Size.implStatic(null, (_) => 0); // Static implementation (for a value and not a type)
 *
 * // This implementation will be used if the underlying type/value
 * // implements the magnitude trait
 * Size.implDerived([Magnitued], ([magnitude], v) => magnitude(v));
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
 *
 *
 * // Using all the implementations
 * size([1,2,3]) # => 3
 * size({foo: 42}) # => 1
 * size(new Set([1,2,3])) # => 3
 * size(new MyType()) # => 42
 * size(null) # => 0
 * size(document.body) # => 1
 * ```
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
 */
class Trait {
  /**
   * Create a new Trait.
   *
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
   * This function can be used directly in order to avoid a double lookiup
   * of the implementation:
   *
   * ```
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
      const impls = traits.map(trait => trait.lookupType(Typ));
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
      const impls = traits.map(trait => trait.lookupValue(what));
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

/** Test if the given trait has been implemented for the given type */
const supports = curry('supports', (Typ, trait) => Boolean(trait.lookupType(Typ)));

/** Test if the given trait has been implemented for the given value */
const valueSupports = curry('valueSupports', (val, trait) => Boolean(trait.lookupValue(val)));

// IMMUTABLE TRAIT ////////////////////////////////////

/** Test whether instance of a given type is immutable */
const typeIsImmutable = t => supports(t, Immutable);

/** Test whether a given value is immutable */
const isImmutable = v => valueSupports(v, Immutable);

/**
 * This is a flag trait that indicates whether a type is immutable.
 *
 * Since javascript has not real way to enforce absolute immutability
 * this trait considers anything immutable that is hard to mutate
 * or really not supposed to be mutated.
 * Function is considered immutable despite it being possible to assign
 * parameters to functions...
 *
 * This is used in a couple paces; specifically it is used as a list of types
 * that should be left alone in `deepclone` and `shallowclone`.
 */
const Immutable = new Trait('Immutable');
[String, Number, Boolean, null, undefined, RegExp, Date, Symbol, Function].map((Typ) => {
  Immutable.impl(Typ, () => true);
});

// EQUALS TRAIT ///////////////////////////////////////

/**
 * Determine whether two values are equal using the Equals trait.
 *
 * This function is a bit more powerful than than the Equals trait itself:
 * First of all it searches for a `Equals` implementation for both arguments
 * and it falls back to `===` if none is found.
 * For this reason using eq() is usually preferred over using the Equals trait directly.
 */
const eq = curry('eq', (a, b) => {
  const main = Equals.lookupValue(a);
  if (main) {
    return main(a, b);
  }

  const alt = type(a) === type(b) ? undefined : Equals.lookupValue(b);
  if (alt) {
    return alt(b, a);
  }

  return a === b;
});

/** Equivalent to `!eq(a, b)` */
const uneq = curry('uneq', (a, b) => !eq(a, b));

/** Assert that `eq(actual, expected)` */
const assertEquals = (actual, expected, msg) => {
  const P = v => inspect(v, {
    depth: null, breakLength: 1, compact: false, sorted: true,
  });

  if (!eq(actual, expected)) {
    throw new assert.AssertionError({
      message: `The values are not equal${msg ? `: ${msg}` : '!'}`,
      actual: P(actual),
      expected: P(expected),
      operator: 'eq()',
      stackStartFn: assertEquals,
    });
  }
};

/** Assert that `!eq(actual, expected)` */
const assertUneq = (actual, notExpected, msg) => {
  const P = v => inspect(v, {
    depth: null, breakLength: 1, compact: false, sorted: true,
  });

  if (eq(actual, notExpected)) {
    throw new assert.AssertionError({
      message: `The values should not be equal${msg ? `: ${msg}` : '!'}`,
      actual: P(actual),
      expected: P(notExpected),
      operator: '!eq()',
      stackStartFn: assertUneq,
    });
  }
};

/**
 * Trait to check whether two values are equal.
 *
 * Normally this trait should not be used directly; consider using
 * `eq()` instead.
 *
 * This trait should be used only in cases where `===`/`is()` is too
 * strict. Equals is for cases in which the content of two variables
 * or data structures is the same/semantically equivalent.
 *
 * # Interface
 *
 * `(value1: Any, value2: Any) => r: Boolean`
 *
 * # Laws
 *
 * * `Equals.invoke(a, b) <=> Equals.invoke(b, a)`
 *
 * This law seems trivial at first, but one actually needs to take some
 * care to make this work: The trait resolves to the implementation for
 * the **first argument**!
 * So `Equals.invoke(a: Number, b: String)` and `Equals.invoke(a: String, b: Number)`
 * will actually resolve to two different implementations.
 * The easiest way to make this work is just to add a check `(a, b) => type(b) === Number`
 * to the implementation for number and adding an equivalent check in string.
 * If comparing across types is actually desired (and might return `true`),
 * I suggest using the same code for both implementations: Consider the following
 * contrive examples:
 *
 * ```
 * Equals.impl(Number, (a, b) =>
 *   type(b) === (String || type(b) === Number)
 *   && a.toString() === b.toString());
 * Equals.impl(String, (a, b) =>
 *   type(b) === (String || type(b) === Number)
 *   && a.toString() === b.toString());
 * ```
 *
 * # Specialization notes
 *
 * Extra implementations provided for Date, RegExp, URL and typed arrays.
 *
 * Note that for sets: `eq(new Set([{}]), new Set([{}]))` does not hold true,
 * since in sets keys and values are the same thing and keys always follow `===`
 * semantics.
 */
const Equals = new Trait('Equals');
Equals.impl(RegExp, (a, b) => type(b) === RegExp && a.source === b.source && a.flags === b.flags);

// Compare as string
[Date, ..._maybeURL].map((Typ) => {
  Equals.impl(Typ, (a, b) => type(b) === Typ && a.toString() === b.toString());
});

// Container like
[Object, Map, Set, Array, ...typedArrays].map((Typ) => {
  Equals.impl(Typ, (a, b) => {
    if (type(b) !== Typ || size(a) !== size(b)) {
      return false;
    }

    for (const [k, v] of pairs(a)) {
      // type !== Set is just an optimization so we don't have to
      // do unnecessary lookups for sets…
      if (!has(b, k) || (Typ !== Set && !eq(get(b, k), v))) {
        return false;
      }
    }

    return true;
  });
});

// SIZE TRAIT /////////////////////////////////////////

/** Determine the size of a container. Uses the Size trait */
const size = what => Size.invoke(what);
/** Determine if a container is empty. Uses `size(x) === 0` */
const empty = what => size(what) === 0;

/**
 * Trait to determine the size of a container.
 *
 * Implemented at least for Object, String, Array, Map, Set.
 *
 * # Interface
 *
 * Invocation takes the form `(c: Container) => i: Integer`
 *
 * # Laws
 *
 * - `i >= 0`
 * - `i !== null && i !== undefined`.
 * - Must be efficient to execute. No IO, avoid bad algorithmic complexities.
 */
const Size = new Trait('Size');
[String, Array, ...typedArrays].map((Typ) => {
  Size.impl(Typ, x => x.length);
});
Size.impl(Map, x => x.size);
Size.impl(Set, x => x.size);
Size.impl(Object, (x) => {
  let cnt = 0;
  for (const _ in x) { // eslint-disable-line guard-for-in, no-restricted-syntax
    cnt += 1;
  }
  return cnt;
});

// CLONING TRAITS /////////////////////////////////////

/** Shallowly clone an object */
const shallowclone = x => Shallowclone.invoke(x);

/**
 * Shallowly clone an object.
 *
 * # Interface
 *
 * `(x: TheValue) => r: TheValue`
 *
 * # Laws
 *
 * - `x !== r`
 * - `get(r, k) === get(x, k)` for any k.
 *
 * # Implementation Notes
 *
 * No-Op implementations are provided for read only primitive types.
 */
const Shallowclone = new Trait('Shallowclone');
Shallowclone.impl(Array, x => Array.from(x));

// From Constructor
[Map, Set, ..._maybeURL, Date, ...typedArrays].map((Typ) => {
  Shallowclone.impl(Typ, x => new Typ(x));
});

Shallowclone.impl(Object, (x) => {
  const nu = {};
  for (const [k, v] of pairs(x)) {
    nu[k] = v;
  }
  return nu;
});

// Immutables are left as is
Shallowclone.implDerived([Immutable], ([_], v) => v);

/** Recursively clone an object */
const deepclone = x => Deepclone.invoke(x);

/**
 * Recursively clone an object.
 *
 * # Interface
 *
 * `(x: TheValue) => r: TheValue`
 *
 * # Laws
 *
 * - `x !== r`
 * - `x equals r` wehre eq is the equals() function.
 * - `get(r, k) !== get(x, k)` for any k.
 * - `has(r, k) implies has(x, k)` for any k.
 * - `get(r, k) equals get(x, k)` for any k wehre eq is the equals() function.
 * - The above laws apply recursively for any children.
 *
 * # Specialization Notes
 *
 * No implementation provided for set: In sets keys and values are the
 * same thing.
 * If we cloned sets deeply, `has(orig, key) implies has(clone, key)` would be violated
 * and the sets would not be equal after cloning.
 * For the same reason, Map keys are not cloned either!
 */
const Deepclone = new Trait('Pairs');
Deepclone.impl(Array, x => x.map(v => deepclone(v)));

// Key/Value collections
[Map, Object].map((Typ) => {
  Deepclone.impl(Typ, (x) => {
    const nu = new Typ();
    for (const [k, v] of pairs(x)) {
      assign(nu, k, deepclone(v));
    }
    return nu;
  });
});

// Use shallowclone for these
[Set, ..._maybeURL, Date, ...typedArrays].map((Typ) => {
  Deepclone.impl(Typ, x => shallowclone(x));
});

// Immutables are left as is
Deepclone.implDerived([Immutable], ([_], v) => v);

// CONTAINER ITERATION ////////////////////////////////

/** Get an iterator over any container; always returns pairs [key, value] */
const pairs = x => Pairs.invoke(x);
/** Get an iterator over the keys of a container. Uses `pairs(c)`. */
const keys = function* keys(x) {
  for (const [k, _] of pairs(x)) {
    yield k;
  }
};
/** Get an iterator over the values of a container. Uses `pairs(c)`. */
const values = function* values(x) {
  for (const [_, v] of pairs(x)) {
    yield v;
  }
};

/**
 * Get an iterator over a container.
 *
 * This is different from the `Sequence` trait in `sequence.js`
 * in that this always returns pairs, even for lists, sets, strings...
 *
 * # Interface
 *
 * `(c: Container(k: Key, v: Value)) => r: Sequence([k: Key, v: Value], ...)`.
 *
 * # Specialization Notes
 *
 * Array like types return index => value, set returns value => value.
 */
const Pairs = new Trait('Pairs');
Pairs.impl(Map, x => x.entries());
[String, Array, ...typedArrays].map((Typ) => {
  Pairs.impl(Typ, function* impl(x) {
    for (let i = 0; i < x.length; i += 1) {
      yield [i, x[i]];
    }
  });
});
Pairs.impl(Set, function* impl(x) {
  for (const v of x) {
    yield [v, v];
  }
});
Pairs.impl(Object, function* impl(x) {
  // eslint-disable-next-line no-restricted-syntax, guard-for-in
  for (const k in x) {
    yield [k, x[k]];
  }
});

// CONTAINER ACCESS ///////////////////////////////////

/** Given a key, get a value from a container. */
const get = curry('get', (x, k) => Get.invoke(x, k));

/**
 * Trait to get a value from a container like type.
 *
 * Implemented for Object, String, Array, Map.
 *
 * # Interface
 *
 * `(c: Container, k: Key) => v: Value|undefined`. Will return undefined
 * if the key could not be found.
 *
 * # Laws
 *
 * - Must not be implemented for set-like data structures
 */
const Get = new Trait('Get');
[Object, String, Array, ...typedArrays].map((Typ) => {
  Get.impl(Typ, (x, k) => x[k]);
});
[Map, WeakMap, HybridWeakMap].map((Typ) => {
  Get.impl(Typ, (x, k) => x.get(k));
});
[Set, WeakSet].map((Typ) => {
  Get.impl(Typ, (x, k) => (x.has(k) ? k : undefined));
});

/** Test if a container includes an entry with the given key */
const has = curry('has', (x, k) => Has.invoke(x, k));

/**
 * Test if a container holds an entry with the given key.
 *
 * # Interface
 *
 * `(c: Container, k: Key) => b: Boolean`.
 *
 * # Laws
 *
 * - Must not be implemented for set-like data structures
 */
const Has = new Trait('Has');
Has.impl(Object, (x, k) => k in x);
[String, Array, ...typedArrays].map((Typ) => {
  Has.impl(Typ, (x, k) => k >= 0 && k < x.length);
});
[Map, WeakMap, HybridWeakMap].map((Typ) => {
  Has.impl(Typ, (x, k) => x.has(k));
});
[Set, WeakSet].map((Typ) => {
  Has.impl(Typ, (x, k) => x.has(k));
});

// CONTAINER MUTATION /////////////////////////////////

/**
 * Set a value in a container.
 * Always returns the given value.
 */
const assign = curry('assign', (cont, key, value) => {
  Assign.invoke(cont, key, value);
});

/**
 * Trait to assign a value in a container like type.
 *
 * Implemented for Object, String, Array, Map.
 *
 * # Interface
 *
 * `(c: Container, v: Value, k: Key) => void`.
 *
 * # Laws
 *
 * - Must not be implemented for set-like data structures
 *
 * # Specialization Notes
 *
 * No implementation provided for String since String is read only.
 */
const Assign = new Trait('Assign');
[Object, Array, ...typedArrays].map((Typ) => {
  Assign.impl(Typ, (x, k, v) => {
    x[k] = v;
  });
});
[Map, WeakMap, HybridWeakMap].map((Typ) => {
  Assign.impl(Typ, (x, k, v) => x.set(k, v));
});
[Set, WeakSet].map((Typ) => {
  Assign.impl(Typ, (x, k, v) => {
    if (v === k) {
      x.add(v);
    } else {
      throw new Error(`For sets, keys and values must be the same; '${k} !== ${v}'`);
    }
  });
});

/** Delete an entry with the given key from a container */
const del = curry('del', (x, k) => {
  Delete.invoke(x, k);
});

/**
 * Test if a container holds an entry with the given key.
 *
 * # Interface
 *
 * `(c: Container, k: Key) => Void`.
 *
 * # Laws
 *
 * - The value must actually be deleted, not set to `undefined` if possible.
 *   Arrays become sparse if a value in their midst is deleted.
 *
 * # Specialization Notes
 *
 * No implementation provided for String since String is read only.
 * No implementation for Array since has() disregards sparse slots in arrays
 * (so a delete op would be the same as assign(myArray, idx, undefined)) which
 * would be inconsistent.
 */
const Delete = new Trait('Delete');
Delete.impl(Object, (x, k) => delete x[k]);
[Map, WeakMap, HybridWeakMap, Set, WeakSet].map((Typ) => {
  Delete.impl(Typ, (x, k) => x.delete(k));
});

/** Set a default value in a container. */
const setdefault = curry('setdefault', (x, k, v) => Setdefault.invoke(x, k, v));

/**
 * Set a default value in a container.
 *
 * This trait is implicitly implemented if the container implements Has, Get and Set.
 *
 * # Interface
 *
 * `(c: Container, v: Value, k: Key) => r: Value`.
 */
const Setdefault = new Trait('Setdefault');
Setdefault.implDerived([Has, Get, Assign], ([has2, get2, assign2], x, k, v) => {
  if (has2(x, k)) {
    return get2(x, k);
  } else {
    assign2(x, k, v);
    return v;
  }
});

/** Swap out one value in a container for another  */
const replace = curry('replace', (x, k, v) => Replace.invoke(x, k, v));

/**
 * Swap out one value in a container for another.
 *
 * This trait is implicitly implemented if the container implements Get and Set.
 *
 * # Interface
 *
 * `(c: Container, v: Value, k: Key) => r: Value`.
 */
const Replace = new Trait('Replace');
Replace.implDerived([Get, Assign], ([get2, assign2], x, k, v) => {
  const r = get2(x, k);
  assign2(x, k, v);
  return r;
});

module.exports = {
  typedArrays,
  isdef,
  type,
  typename,
  isPrimitive,
  HybridWeakMap,
  TraitNotImplemented,
  Trait,
  supports,
  valueSupports,
  typeIsImmutable,
  isImmutable,
  Immutable,
  eq,
  uneq,
  assertEquals,
  assertUneq,
  Equals,
  size,
  empty,
  Size,
  shallowclone,
  Shallowclone,
  deepclone,
  Deepclone,
  pairs,
  keys,
  values,
  get,
  Get,
  has,
  Has,
  assign,
  Assign,
  del,
  Delete,
  setdefault,
  Setdefault,
  replace,
  Replace,
};
