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

/* eslint-disable no-use-before-define, class-methods-use-this */

/**
 * @module hashing
 * @description Hash tables and hashing objects.
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 */

const assert = require('assert');
const { inspect } = require('util');
const { randomBytes } = require('crypto');
const { h64: Xxhash64 } = require('xxhashjs');
const { encode: utf8encode } = require('fastestsmallesttextencoderdecoder');
const { first, map, second, each, Into, join, list, iter, all } = require('./sequence');
const { isdef, ifdef, type, typename, createFrom } = require('./typesafe');
const { withFunctionName, curry, mutate } = require('./functional');
const { Trait } = require('./trait');
const {
  _typedArrays, _maybeURL, assertEquals, size, Size, Equals, eq, Get, Has,
  Assign, Delete, Pairs, Shallowclone, Deepclone, deepclone,
} = require('./stdtraits');

const { assign } = Object;

// Binary Serialization ------------------------
//
// It strikes me, that considering the shier number of
// byte buffer helper methods a ferrum.binary module might
// be in order.

// Using reinterpret-cast introduces endian-specific features
assert(
  new DataView(new Uint16Array([0xff00]).buffer).getUint16(0, true) === 0xff00,
  'Is this running on a BigEndian system? ferrum.js currently supports only little endian',
);

/**
 * Dark magic conversion between different types of Typed Array.
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @private
 * @function
 * @param {TypedArray} buf The typed array to cast
 * @param {Function} T The target type
 * @returns {T}
 */
const _reinterpretCast = curry('_reinterpretCast', (buf, T) => {
  const rem = buf.byteLength % T.BYTES_PER_ELEMENT;
  assert(rem === 0, `Invalid cast: ${typename(type(buf))}[${buf.length}] to ${typename(T)}[]`);
  return new T(buf.buffer, buf.byteOffset, buf.byteLength / T.BYTES_PER_ELEMENT);
});

/**
 * Convert Uint8Array into a hex encoded string.
 *
 * ```js
 * const assert = require('assert');
 * const { bytes2hex, hash } = require('ferrum');
 *
 * // You can use this to derive a string value from hashes
 * assert.strictEqual(
 *   bytes2hex(hash({ foo: "Hello World" })),
 *   "8c363e9e1bcabde7");
 *
 * // Which is useful because now the === operator works properly.
 * // (=== on Uint8Array compares by identity, not by content)
 * assert(hash(1) !== hash(1));
 * assert(bytes2hex(hash(1)) === bytes2hex(hash(1)));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @param {Uint8Array} buf The buffer to convert into hex
 * @param {Function} T The target type
 * @returns {T}
 */
const bytes2hex = (b) => {
  assert(type(b) === Uint8Array, 'bytes2hex expects an Uint8Array');
  // eslint-disable-next-line no-bitwise
  return join(map(b, (v) => ((1 << 8) + v).toString(16).slice(1, 3)), '');
};

/**
 * Convert a hex encoded string to an Uint8Array.
 *
 * ```js
 * const { hex2bytes, assertEquals } = require('ferrum');
 *
 * assertEquals(
 *   hex2bytes("ff00ff00"),
 *   new Uint8Array([0xff, 0x00, 0xff, 0x00]));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @param {Uint8Array} buf The buffer to convert into hex
 * @param {Function} T The target type
 * @returns {T}
 */
const hex2bytes = (s) => {
  assert(type(s) === String, 'hex2bytes expects a string');
  assert(s.length % 2 === 0);
  const u8 = new Uint8Array(s.length / 2);
  for (let i = 0; i < u8.length; i++) {
    u8[i] = Number.parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return u8;
};

/**
 * Superclass for all typed arrays.
 *
 * https://262.ecma-international.org/6.0/#sec-%typedarray%-intrinsic-object
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @private
 * @function
 */
const _TypedArray = Object.getPrototypeOf(Int8Array);

/**
 * Expand a buffer if smaller than the given limit.
 * May return the original buffer or a new buffer.
 * Pads with zero 00 bytes.
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @private
 * @function
 * @param {Uint8Array} buf The typed array to pad
 * @param {Number} T The target size
 * @returns {Uint8Array}
 */
const _padToSize = curry('_padToSize', (buf, len) =>
  buf.length >= len
    ? buf
    : mutate(new Uint8Array(len), (a) =>
      a.set(buf)));

/**
 * Little trick to access the UINT64 implementation used by our xxhash crate.
 * Accessing it like this makes sure that this matches what is used by the
 * library lest we run into any type duplication issues.
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @private
 * @function
 */
const _u64 = type(Xxhash64(0, 0));

/**
 * Convert a _u64 to a byte array.
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @private
 * @function
 * @param {Uint8Array} buf
 * @returns {_u64}
 */
const _bytes2u64 = (buf) => _u64().fromString(bytes2hex(buf), 16);

/**
 * Convert a byte array to _u64.
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @private
 * @function
 * @param {Uint8Array} buf
 * @returns {_u64}
 */
const _u642bytes = (v) => hex2bytes(v.toString(16).padStart(16, '0'));

// Hashing as a function -----------------------

/**
 * Calculates the hash of the given value using the default hasher.
 *
 * ```js
 * const assert = require('assert')
 * const { hash, DefaultHasher, bytes2hex } = require('ferrum');
 *
 * assert.strictEqual(
 *   bytes2hex(hash({ foo: [1, 2] })),
 *   bytes2hex(DefaultHasher.new().update({ foo: [1, 2] }).digest()));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @param {*} v Anything that implements Hashable
 * @returns {Uint8Array}
 */
const hash = (v) =>
  new DefaultHasher().update(v).digest();

/**
 * Calculates the hash of the given value using some custom build hasher.
 *
 * ```js
 * const assert = require('assert')
 * const { hashWith, bytes2hex, randomBuildHasher } = require('ferrum');
 *
 * const bh = randomBuildHasher();
 * const h = hashWith(bh); // hashWith is curryable
 * assert.strictEqual(
 *   bytes2hex(h({ foo: [1, 2] })),
 *   bytes2hex(bh().update({ foo: [1, 2] }).digest()));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @param {*} v Anything that implements Hashable
 * @returns {Uint8Array}
 */
const hashWith = curry('hashWith', (v, buildHasher) =>
  buildHasher().update(v).digest());

/**
 * Hash multiple values using the default hasher.
 * This corresponds to repeated `.update()` calls.
 *
 * ```js
 * const assert = require('assert');
 * const { hashSeq, bytes2hex, DefaultHasher } = require('ferrum');
 *
 * assert.strictEqual(
 *   bytes2hex(hashSeq([{}, [1,2,3]])),
 *   bytes2hex(DefaultHasher.new().update({}).update([1,2,3]).digest()));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @param {*} v Sequence of anything that implements Hashable
 * @returns {Uint8Array}
 */
const hashSeq = (seq) => hashSeqWith(seq, () => new DefaultHasher());

/**
 * Hash multiple values using a custom buildHasher.
 * This corresponds to repeated `.update()` calls.
 *
 * ```js
 * const assert = require('assert')
 * const { hashSeqWith, bytes2hex, randomBuildHasher } = require('ferrum');
 *
 * const bh = randomBuildHasher();
 * assert.strictEqual(
 *   bytes2hex(hashSeqWith([{}, [1,2,3]], bh)),
 *   bytes2hex(bh().update({}).update([1,2,3]).digest()));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @param {*} v Sequence of anything that implements Hashable
 * @returns {Uint8Array}
 */
const hashSeqWith = curry('hashSeqWith', (seq, buildHasher) => {
  const h = buildHasher();
  each(seq, (v) => h.update(v));
  return h.digest();
});

/**
 * Hash multiple values using UnorderedHasher+DefaultHasher.
 * This corresponds to repeated `.update()` call; the order
 * doesn't matter.
 *
 * ```js
 * const assert = require('assert');
 * const {
 *   hashSeqWith, hashUnordered, bytes2hex, unorderedBuildHasher,
 *   defaultBuildHasher,
 * } = require('ferrum');
 *
 * assert.strictEqual(
 *   bytes2hex(hashUnordered([{}, [1,2,3]])),
 *   bytes2hex(hashSeqWith([[1,2,3], {}],
 *     unorderedBuildHasher(defaultBuildHasher()))));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @param {*} v Sequence of anything that implements Hashable
 * @returns {Uint8Array}
 */
const hashUnordered = (seq) =>
  hashUnorderedWith(seq, defaultBuildHasher());

/**
 * Hash multiple values using UnorderedHasher and a custom buildHasher.
 * This corresponds to repeated `.update()` call; the order
 * doesn't matter.
 *
 * ```js
 * const assert = require('assert')
 * const {
 *   hashSeqWith, bytes2hex, randomBuildHasher,
 *   unorderedBuildHasher, hashUnorderedWith,
 * } = require('ferrum');
 *
 * const bh = randomBuildHasher();
 * assert.strictEqual(
 *   bytes2hex(hashUnorderedWith([{}, [1,2,3]], bh)),
 *   bytes2hex(hashSeqWith([[1,2,3], {}],
 *     unorderedBuildHasher(bh))));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @param {*} v Sequence of anything that implements Hashable
 * @returns {Uint8Array}
 */
const hashUnorderedWith = curry('hashUnorderedWith', (seq, buildHasher) =>
  hashSeqWith(seq, unorderedBuildHasher(buildHasher)));

/**
 * This is really just a wrapper for DefaultHasher.new()
 * that needs to be invoked twice. While it really does nothing
 * of interest, it is provided so it can be used as a drop in replacement
 * for other buildHasher constructors like randomBuildHasher.
 *
 * A Hasher is an object that implements the Hasher interface (e.g.
 * DefaultHasher).  A buildHasher is a nullary (zero parameter function)
 * constructor for a Hasher (e.g. DefaultHasher.new). A genBuildHasher
 * produces a buildHasher; this function is a genBuildHasher.
 *
 * ```js
 * const assert = require('assert');
 * const { hashWith, bytes2hex, defaultBuildHasher, hash } = require('ferrum');
 *
 * const h1 = hash({ foo: [1, 2] });
 * const h2 = hashWith({ foo: [1, 2] }, defaultBuildHasher());
 * const h3 = defaultBuildHasher()().update({ foo: [1, 2] }).digest();
 * assert.strictEqual(bytes2hex(h1), bytes2hex(h2));
 * assert.strictEqual(bytes2hex(h1), bytes2hex(h3));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @returns {Function} DefaultHasher.new
 */
const defaultBuildHasher = () => DefaultHasher.new;

/**
 * Create a new buildHasher using a seed.
 *
 * A Hasher is an object that implements the Hasher interface (e.g.
 * DefaultHasher).  A buildHasher is a nullary (zero parameter function)
 * constructor for a Hasher (e.g. DefaultHasher.new). A genBuildHasher
 * produces a buildHasher; this function is a genBuildHasher.
 *
 * ```js
 * const assert = require('assert')
 * const { hashWith, bytes2hex, seededBuildHasher, hash } = require('ferrum');
 *
 * const s1 = seededBuildHasher(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]));
 * const s2 = seededBuildHasher(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]));
 * assert.strictEqual(
 *   bytes2hex(hashWith({ foo: 1 }, s1)),
 *   bytes2hex(hashWith({ foo: 1 }, s1)));
 * assert.notStrictEqual(
 *   bytes2hex(hashWith({ foo: 1 }, s1)),
 *   bytes2hex(hashWith({ foo: 1 }, s2)));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @returns {Function} DefaultHasher.new
 */
const seededBuildHasher = (s) => () => DefaultHasher.fromSeed(s);

/**
 * Create a new buildHasher using a random seed.
 *
 * This is mostly useful as a mitigation against attacks like [hashdos](https://en.wikipedia.org/wiki/Collision_attack).
 * Using this is usually a better choice of default buildHasher than defaultBuildHasher.
 *
 * A Hasher is an object that implements the Hasher interface (e.g.
 * DefaultHasher).  A buildHasher is a nullary (zero parameter function)
 * constructor for a Hasher (e.g. DefaultHasher.new). A genBuildHasher
 * produces a buildHasher; this function is a genBuildHasher.
 *
 * ```js
 * const assert = require('assert')
 * const { hashWith, bytes2hex, randomBuildHasher, hash } = require('ferrum');
 *
 * const r1 = randomBuildHasher();
 * const r2 = randomBuildHasher();
 * assert.strictEqual(
 *   bytes2hex(hashWith({ foo: 1 }, r1)),
 *   bytes2hex(hashWith({ foo: 1 }, r1)));
 * assert.notStrictEqual(
 *   bytes2hex(hashWith({ foo: 1 }, r1)),
 *   bytes2hex(hashWith({ foo: 1 }, r2)));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @returns {Function} DefaultHasher.new
 */
const randomBuildHasher = () => {
  // NOTE: This is used by default in HashMap and HashSet.
  // Technically, a hash dos attack should not be possible there
  // as the implementation doesn't truncate the hashes and just forwards
  // to ES6 Map/Set. Still, we use this as a precaution.
  const seed = new Uint8Array(randomBytes(8));
  return () => new DefaultHasher(seed);
};

/**
 * BuildHasher for UnorderedHasher.
 *
 * A Hasher is an object that implements the Hasher interface (e.g.
 * DefaultHasher).  A buildHasher is a nullary (zero parameter function)
 * constructor for a Hasher (e.g. DefaultHasher.new).  A genBuildHasher
 * produces a buildHasher; this function is a genBuildHasher.
 *
 * ```js
 * const assert = require('assert')
 * const {
 *   hashSeqWith, bytes2hex, randomBuildHasher, unorderedBuildHasher, hash
 * } = require('ferrum');
 *
 * const r1 = randomBuildHasher();
 * assert.strictEqual(
 *   bytes2hex(hashSeqWith([23, {}], unorderedBuildHasher(r1))),
 *   bytes2hex(hashSeqWith([{}, 23], unorderedBuildHasher(r1))));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @returns {Function} DefaultHasher.new
 */
const unorderedBuildHasher = (bh) => () => new UnorderedHasher(bh);

// Hashable Trait ------------------------------

/**
 * Static ids for values (encoded in hashDirectly)
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @private
 * @constant {Map}
 */
const _sentinels = new Map([
  [null, hex2bytes('6218ef48d321422fa9b4416563903f05')],
  [undefined, hex2bytes('0308394d20384acda38432c81d0654ed')],
  [true, hex2bytes('24817a77c9374571a9469a92faed50b3')],
  [false, hex2bytes('74070422bb654cf788c9bef90900a8f2')],
]);

/**
 * Static ids for data structures (not encoded in hashDirectly)
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @private
 * @constant {Map}
 */
const _hiddenSentinels = new Map([
  [String, hex2bytes('8d26e056afd2415bb6f04275834b9556')],
  [Number, hex2bytes('83e6c49a92974e538492effa3f3fc9ef')],
  [RegExp, hex2bytes('6a219bf479554129a769ba110d968303')],
  [Date, hex2bytes('7942d12592b4d788e8555f14a58a07b7')],
  [Uint16Array, hex2bytes('93428a41c29e4189bb9d26f7da2dab63')],
  [Uint32Array, hex2bytes('40e4a84157494c5d8a4c276da55b6de9')],
  [Int8Array, hex2bytes('85d7ace97e9c44e8bcd5bd1f677edc5d')],
  [Int16Array, hex2bytes('8a63c848aa48497a817a1211c25e7d80')],
  [Int32Array, hex2bytes('e58a9ac9aea649b4b62cb2db9a769923')],
  [Float32Array, hex2bytes('b21f8b12e1cd48f0b6fdf4a38f47ac54')],
  [Float64Array, hex2bytes('8c1042373eac47f5ac9bfd3cb35a1712')],
  [Uint8ClampedArray, hex2bytes('ac7a375bae79481b03edd8d6e5c4a677')],
  [Array, hex2bytes('91f577ca5dd54b349beceb7c25e5d99f')],
  [Map, hex2bytes('dd8bb2d529c54f179dc8d34cb5f6be5e')],
  [Set, hex2bytes('c9ec2fae963140449b43deea8672fa7e')],
  [Object, hex2bytes('18475aed45774f40b615ca5db86d39aa')],
]);

/**
 * Convert basic data types into byte sequences.
 *
 * The following serialization rules are used:
 *
 * - Typed arrays into their little endian representation
 * - Strings as UTF-8
 * - As a single element [Float64Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float64Array).
 * - `null` as `hex2bytes('6218ef48d321422fa9b4416563903f05')`
 * - `undefined` as `hex2bytes('0308394d20384acda38432c81d0654ed')`
 * - `true` as `hex2bytes('24817a77c9374571a9469a92faed50b3')`
 * - `false` as `hex2bytes('74070422bb654cf788c9bef90900a8f2')`,
 *
 * Other types currently result in an error, but further types may be
 * added in the future.
 *
 * ```js
 * const assert = require('assert');
 * const { hash, hashDirectly, bytes2hex, hex2bytes } = require('ferrum');
 *
 * const h1 = hash(hashDirectly(0));
 * const h2 = hash(hex2bytes('0000000000000000'));
 * assert.strictEqual(bytes2hex(h1), bytes2hex(h2));
 *
 * // Without hashDirectly numbers are hashed in a more complex way
 * // that involves the use of type tagging.
 * const h3 = hash(0);
 * assert.notStrictEqual(bytes2hex(h1), bytes2hex(h3));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @param
 * @returns {Uint8Array}
 */
const hashDirectly = (v) => {
  const c = _sentinels.get(v);
  if (isdef(c)) {
    return new Uint8Array(c);
  } else if (v instanceof _TypedArray) {
    return _reinterpretCast(v, Uint8Array);
  } else if (type(v) === String) {
    return new Uint8Array(utf8encode(v));
  } else if (type(v) === Number) {
    return hashDirectly(new Float64Array([v]));
  } else {
    return assert(false, `Don't know hot to byteEncode ${v}`);
  }
};

/**
 * Convert a variety of types used as primitives in our
 * binary encoding scheme to binary
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @private
 * @function
 * @param {Uint8Array} buf
 * @returns {_u64}
 */
const _bin = (v) => {
  const c = _sentinels.get(v) || _hiddenSentinels.get(v);
  if (isdef(c)) {
    return c;
  } else {
    return hashDirectly(v);
  }
};

const _hashEach = (hasher, seq) =>
  each(seq, (e) => hasher.update(e));
const _hashEachRaw = (hasher, seq) =>
  each(seq, (e) => hasher.update(_bin(e)));

/**
 * The Hashable interface must be implemented by any object that
 * can be hashed.
 *
 * ```js
 * const assert = require('assert');
 * const {
 *   Hashable, bytes2hex, hashDirectly, hashUnorderedWith, iter,
 *   hashWith, hex2bytes, randomBuildHasher, curry, builder,
 * } = require('ferrum');
 *
 * class UnorderedPair {
 *   constructor(fst, scd) {
 *     Object.assign(this, { fst, scd });
 *   }
 *
 *   [Hashable.sym](hasher) {
 *     // It is a best practice to start any container with a uuid
 *     // and the container size, so differently sized containers
 *     // and containers of different types produce different hashes.
 *     // We could supply uuid & the size without bytes2hex or hashDirectly,
 *     // but using those has two advantages: (1) They are faster and
 *     // (2) using them bypasses any special behaviour in the Hasher
 *     // defined for numbers or strings.
 *     // We only want that special behaviour to be  used on actual content
 *     // not the header of our type
 *     hasher.update(hex2bytes('d5bb31067ea846c197dcac3cae48f327'));
 *     hasher.update(hashDirectly(2));
 *
 *     // Since we're a UnorderedPair we want the order of the elements
 *     // to not matter so we should use hashUnorderedWith. We use the
 *     // hasher's buildHasher in case that implements any special behaviour.
 *     // If we did not need order independence, we would just iterate over the
 *     // elements: `each(this, (v) => hasher.update(v))`
 *     hasher.update(hashUnorderedWith(this, hasher.buildHasher));
 *   }
 *
 *   [Symbol.iterator]() {
 *     return iter([this.fst, this.scd]);
 *   }
 * };
 *
 * UnorderedPair.new = curry('UnorderedPair.new', builder(UnorderedPair));
 *
 * const h = hashWith(randomBuildHasher());
 * assert.strictEqual(
 *   bytes2hex(h(UnorderedPair.new({}, 42))),
 *   bytes2hex(h(UnorderedPair.new({}, 42))));
 * ```
 * **By default implemented for:** String, Number, Boolean, RegExp,
 * Date, Symbol, Function, null, undefined, typed arrays, URL, Set,
 * Map, Object
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @interface
 */
const Hashable = new Trait('Hashable');

// Hash directly (these are sentinel values themselves)
each([null, undefined, true, false], (val) =>
  Hashable.implStatic(val, (_val, hasher) =>
    _hashEachRaw(hasher,
      [val])));

// Hash directly but include sentinels
each([Number], (T) =>
  Hashable.impl(T, (val, hasher) =>
    _hashEachRaw(hasher,
      [T, val])));

// Hash directly but include size and sentinel
each([String, ..._typedArrays], (T) =>
  Hashable.impl(T, (val, hasher) =>
    _hashEachRaw(hasher,
      [T, size(val), val])));

// Hash using string representation
each([..._maybeURL, RegExp], (T) => {
  Hashable.impl(T, (val, hasher) => {
    const s = String(val);
    _hashEachRaw(hasher, [T, s.length, s]);
  });
});

// Hash based on contents
Hashable.impl(Array, (val, hasher) => {
  _hashEachRaw(hasher, [Array, size(val)]);
  _hashEach(hasher, val);
});

// Sequence order independently
each([Set, Map, Object], (T) =>
  Hashable.impl(T, (val, hasher) =>
    _hashEachRaw(hasher,
      [T, size(val), hashUnorderedWith(val, hasher.buildHasher)])));

// toString of Date() is locale dependant
Hashable.impl(Date, (val, hasher) =>
  _hashEachRaw(hasher, [Date, val.toISOString()]));

// Hashers (visitors) --------------------------

/**
 * The Hasher interface is used to implement custom hash functions
 * and construct hashers with special behaviours.
 *
 * It is a regular old protocol specifying which methods/properties must be implemented.
 * It is *not* a trait.
 *
 * ### Implementations
 *
 * - [DefaultHasher](module-hashing-DefaultHasher.html) is the
 *   standard hash function used by ferrum
 * - [UnorderedHasher](module-hashing-UnorderedHasher.html) is a
 *   Hasher wrapper that makes sure .update() calls are processed
 *   in such a way so that the submission order does not matter.
 *
 * ### Members
 *
 * - [buildHasher()](module-hashing-DefaultHasher.html#buildHasher)
 * - [update()](module-hashing-DefaultHasher.html#update)
 * - [digest()](module-hashing-DefaultHasher.html#digest)
 *
 * ## Adapter that treats undefined as null
 *
 * Because Hashers are called for every element in the hash tree
 * like a visitor, they can be used to implement special behaviors.
 *
 * In this example we implement a generic hasher that applies a function
 * to each element being hashed, before hashing. This allows replacing
 * values and more complex transformations.
 *
 * ```js
 * const assert = require('assert');
 * const {
 *   defaultBuildHasher, curry, hashWith, bytes2hex, builder,
 *   randomBuildHasher, type, Hashable,
 * } = require('ferrum');
 *
 * class UndefinedIsNullHasher {
 *   constructor(buildHasher = defaultBuildHasher()) {
 *     Object.assign(this, {
 *       // The buildHasher property must be provided; this is
 *       // used in some special cases, like unordered hashing
 *       buildHasher: () => UndefinedIsNullHasher.new(buildHasher),
 *       _inner: buildHasher(),
 *     })
 *   }
 *
 *   update(v) {
 *     // Uint8Array is our base type for hashing; all other types
 *     // reduce to Uint8Array
 *     if(type(v) === Uint8Array) {
 *       this._inner.update(v);
 *     } else {
 *       // Replace each undefined with null
 *       Hashable.invoke(v === undefined ? null : v, this);
 *     }
 *     return this;
 *   }
 *
 *   digest() {
 *     return this._inner.digest();
 *   }
 * };
 *
 * UndefinedIsNullHasher.new = curry('UndefinedIsNullHasher.new',
 *   builder(UndefinedIsNullHasher));
 *
 * const r = randomBuildHasher();
 * const h = hashWith(() => UndefinedIsNullHasher.new());
 * assert.strictEqual(
 *   bytes2hex(h([[[null]]])),
 *   bytes2hex(h([[[undefined]]])));
 * ```
 *
 * ## Sophisticated hasher integrating object hash
 *
 * Ferrum requires you to implement Hashable for each type; you could
 * get around this by implementing a hasher that integrates the object-hash
 * library which can arbitrary types. You could also integrate the library
 * by using Hashable.implWild, but this Version is less dangerous as it doesn't
 * change the behaviour globally.
 *
 * ```js
 * const liboh = require('object-hash');
 * const assert = require('assert');
 * const {
 *   defaultBuildHasher, curry, hashWith, bytes2hex, HashSet,
 *   assertEquals, Hashable, valueSupports, builder, Equals,
 *   randomBuildHasher, type,
 * } = require('ferrum');
 *
 * class LibOHHasher {
 *   constructor(buildHasher) {
 *     Object.assign(this, {
 *       buildHasher: () => LibOHHasher.new(buildHasher),
 *       _inner: buildHasher(),
 *     });
 *   }
 *
 *   update(v) {
 *     // Uint8Array is our base type for hashing; all other types
 *     // reduce to Uint8Array
 *     if(type(v) === Uint8Array) {
 *       this._inner.update(v);
 *       return this;
 *     }
 *
 *     // Check if a ferrum base implementation exists
 *     const impl = Hashable.lookupValue(v);
 *     if (impl) {
 *       impl(v, this);
 *       return this;
 *     }
 *
 *     // No ferrum implementation, fallback to object hash;
 *     // providing a replacer makes sure we try to use ferrum
 *     // hashing for inner values before falling back to OH again
 *     this._inner.update(new Uint8Array(liboh(v, {
 *       encoding: 'buffer',
 *       replacer: (w) =>
 *         valueSupports(w, Hashable)
 *           ? bytes2hex(hashWith(w, this.buildHasher))
 *           : w})));
 *     return this;
 *   }
 *
 *   digest() {
 *     return this._inner.digest();
 *   }
 * };
 *
 * LibOHHasher.new = curry('LibOHHasher.new', builder(LibOHHasher));
 *
 * const libohRandomBuildHasher = () => {
 *   const r = randomBuildHasher();
 *   return () => LibOHHasher.new(r);
 * };
 *
 * class UnsupportedType {
 *   constructor(fields) {
 *     Object.assign(this, fields);
 *   }
 * };
 * UnsupportedType.new = curry('UnsupportedType.new', builder(UnsupportedType));
 *
 * class SupportedType {
 *   [Hashable.sym](hasher) {
 *     hasher.update(42); // So we can test this
 *   }
 *   // eq(a, b) <=> hash(a) = hash(B)
 *   [Equals.sym](otr) {
 *     return type(otr) === SupportedType;
 *   }
 * };
 * SupportedType.new = curry('SupportedType.new', builder(SupportedType));
 *
 * // A normal HashSet will not be able to store our custom type
 * assert.throws(() =>
 *   HashSet.fromSeq([UnsupportedType.new({})]));
 *
 * // But we can substitute our custom hasher which will be able to use object-hash
 * // as a fallback (using currying here)
 * const libOhHashSetFromSeq = HashSet.fromSeqWithOpts({
 *   genBuildHasher: libohRandomBuildHasher
 * });
 *
 * const hm = libOhHashSetFromSeq([
 *   UnsupportedType.new({}),
 *   UnsupportedType.new({}), // Same as previous
 *   UnsupportedType.new({ bar: SupportedType.new() }),
 *   UnsupportedType.new({ bar: 42 }), // Same as previous
 * ]);
 * assert.strictEqual(hm.size, 2);
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @interface Hasher
 */
/**
 * Most tree-like structures are hashed directly into the main hasher; but in some cases
 * this is not possible; e.g. order independent hashing – used in associative containers –
 * require the calculation of intermediate hash values. For these cases hashers must provide
 * the buildHasher property.
 *
 * It must be a property (or a method with bound this).
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @name Hasher#buildHasher
 * @returns Hasher
 */

/**
 * Add some more data to the hasher.
 *
 * This may throw an error if digest() was called before.
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @name Hasher#update
 * @param {*} v
 * @returns {Hasher} this, for chaining
 */

/**
 * Produce a hash value from all the data supplied with update().
 * This may throw an error if digest() was called before.
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @method
 * @name Hasher#digest
 * @returns {Uint8Array}
 */

/**
 * Built in hash function.
 *
 * This is currently based on the xxhashjs library and should optimally
 * be supplied with an 8-byte seed produces an 8-byte long hash, but these
 * parameters may be changed in the future.
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @class
 * @param {Uint8Array} seed – Optional; should be 8 bytes long.
 *   Will be padded with zeroes on the right if too short and compressed by hashing
 *   with the default seed if longer.
 * @param {Object} opts – Optional
 * @param {Boolean} opts.allowReuse – Default: false; if this is true
 *   digest() can be called multiple times.
 * @implements Hasher
 * @implements Shallowclone
 * @implements Deepclone
 */
class DefaultHasher {
  constructor(seed = new Uint8Array(8), opts = {}) {
    const { allowReuse = false } = opts;

    if (seed.length < 8) {
      seed = mutate(new Uint8Array(8), (s) => s.set(seed));
    } else if (seed.length > 8) {
      seed = hashWith(seed, DefaultHasher.new);
    }

    assign(this, {
      buildHasher: () => new DefaultHasher(seed, opts),
      _allowReuse: allowReuse,
      _state: new Xxhash64(_bytes2u64(seed)),
    });
  }

  // so the documentation gets generated correctly *sigh*
  buildHasher() {}

  update(v) {
    this._noReuse();
    if (type(v) === Uint8Array) {
      this._state.update(v.buffer);
    } else {
      Hashable.invoke(v, this);
    }
    return this;
  }

  digest() {
    this._noReuse();
    let s = null;
    if (this._allowReuse) {
      s = this._cloneState();
    } else {
      s = this._state;
      this._state = null;
    }
    return _u642bytes(s.digest());
  }

  _noReuse() {
    assert(isdef(this._state), 'Called digest() multiple times');
  }

  _cloneState() {
    // This is quite hacky, but then again the entire xxhash lib
    // is quite hacky. Maybe we need a custom, streaming murmurhash
    // implementation after all...
    const { _state: s } = this;
    return createFrom(Xxhash64, {
      // _u64
      seed: s.seed.clone(),
      v1: s.v1.clone(),
      v2: s.v2.clone(),
      v3: s.v3.clone(),
      v4: s.v4.clone(),
      // number
      total_len: s.total_len,
      memsize: s.memsize,
      // u8[]
      memory: deepclone(s.memory),
    });
  }

  [Deepclone.sym]() {
    return createFrom(DefaultHasher, {
      _allowReuse: this._allowReuse,
      _state: this._cloneState(),
      _buildHasher: this._buildHasher,
    });
  }

  [Shallowclone.sym]() {
    return deepclone(this);
  }
}

/**
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @method
 * @returns {DefaultHasher}
 */
DefaultHasher.new = withFunctionName('DefaultHasher.new',
  () => new DefaultHasher());
/**
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @method
 * @param {Uint8Array} seed
 * @returns {DefaultHasher}
 */
DefaultHasher.fromSeed = withFunctionName('DefaultHasher.fromSeed',
  (seed) => new DefaultHasher(seed));
/**
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @method
 * @param {Object} opts
 * @param {Uint8Array} opts.seed
 * @param {Boolean} opts.allowReuse
 * @returns {DefaultHasher}
 */
DefaultHasher.withOpts = curry('DefaultHasher.fromSeedWithOpts',
  ({ seed, ...rest }) => new DefaultHasher(seed, rest));

/**
 * Hash function adapter so that the order of .update() calls doesn't matter.
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @class
 * @param {Function} buildHasher
 *   Function that produces an instance of the inner buildHasher.
 *   Defaults to defaultBuildHasher(). You could use seededBuildHasher
 *   or randomBuildHasher too.
 * @param {Object} opts – Optional
 * @param {Boolean} opts.allowReuse – Default: false; if this is true
 *   digest() can be called multiple times.
 * @implements Hasher
 * @implements Shallowclone
 * @implements Deepclone
 */
class UnorderedHasher {
  constructor(buildHasher = defaultBuildHasher(), opts = {}) {
    const { allowReuse = false } = opts;
    assign(this, {
      buildHasher,
      _state: [],
      _allowReuse: allowReuse,
    });
  }

  // so the documentation gets generated correctly *sigh*
  buildHasher() {}

  update(v) {
    // We just keep the hashes and sort them in the output stage
    this._state.push(hashWith(v, this.buildHasher));
    return this;
  }

  digest() {
    this._noReuse();
    this._state.sort(); // Sorting for order independence
    const r = hashSeqWith(this._state, this.buildHasher);
    this._state = this._allowReuse ? this._state : null;
    return r;
  }

  _noReuse() {
    assert(isdef(this._state), 'Called digest() multiple times');
  }

  [Deepclone.sym]() {
    return createFrom(UnorderedHasher, {
      _allowReuse: this._allowReuse,
      _state: deepclone(this._state),
      buildHasher: this.buildHasher,
    });
  }

  [Shallowclone.sym]() {
    return deepclone(this);
  }
}

/**
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @method
 * @returns {UnorderedHasher}
 */
UnorderedHasher.new = withFunctionName('UnorderedHasher.new',
  () => new UnorderedHasher());

/**
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @method
 * @param {Uint8Array} seed
 * @returns {UnorderedHasher}
 */
UnorderedHasher.fromBuildHasher = withFunctionName('UnorderedHasher.fromBuildHasher',
  (bh) => new UnorderedHasher(bh));
/**
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @method
 * @param {Object} opts
 * @param {Function} opts.buildHasher
 * @param {Boolean} opts.allowReuse
 * @returns {UnorderedHasher}
 */
UnorderedHasher.withOpts = curry('UnorderedHasher.fromSeedWithOpts',
  ({ buildHasher, ...rest }) => new UnorderedHasher(buildHasher, rest));

// Hash Tables ---------------------------------

/**
 * Key/Value container.
 *
 * Implements the same interface ES6 [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map),
 * except that keys are compared based on equality using a hash function and not based on identity.
 *
 * Iterates its elements in insertion order.
 *
 * ```js
 * const assert = require('assert');
 * const { hashmap } = require('ferrum');
 *
 * const m = new Map([ [{}, 42] ]);
 * assert(!m.has({})); // Identity based comparison
 *
 * const hm = hashmap([ [{}, 42] ]);
 * assert(hm.has({}));
 * assert.strictEqual(hm.get({}), 42);
 * ```
 *
 * Iteration order is defined to be the order of insertation
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @class
 * @param {Sequence} seq Any sequence of key value pairs. Optional.
 * @param {Object} opts
 * @param {Function} opts.genBuildHasher A function that creates a new build hasher.
 *   Which in turn is a function that instantiates a hasher so genBuildHasher()()
 *   instantiates a hasher. This is admittedly a bit over complex. The default
 *   value is randomBuildHasher; the practical upshot here is that this construction
 *   allows us to rerandomize the seed even when deepclone() or shallowclone() is used.
 *   The downside is that supplying a simple hasher is quite a bit of work.
 *
 *   [Hasher](module-hashing-Hasher.html) contains an example of
 *   how this property can be used to implement a hash table that
 *   utilizes the object-hash library to hash unknown types.
 * @implements Shallowclone
 * @implements Deepclone
 * @implements Into
 * @implements Size
 * @implements Equals
 * @implements Hashable
 * @implements Get
 * @implements Has
 * @implements Assign
 * @implements Delete
 * @implements Sequence
 * @implements Pairs
 * @implements inspect.custom
 */
class HashMap {
  constructor(seq, opts = {}) {
    const { genBuildHasher = randomBuildHasher } = opts;
    assign(this, {
      genBuildHasher,
      _hashFn: hashWith(genBuildHasher()),
      _table: new Map(),
    });
    if (isdef(seq)) each(seq, ([k, v]) => this.set(k, v));
  }

  _hash(v) {
    const h = this._hashFn(v);
    return h instanceof Uint8Array ? bytes2hex(h) : h;
  }

  // Is equiv to constructor
  static [Into.sym](seq) {
    return new this(seq);
  }

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   */
  clear() {
    this._table.clear();
  }

  // Size

  /**
   * Getter, not a method. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/size
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   *
   * @method
   */
  get size() {
    return this._table.size;
  }

  [Size.sym]() {
    return this._table.size;
  }

  [Equals.sym](otr) {
    const compareKV = ([k, v]) => {
      const p = otr._table.get(otr._hash(k));
      return isdef(p) ? eq(v, p[1]) : false;
    };
    return otr instanceof HashMap
      && this.size === otr.size
      && all(map(this, compareKV));
  }

  [Hashable.sym](hasher) {
    _hashEachRaw(hasher, [
      hex2bytes('eb9ea4e9e1144658f95596e5523fc4'),
      hashDirectly(this.size),
      hashUnorderedWith(this, hasher.buildHasher)]);
  }

  // Setting/getting keys

  /**
   * Returns a key/value pair given a key. This is added so
   * users can access the key as it is stored in the table.
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   *
   * @method
   * @param {*} key
   * @returns {Array} A key/vaue pair
   */
  getPair(key) {
    const p = this._table.get(this._hash(key));
    return ifdef(p, list); // clone the pair
  }

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   * @param {*} key
   * @returns {*} the value
   */
  get(key) {
    return ifdef(this.getPair(key), second);
  }

  [Get.sym](key) {
    return this.get(key);
  }

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   * @param {*} key
   * @returns {Boolean}
   */
  has(key) {
    return this._table.has(this._hash(key));
  }

  [Has.sym](key) {
    return this.has(key);
  }

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   * @param {*} key
   * @param {*} val
   * @returns {HashMap} this
   */
  set(key, val) {
    this._table.set(this._hash(key), [key, val]);
    return this;
  }

  [Assign.sym](key, val) {
    this.set(key, val);
  }

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   * @param {*} key
   * @returns {Boolean}
   */
  delete(key) {
    return this._table.delete(this._hash(key));
  }

  [Delete.sym](key) {
    this.delete(key);
  }

  // Iteration

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   * @returns {Iterator}
   */
  entries() {
    // Clone each key/value pair so the caller cannot possibly
    // mutate the pair
    return map(this._table.values(), list);
  }

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   * @returns {Iterator}
   */
  keys() {
    return map(this._table.values(), first);
  }

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   * @returns {Iterator}
   */
  values() {
    return map(this._table.values(), second);
  }

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   * @param {Function} fn
   * @param {*} thisArg
   */
  forEach(fn, thisArg) {
    each(this, ([k, v]) => fn.call(thisArg, k, v, this));
  }

  [Symbol.iterator]() {
    return this.entries();
  }

  [Pairs.sym]() {
    return this.entries();
  }

  // Cloning

  [Shallowclone.sym]() {
    const opts = { genBuildHasher: this.genBuildHasher };
    return HashMap.fromSeqWithOpts(this, opts);
  }

  [Deepclone.sym]() {
    const opts = { genBuildHasher: this.genBuildHasher };
    return HashMap.fromSeqWithOpts(map(this, deepclone), opts);
  }

  // Inspecting

  [inspect.custom](_, options) {
    const { depth } = options;
    // TODO: Is this tooo tricky?
    return `Hash${inspect(new Map(this), {
      options,
      depth: depth === null ? null : depth - 1,
    })}`;
  }
}

/**
 * Constructs an empty hashmap
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @method
 * @returns {HashMap}
 */
HashMap.new = withFunctionName('HashMap.new', () => new HashMap());
/**
 * Constructs a hashmap from a sequence
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @method
 * @param {Sequence} seq
 * @returns {HashMap}
 */
HashMap.fromSeq = withFunctionName('HashMap.fromSeq',
  (seq) => new HashMap(iter(seq)));
/**
 * Constructs a hashmap from a sequence and options
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @method
 * @param {Sequence} seq
 * @param {Options} opts
 * @param {Function} opts.genBuildHasher
 * @returns {HashMap}
 */
HashMap.fromSeqWithOpts = curry('HashMap.fromSeqWithOpts',
  (seq, opts) => new HashMap(iter(seq), opts));

/**
 * Constructs a hashmap from a sequence
 *
 * ```js
 * const assert = require('assert');
 * const { hashmap } = require('ferrum');
 *
 * const hm = hashmap([[{}, 42], [[], 23]]);
 * assert.strictEqual(hm.size, 2);
 * assert.strictEqual(hm.get({}), 42);
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 *
 * @function
 * @param {Sequence} seq
 * @returns {HashMap}
 */
const hashmap = HashMap.fromSeq;

/**
 * Container that makes sure it contains each element just one time.
 *
 * Implements the same interface ES6 [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set),
 * except that keys are compared based on equality using a hash function and not based on identity.
 *
 * Iterates its elements in insertion order.
 *
 * ```js
 * const assert = require('assert');
 * const { hashset } = require('ferrum');
 *
 * const m = new Set([ {} ]);
 * assert(!m.has({})); // Identity based comparison
 *
 * const hm = hashset([ {} ]);
 * assert(hm.has({}));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @class
 * @param {Sequence} seq Any sequence. Optional.
 * @param {Object} opts
 * @param {Function} genBuildHasher A function that creates a new build hasher.
 *   Which in turn is a function that instantiates a hasher so genBuildHasher()()
 *   instantiates a hasher. This is admittedly a bit over complex. The default
 *   value is randomBuildHasher; the practical upshot here is that this construction
 *   allows us to rerandomize the seed even when deepclone() or shallowclone() is used.
 *   The downside is that supplying a simple hasher is quite a bit of work.
 *
 *   [Hasher](module-hashing-Hasher.html) contains an example of
 *   how this property can be used to implement a hash table that
 *   utilizes the object-hash library to hash unknown types.
 * @implements Shallowclone
 * @implements Deepclone
 * @implements Into
 * @implements Size
 * @implements Equals
 * @implements Hashable
 * @implements Get
 * @implements Has
 * @implements Assign
 * @implements Delete
 * @implements Sequence
 * @implements Pairs
 * @implements inspect.custom
 */
class HashSet {
  // Construction

  constructor(seq, opts = {}) {
    const { genBuildHasher = randomBuildHasher } = opts;
    assign(this, {
      genBuildHasher,
      _hashFn: hashWith(genBuildHasher()),
      _table: new Map(),
    });
    if (isdef(seq)) each(seq, (v) => this.add(v));
  }

  _hash(v) {
    const h = this._hashFn(v);
    return h instanceof Uint8Array ? bytes2hex(h) : h;
  }

  static [Into.sym](seq) {
    return new this(seq);
  }

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   */
  clear() {
    this._table.clear();
  }

  // Size

  /**
   * Getter, not a method. See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/size
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   *
   * @method
   */
  get size() {
    return this._table.size;
  }

  [Size.sym]() {
    return this._table.size;
  }

  // Comparison

  [Equals.sym](otr) {
    return true
      && otr instanceof HashSet
      && this.size === otr.size
      && all(map(this, (k) => otr.has(k)));
  }

  // Hashing

  // NOP; already checked…
  [Hashable.sym](hasher) {
    _hashEachRaw(hasher, [
      hex2bytes('6694d09c346844f0bbc19d40e0a24e8f'),
      this.size,
      hashUnorderedWith(this, hasher.buildHasher)]);
  }

  // Setting/getting keys

  /**
   * Given a key, returns a reference to the version
   * stored in the hash table.
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   *
   * @method
   * @param {*} key
   * @returns {*} The key, as stored in the HashSet
   */
  get(key) {
    return this._table.get(this._hash(key));
  }

  [Get.sym](key) {
    return this.get(key);
  }

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   * @param {*} key
   * @returns {Boolean}
   */
  has(key) {
    return this._table.has(this._hash(key));
  }

  [Has.sym](key) {
    return this.has(key);
  }

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   * @param {*} key
   * @returns {HashSet} this
   */
  add(key) {
    const h = this._hash(key);
    if (!this._table.has(h)) this._table.set(h, key);
    return this;
  }

  [Assign.sym](key, val) {
    assertEquals(key, val, 'For HashSets, the key and value must be the same');
    this.add(val);
  }

  /**
   * @method
   * @param {*} key
   * @returns {Boolean}
   */
  delete(key) {
    return this._table.delete(this._hash(key));
  }

  [Delete.sym](key) {
    this.delete(key);
  }

  // Iteration

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   * @returns {Iterator}
   */
  entries() {
    return map(this.values(), (v) => [v, v]);
  }

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   * @returns {Iterator}
   */
  values() {
    return this._table.values();
  }

  /**
   *
   * # Version history
   *
   * - 1.9.0 Initial implementation
   *
   * @method
   * @param {Function} fn
   * @param {*} thisArg
   */
  forEach(fn, thisArg) {
    each(this, (v) => fn.call(thisArg, v, v, this));
  }

  [Symbol.iterator]() {
    return this.values();
  }

  [Pairs.sym]() {
    return this.entries();
  }

  // Cloning

  [Shallowclone.sym]() {
    const opts = { genBuildHasher: this.genBuildHasher };
    return HashSet.fromSeqWithOpts(this, opts);
  }

  [Deepclone.sym]() {
    const opts = { genBuildHasher: this.genBuildHasher };
    return HashSet.fromSeqWithOpts(map(this, deepclone), opts);
  }

  // Inspecting

  [inspect.custom](_, options) {
    const { depth } = options;
    // TODO: Is this too clever?
    return `Hash${inspect(new Set(this), {
      options,
      depth: depth === null ? null : depth - 1,
    })}`;
  }
}

/**
 * Constructs an empty hashset
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @method
 * @returns {HashSet}
 */
HashSet.new = withFunctionName('HashSet.new',
  () => new HashSet());
/**
 * Constructs a hashset from a sequence
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @method
 * @param {Sequence} seq
 * @returns {HashSet}
 */
HashSet.fromSeq = withFunctionName('HashSet.fromSeq',
  (seq) => new HashSet(iter(seq)));
/**
 * Constructs a hashset from a sequence and options
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @method
 * @param {Sequence} seq
 * @param {Options} opts
 * @param {Function} opts.genBuildHasher
 * @returns {HashSet}
 */
HashSet.fromSeqWithOpts = curry('HashSet.fromSeqWithOpts',
  (seq, opts) => new HashSet(iter(seq), opts));

/**
 * Constructs a hashset from a sequence
 *
 * ```js
 * const assert = require('assert');
 * const { hashset } = require('ferrum');
 *
 * const hm = hashset([32, {}, 42, []]);
 * assert.strictEqual(hm.size, 4);
 * assert(hm.has([]));
 * ```
 *
 * # Version history
 *
 * - 1.9.0 Initial implementation
 *
 * @function
 * @param {Sequence} seq
 * @returns {HashMap}
 */
const hashset = (seq) => new HashSet(seq);

module.exports = {
  _reinterpretCast,
  bytes2hex,
  hex2bytes,
  _TypedArray,
  _padToSize,
  _u64,
  _bytes2u64,
  _u642bytes,
  hash,
  hashWith,
  hashSeq,
  hashSeqWith,
  hashUnordered,
  hashUnorderedWith,
  defaultBuildHasher,
  seededBuildHasher,
  randomBuildHasher,
  _sentinels,
  hashDirectly,
  _bin,
  _hashEach,
  _hashEachRaw,
  Hashable,
  DefaultHasher,
  UnorderedHasher,
  HashMap,
  hashmap,
  HashSet,
  hashset,
  unorderedBuildHasher,
};
