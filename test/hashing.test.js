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

/* global it */
/* eslint-disable no-bitwise, one-var-declaration-per-line, one-var */

const ck = require('assert');
const { ckEq, ckIs, ckAint, ckEqSeq, ckThrows, ckUneq } = require('./util');
const {
  deepclone, each, cartesian2, list, flat, range, map, uniq,
  contains, is, type, sum, range0, zip2, dict, HashMap, HashSet,
  reverse, second, into, defaultBuildHasher, seededBuildHasher: seedBH,
  randomBuildHasher: randBH, mutate, shallowclone, hash, hashWith, hashSeqWith,
  slidingWindow, concat, hashUnordered, curry, hashSeq, hashUnorderedWith,
  DefaultHasher, UnorderedHasher, pairs, size, get, next, has, iter,
  assign, enumerate, skip, isdef, del, hashDirectly,
} = require('../src');
const {
  _reinterpretCast, bytes2hex, hex2bytes, _TypedArray,
  _str2bin, _padToSize, _u64, hashset, hashmap, _sentinels,
  _bin, _bytes2u64, _u642bytes,
} = require('../src/hashing');

const popcnt = (bytes) =>
  sum(map(cartesian2(bytes, range0(8)), ([byt, off]) =>
    (byt >> off) & 1));

const xorv = (a, b) => new Uint8Array(map(zip2(a, b), (ba, bb) => ba ^ bb));

// ```sagemath
// # The average hamming distance between two random bitvectors is l/2 where
// # l is the bitvectors' length.
// # We check this fact, but we cannot use this exact cutoff because this would
// # cause mostly falls possibles (the hamming distance follows some random distribution).
// # Find bounds for the hamming distance such that  the probability of a false positive
// # is close to one in a billion.
// fac(x) = gamma(x+1)
// comb(n, k) = fac(n)/(fac(k)*fac(n-k)) # N over K
//
// # x = randombits(n)
// # P[popcnt(x) = k] = pb(n, k)
// pb(n,k) = comb(n,k)/(2**n)
//
// # P[popcnt(x) ∈ (n±w)/2] = pw(n, w)
// # false positive rate: 1-pw(n, w)
// pw(n, w) = integrate(pb(n, k), k, n/2 - w, n/2 + w+1)
// pfp(n, w) = 1 - pw(n, w)
//
// # cost function; we want to get as close as possible to the
// # desired false positive probability while checking as many bits
// # as possible
// cost(n, w, p) = log(pfp(n, w) / p)**2
//
// # For integers
// pwi_enum = lambda n, w : [pb(n,(n/2)+x) for x in range(-w,w+1)]
// pwi = lambda n, w : sum(enum(n, w))
// pfpi = lambda n, w : 1 - pw(n, w)
// costi = lambda n, w, p : log(pfp(n, w) / p)**2
//
// # w=23 minimizes costi(64,w,1e-9)
// ```
const ckHashStatistics = (a, b) => {
  const c = 23, v = xorv(a, b), l = v.length, d = popcnt(v);
  ck(l / 2 - c <= d);
  ck(d <= l / 2 + c);
};

const hex = '00ff00ff00ff00ff';
const u8r = new Uint8Array([0x00, 0xff, 0x00, 0xff, 0x00, 0xff, 0x00, 0xff]);
const u16r = new Uint16Array([0xff00, 0xff00, 0xff00, 0xff00]);
const u32r = new Uint32Array([0xff00ff00, 0xff00ff00]);
const i8r = new Int8Array([0, -1, 0, -1, 0, -1, 0, -1]);
const i16r = new Int16Array([-256, -256, -256, -256]);
const i32r = new Int32Array([-16711936, -16711936]);

const taRefs = [u8r, u16r, u32r, i8r, i16r, i32r];

const hNumbers = list(flat([
  range(-10, 10),
  [100, 1000, 9273, Infinity, -Infinity, NaN],
]));
const hConstants = [undefined, null, true, false];
const hSpecial = [
  new Date('2021-03-22T19:17:10.133Z'),
  new Date('2021-03-22T19:17:20.520Z'),
  new RegExp(''),
  /a/,
  /a/i,
];
const hStrings = list(flat([
  // eslint-disable-next-line no-octal-escape
  ['', 'foo', '\0', '\0\0', '\1', '\xff'],
  map(flat([hNumbers, hConstants, hSpecial]), String),
]));
const hashLeafs = list(flat([
  hNumbers, hConstants, hSpecial, hStrings,
]));
const hashContainers = list(flat([
  [
    {},
    { foo: {}, bar: 13 },
    { bar: 13, foo: [] },
  ],
  map(taRefs, list),
  [
    [],
    [[]],
    [[[]]],
    [1],
    [1, []],
    [[], 1],
    [[1]],
  ],
  [
    uniq([]),
    uniq([1]),
    uniq([null]),
  ],
  [
    hashset([]),
    hashset([1]),
    hashset([null]),
  ],
  [
    dict([]),
    dict([[0, 0]]),
    dict([[1, 0]]),
    dict([[0, 1]]),
  ],
  [
    hashmap([]),
    hashmap([[0, 0]]),
    hashmap([[1, 0]]),
    hashmap([[0, 1]]),
  ],
]));
const hashableExamples = list(flat([
  hashLeafs, hashContainers, taRefs,
]));

const permuteExample = (what) => {
  const t = type(what);
  if (contains([HashMap, HashSet, Map, Set], is(t))) {
    const p = reverse(map(what, (v) => second(permuteExample(v))));
    return [what, into(p, t)];
  } else {
    return [what, deepclone(what)];
  }
};

const ckBinEq = (a, b) =>
  ck.strictEqual(
    bytes2hex(a),
    bytes2hex(hex2bytes(b)),
  ); // normalize

it('hex2bytes(), bytes2hex()', () => {
  const c = (h, b) => {
    ckEq(hex2bytes(h), b);
    ckEq(bytes2hex(b), h);
  };

  c('', new Uint8Array([]));
  c('00', new Uint8Array([0]));
  c('ff', new Uint8Array([255]));

  ckThrows(Error, () => hex2bytes('a'));
  ckThrows(Error, () => hex2bytes('z'));
  ckThrows(Error, () => hex2bytes('000'));
  ckThrows(Error, () => hex2bytes(null));
  ckThrows(Error, () => hex2bytes(undefined));
  ckThrows(Error, () => bytes2hex(new Uint32Array([])));
  ckThrows(Error, () => bytes2hex([]));
});

it('_reinterpretCast', () => {
  each(cartesian2(taRefs, taRefs), ([a, b]) => {
    ck(a.length > 0);

    const a2 = deepclone(a);
    ckEq(a2, a);

    // Test normal conversion
    const b2 = _reinterpretCast(a2, type(b));
    ckEq(b2, b);

    // Refer to same memory (change and revert change)
    a2[0] += 1;
    ckUneq(a2, a);
    ckUneq(b2, b);
    a2[0] -= 1;
    ckEq(a2, a);
    ckEq(b2, b);

    // Throws on size mismatch
    const l1 = type(a).BYTES_PER_ELEMENT;
    const l2 = type(b).BYTES_PER_ELEMENT;
    if (l2 > l1) {
      ckThrows(Error, () => {
        _reinterpretCast(a2.slice(0, a2.length - 1), type(b));
      });
    }
  });
});

it('_TypedArray', () => {
  each(taRefs, (ta) => ck(ta instanceof _TypedArray));
});

it('hashDirectly', () => {
  ckEq(
    hashDirectly(true),
    hex2bytes('24817a77c9374571a9469a92faed50b3'),
  );
  class Foo {}
  ckThrows(Error, () => hashDirectly(new Foo()));
});

it('_bin (str)', () => {
  const c = (s, h) => ckBinEq(_bin(s), h);
  c('', '');
  c(' ', '20');
  c('\0\0', '0000');
  c('»', 'c2bb');
});

it('_padToSize', () => {
  const c = (a, sz, b) =>
    ckBinEq(_padToSize(hex2bytes(a), sz), b);
  c('', 0, '');
  c('', 1, '00');
  c('', 2, '0000');
  c('ff', 2, 'ff00');
  c('ffee', 2, 'ffee');
  c('ffeeaa', 2, 'ffeeaa');
  c('ffeeaa', 0, 'ffeeaa');
});

it('_u64, _bytes2u64, _u642bytes, ', () => {
  const c = (ref, h) => {
    ckBinEq(_u642bytes(ref), h);
    ck(ref.eq(_bytes2u64(hex2bytes(h))));
  };

  // Should be an instance of UINT64 from the cuint library
  c(_u64(0), '0000000000000000');
  c(_u64(0xf12827, 0xaa12a), '000aa12a00f12827');
  c(_u64(0).subtract(_u64(1)), 'ffffffffffffffff');
});

it('_bin', () => {
  const c = (v, h) => ckBinEq(_bin(v), h);
  c(Array, '91f577ca5dd54b349beceb7c25e5d99f');
  c(hex2bytes('68656c6c6f20776f726c640a'), '68656c6c6f20776f726c640a');
  c('Hello World', '48656c6c6f20576f726c64');
  c(42.2, '9a99999999194540');
  c(0, '0000000000000000');
  each(taRefs, (b) => c(b, hex));
});

it('Hashable', () => {
  const buildHashers = [
    defaultBuildHasher(),
    seedBH(new Uint8Array([0, 0, 0, 42, 0, 0, 0, 0])),
    randBH(),
    randBH(),
  ];

  const reg = (m, h) => {
    const sz = m.size;
    m.add(bytes2hex(h));
    return m.size !== sz; // is this a new addition
  };

  // Test each (Interface × BuildHasher × Example)  for difference and equiv
  const hashes = uniq([]);
  each(hashableExamples, (example) => {
    each(buildHashers, (bh) => {
      const h = hashWith(example, bh);
      const r = reg(hashes, h);
      ck(r); // different from other buildhashers
      ckEq(hashWith(example, bh), h); // idempotency
      ckEq(hashSeqWith([example], bh), h); // equiv to default hasher
      ckEq(bh().update(example).digest(), h); // equiv to manual hashing

      // Equiv up to cloning, reordering of elements in associative containers…
      each(permuteExample(example), (p) => ckEq(hashWith(p, bh), h));

      // Hashing an element multiple times in a sequence changes the value
      const twoh = hashSeqWith([example, example], bh);
      ckUneq(twoh, h);

      // Hashing an array ≠ hashing a seq
      ckUneq(twoh, hashWith([example, example], bh));
    });

    // Default hash function is equivalent to using default hasher
    ck(!reg(hashes, hash(example)));
    ck(!reg(hashes, hashSeq([example])));
  });

  // Unordered hashing
  const unorderedHashes = hashes;
  const exampleVecs = concat(
    slidingWindow(hashableExamples, 3),
    // This tests removal/addition of an element which should
    // change the hash
    slidingWindow(hashableExamples, 2),
  );
  each(exampleVecs, (vec) => {
    each(buildHashers, (bh) => {
      const h = hashUnorderedWith(vec, bh);
      ck(reg(unorderedHashes, h));

      ckEq(hashUnorderedWith(vec, bh), h); // Idempotence
      ckEq(hashUnorderedWith(reverse(vec), bh), h); // Order independence

      // Equiv to manual hashing
      const hasher = UnorderedHasher.fromBuildHasher(bh);
      each(vec, (v) => hasher.update(v));
      ckEq(hasher.digest(), h);
    });

    // Default hash function is equivalent to using default hasher
    ck(!reg(unorderedHashes, hashUnordered(vec)));
  });

  // Empty sequence
  each(buildHashers, (bh) => {
    const h = hashSeqWith([], bh);
    ck(reg(hashes, h));

    ckEq(hashSeqWith([], bh), h); // idempotency
    ckEq(bh().digest(), h);

    ckEq(hashUnorderedWith([], bh), h); // idempotency
    ckEq(UnorderedHasher.fromBuildHasher(bh).digest(), h);
  });
}).timeout(20000); // This tests a lot of examples

it('Hasher-reuse', () => {
  // We already tested almost all properties of hashers above
  // this just tests behaviour under reuse
  each([UnorderedHasher.withOpts, DefaultHasher.withOpts], (H) => {
    // Can reuse
    const a = H({}).digest();
    const b = H({}).update(42).digest();
    const c = H({}).update(42).update(23).digest();

    // Throws on forbidden reuse
    let h = H({});
    h.digest();
    ckThrows(Error, () => {
      h.digest();
    });

    h = H({});
    h.digest();
    ckThrows(Error, () => {
      h.update();
    });

    // Can just manually clone
    h = H({});
    ckEq(shallowclone(h).digest(), a);
    ckEq(deepclone(h).digest(), a);
    h.update(42);
    ckEq(shallowclone(h).digest(), b);
    ckEq(deepclone(h).digest(), b);
    h.update(23);
    ckEq(shallowclone(h).digest(), c);
    ckEq(deepclone(h).digest(), c);

    // Can reuse if requested
    h = H({ allowReuse: true });
    ckEq(h.digest(), a);
    ckEq(h.digest(), a);
    ckEq(h.update(42).digest(), b);
    ckEq(h.digest(), b);
    ckEq(h.update(23).digest(), c);
    ckEq(h.digest(), c);
  });
});

it('DefaultHasher seed handling', () => {
  const c = (seed, res) =>
    ck.strictEqual(
      bytes2hex(DefaultHasher.fromSeed(seed).update(42).digest()),
      bytes2hex(res),
    );

  // Empty seed
  c(undefined, hash(42));
  // Truncated zero seed <=> empty seed
  c(hex2bytes(''), hash(42));
  c(hex2bytes('00'), hash(42));
  c(hex2bytes('00000000'), hash(42));
  // Full size zero seed <=> empty seed
  c(hex2bytes('0000000000000000'), hash(42));

  // Overlong seed
  const tenbyte = hex2bytes('00000000000000000000');
  c(tenbyte, hashWith(42, seedBH(hash(tenbyte))));
});

const forbiddenKey = [[['Do not use this value']]];

// Check the contents of a hash table (hasmap/hashset) plus
// accessors based on a reference hash table
const ckHt = curry('ckHt', (ht, cnt, identicalContent) => {
  const ckCont = identicalContent ? ckIs : ckEq;

  const ismap = type(ht) === HashMap;
  const isset = type(ht) === HashSet;
  ck(ismap ^ isset);

  const key = ismap ? ([k, _v]) => k : (v) => v;
  const val = ismap ? ([_k, v]) => v : (v) => v;
  const pair = ismap ? (p) => p : (v) => [v, v];
  const ref = dict(map(cnt, (c) => [ht._hash(key(c)), c]));

  // Hash table contents
  ckEq(ht._table, ref);

  // size()
  ckEq(ht.size, ht._table.size);
  ckEq(size(ht), ht._table.size);

  // contents
  each(ref, ([h, c]) => {
    ck(ht.has(key(c)));
    ck(has(ht, key(c)));
    ckCont(ht.get(key(c)), val(c));
    ckCont(get(ht, key(c)), val(c));

    if (ismap) {
      const p = ht.getPair(key(c));
      ckCont(p[0], key(c));
      ckCont(p[1], val(c));
      // Does not return pair as stored in table (need to use set() to update)
      ckAint(p, ht._table.get(h));
    }
  });

  // Not contents
  ck(!ht.has(forbiddenKey));
  ck(!has(ht, forbiddenKey));
  ckIs(ht.get(forbiddenKey), undefined);
  ckIs(get(ht, forbiddenKey), undefined);
  if (ismap) ckIs(ht.getPair(forbiddenKey), undefined);

  // Can iterate (and iteration order is well defined based on addition order)
  ckEqSeq(ht, map(ref, second));
  ckEqSeq(ht.entries(), map(ref, ([_h, c]) => pair(c)));
  ckEqSeq(pairs(ht), map(ref, ([_h, c]) => pair(c)));
  if (ismap) ckEqSeq(ht.keys(), map(ref, ([_h, c]) => key(c)));
  ckEqSeq(ht.values(), map(ref, ([_h, c]) => val(c)));

  // forEach is weird
  const thisValue = {};
  const it = iter(ref);
  function cb(k, v, m) {
    const [h, c] = next(it);
    ckCont(k, key(c));
    ckCont(v, val(c));
    if (ismap) ckAint(c, ht._table.get(h));
    ckIs(m, ht);
    ckIs(this, thisValue);
  }
  ckIs(ht.forEach(cb, thisValue), undefined);
});

// Compare two hash tables (hashmap/hashset)
const ckCompareHt = (ht1, ht2, identicalContent) => {
  const ckCont = identicalContent ? ckIs : ckEq;

  // Self testing the tests…
  const ismap = type(ht1) === HashMap;
  const isset = type(ht1) === HashSet;
  ck(ismap ^ isset);
  ck(type(ht1) === type(ht2));

  ckAint(ht1, ht2);
  ckEq(ht1, ht2);
  each(zip2(ht1._table, ht2._table), ([[h1, p1], [h2, p2]]) => {
    // The hash table seeds should be randomized; this implies
    // that the hashes should be statistically independent…
    ckUneq(h1, h2);
    ckHashStatistics(hex2bytes(h1), hex2bytes(h2), 64);

    // Pairs are equal but not identical in the case of maps
    if (ismap) ckAint(p1, p2);
    ckEq(p1, p2);

    // keys & values are identical or equal as indicated
    if (ismap) {
      ckCont(p1[0], p2[0]);
      ckCont(p1[1], p2[1]);
    }
  });
};

// Takes a bunch of equivalent hash tables (contents are
// equal or identical) and checks that they are all equiv
const ckSetOfEquivHashtables = (htSet, proto, identicalContent) => {
  each(htSet, ckHt(proto, identicalContent));
  each(enumerate(htSet), ([off, ht1]) =>
    each(skip(htSet, off + 1), (ht2) =>
      ckCompareHt(ht1, ht2, identicalContent)));
};

it('HashMap empty', () => {
  // Empty sequence
  const e0 = new HashMap();
  const contExamples = [
    e0,
    new HashMap([]),
    new HashMap([], {}),
    HashMap.new(),
    HashMap.fromSeq([]),
    HashMap.fromSeqWithOpts([], {}),
    hashmap([]),
    into([], HashMap),
    // by cloning
    deepclone(e0),
    shallowclone(e0),
    // By manual clone construction
    hashmap(e0),
    HashMap.fromSeq(e0),
    new HashMap(e0),
    // By construction from object
    hashmap({}),
    HashMap.fromSeq({}),
    new HashMap({}),
    new HashMap({}, {}),
    // By deletion of object
    mutate(hashmap([[42, 21]]), (m) => m.delete(42)),
    // By clearing
    mutate(hashmap([['foo', 13], ['bar', 12]]), (m) => m.clear()),
  ];
  ckSetOfEquivHashtables(contExamples, [], true);
});

it('HashMap full', () => {
  const k0 = [[['hello']]], k1 = [[['helo']]];
  const v0 = [[['booh']]], v1 = [[['boooh']]];

  // Sequence with content
  const proto = [[k0, v0], [k1, v1]];
  const f0 = new HashMap(proto);
  const contExamples = [
    new HashMap(proto),
    new HashMap(proto, {}),
    HashMap.fromSeq(proto),
    HashMap.fromSeqWithOpts(proto, {}),
    hashmap(proto),
    into(proto, HashMap),
    // by cloning
    shallowclone(f0),
    // By manual clone construction
    hashmap(f0),
    HashMap.fromSeq(f0),
    new HashMap(f0),
    // By addition
    mutate(hashmap([[42, 21], [k0, v0]]), (m) => {
      m.delete(42);
      m.set(k1, v1);
    }),
    // By replacement (preserves initial ord for iteration)
    mutate(hashmap([[k0, 99], [k1, v1]]), (m) => {
      assign(m, k0, v0);
    }),
    // By clearing and stepwise reconstruction
    mutate(hashmap([['foo', 13], ['bar', 12]]), (m) => {
      m.clear();
      m.set(k0, v0);
      assign(m, k1, v1);
    }),
  ];

  ckSetOfEquivHashtables(contExamples, proto, true);

  // deepclone
  ckSetOfEquivHashtables([f0, deepclone(f0)], proto, false);
});

it('HashMap from object', () => {
  const proto = { foo: 42 };
  const contExamples = [
    hashmap({ foo: 42 }),
    new HashMap(new Map([['foo', 42]])),
    mutate(HashMap.new(), (ht) => ht.set('foo', 42)),
  ];
  ckSetOfEquivHashtables(contExamples, proto, false);
});

it('HashMap set()', () => {
  const k0 = [[['foo']]], k1 = [[['foo']]];
  const m = HashMap.new();
  ckIs(m.set(k0, 23), m);
  ckHt(m, [[k0, 23]], true);
  assign(m, k1, 42);
  ckHt(m, [[k1, 42]], true); // Replaces old kv-pair
  del(m, k0);
  ck(!m.delete(k1));
});

it('HashMap eq() is order independant', () => {
  ckEq(
    hashmap([['foo', 42], ['bar', 23]]),
    hashmap([['bar', 23], ['foo', 42]]),
  );
  ckEq(
    hash(hashset([['foo', 42], ['bar', 23]])),
    hash(hashset([['bar', 23], ['foo', 42]])),
  );
});

class ModuloHasher {
  update(v) {
    ckIs(type(v), Number);
    ck(!isdef(this._hash));
    this._hash = v % 7;
    return this;
  }

  digest() {
    return this._hash;
  }
}

it('HashMap can use custom hash function', () => {
  const m = HashMap.fromSeqWithOpts([], { genBuildHasher: () => () => new ModuloHasher() });
  ck(!m.has(7));
  m.set(0, 1);
  ck(m.has(7));
});

it('HashSet empty', () => {
  // Empty sequence
  const e0 = new HashSet();
  const contExamples = [
    e0,
    new HashSet([]),
    new HashSet([], {}),
    HashSet.new(),
    HashSet.fromSeq([]),
    HashSet.fromSeqWithOpts([], {}),
    hashset([]),
    into([], HashSet),
    // by cloning
    deepclone(e0),
    shallowclone(e0),
    // By manual clone construction
    hashset(e0),
    HashSet.fromSeq(e0),
    new HashSet(e0),
    // By deletion of object
    mutate(hashset([42]), (m) => m.delete(42)),
    // By clearing
    mutate(hashset([['foo', 13], ['bar', 12]]), (m) => m.clear()),
  ];

  ckSetOfEquivHashtables(contExamples, [], true);
});

it('HashSet full', () => {
  const v0 = [[['booh']]], v1 = [[['boooh']]];

  // Sequence with content
  const proto = [v0, v1];
  const f0 = new HashSet(proto);
  const contExamples = [
    new HashSet(proto),
    new HashSet(proto, {}),
    HashSet.fromSeq(proto),
    HashSet.fromSeqWithOpts(proto, {}),
    hashset(proto),
    into(proto, HashSet),
    // by cloning
    shallowclone(f0),
    // By manual clone construction
    hashset(f0),
    HashSet.fromSeq(f0),
    new HashSet(f0),
    // By addition
    mutate(hashset([42, v0]), (m) => {
      del(m, 42);
      assign(m, v1, v1);
    }),
    // By clearing and stepwise reconstruction
    mutate(hashset([['foo', 13], ['bar', 12]]), (m) => {
      m.clear();
      assign(m, v0, v0);
      m.add(v1);
    }),
  ];

  ckSetOfEquivHashtables(contExamples, proto, true);

  // deepclone
  ckSetOfEquivHashtables([f0, deepclone(f0)], proto, false);
});

it('HashSet set()', () => {
  const v0 = [[['foo']]], v1 = [[['foo']]];
  const m = HashSet.new();

  ckThrows(Error, () => assign(m, v0, 42)); // Cannot have different key/value

  ckIs(m.add(v0), m);
  ckHt(m, [v0], true);
  assign(m, v1, v1);
  ckHt(m, [v0], true); // Does not replace old value
  ck(m.delete(v0));
  ck(!m.delete(v1));

  assign(m, v1, v1);
  ckHt(m, [v1], true); // Can now introduce new value
});

it('HashSet eq() is order independent', () => {
  ckEq(
    hashset([['foo', 42], ['bar', 23]]),
    hashset([['bar', 23], ['foo', 42]]),
  );
  ckEq(
    hash(hashset([['foo', 42], ['bar', 23]])),
    hash(hashset([['bar', 23], ['foo', 42]])),
  );
});

it('HashSet can use custom hash function', () => {
  const m = HashSet.fromSeqWithOpts([], { genBuildHasher: () => () => new ModuloHasher() });
  ck(!m.has(7));
  m.add(0);
  ck(m.has(7));
});
