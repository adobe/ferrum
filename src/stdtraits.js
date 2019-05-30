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
const { curry } = require('./functional');
const {
  type, typename, isdef, isPrimitive,
} = require('./typesafe');
const {
  HybridWeakMap, TraitNotImplemented, Trait, valueSupports, supports,
} = require('./trait');

/**
 * @module stdtraits
 * @description
 * Highly generic traits/interfaces.
 *
 * # Laws
 *
 * These apply to all traits in this module.
 *
 * - Arrays, Strings and any list-like data structures are treated
 *   as mappings from index -> value
 * - Array sparseness is ignored on read; any list-like container `has` a
 *   specific index if `size(myContainer) => key`; getting an unset value
 *   yields `undefined`
 * - Sets are treated as mappings from a key to itself
 */

// List of all types that are typed arrays
const _typedArrays = [
  Int8Array, Uint8Array, Uint8ClampedArray, Int16Array,
  Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];

// URL is not available in some environments
const _maybeURL = typeof URL !== 'undefined' ? [URL] : [];

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
 *
 * @interface
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
 *
 * @interface
 */
const Equals = new Trait('Equals');
Equals.impl(RegExp, (a, b) => type(b) === RegExp && a.source === b.source && a.flags === b.flags);

// Compare as string
[Date, ..._maybeURL].map((Typ) => {
  Equals.impl(Typ, (a, b) => type(b) === Typ && a.toString() === b.toString());
});

// Container like
[Object, Map, Set, Array, ..._typedArrays].map((Typ) => {
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
 *
 * @interface
 */
const Size = new Trait('Size');
[String, Array, ..._typedArrays].map((Typ) => {
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
 *
 * @interface
 */
const Shallowclone = new Trait('Shallowclone');
Shallowclone.impl(Array, x => Array.from(x));

// From Constructor
[Map, Set, ..._maybeURL, Date, ..._typedArrays].map((Typ) => {
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
 *
 * @interface
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
[Set, ..._maybeURL, Date, ..._typedArrays].map((Typ) => {
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
 *
 * @interface
 */
const Pairs = new Trait('Pairs');
Pairs.impl(Map, x => x.entries());
[String, Array, ..._typedArrays].map((Typ) => {
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
 *
 * @interface
 */
const Get = new Trait('Get');
[Object, String, Array, ..._typedArrays].map((Typ) => {
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
 *
 * @interface
 */
const Has = new Trait('Has');
Has.impl(Object, (x, k) => k in x);
[String, Array, ..._typedArrays].map((Typ) => {
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
 *
 * @interface
 */
const Assign = new Trait('Assign');
[Object, Array, ..._typedArrays].map((Typ) => {
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
 *
 * @interface
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
 *
 * @interface
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
 *
 * @interface
 */
const Replace = new Trait('Replace');
Replace.implDerived([Get, Assign], ([get2, assign2], x, k, v) => {
  const r = get2(x, k);
  assign2(x, k, v);
  return r;
});

module.exports = {
  _typedArrays,
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
