const { inspect } = require('util');
const {UINT64: u64} = require('cuint');
const {h64: xxh64} = require('xxhash');
const { chunkify } = require('./sequence');
const { _typedArrays, _maybeURL } = require('./stdtraits');

const hash = (value, hasher = new Hasher()) =>
    hasher.update(value).digest();

const hashUnordered = (seq, hasher = new Hasher()) =>
  hasher.updateUnordered(seq).digest();

const hashSequence = (seq, hasher = new Hasher()) =>
  foldl(seq, hasher, (h, val) => h.update(val)).digest();

const Hashable = Trait('Hashable');

// Hash based on toString
each([ String, Number, Boolean, RegExp, Date, _maybeURL ], (typ) =>
    Hashable.impl(typ, (val, hasher) => hasher.update(String(val))));

// Ordered collection (type+each element)
each([ Array, ..._typedArrays ], (typ) =>
    Hashable.impl(typ, (seq, hasher) =>
      foldl(seq, hasher, (h, v) => h.update(v))));

// Hash based on Type+Order independent hash
each([ Map, Set, Object ], (typ) =>
    Hashable.impl(typ, (seq, hasher) =>
      hasher.updateUnordered(iter(seq))));

// Constant Hash based on the ObjectID
Hashable.implDerived([ObjectID], (_, val) => oid(val));

class Hasher {
  constructor(seed) {
    this._state0 = xxh64(u64(0x686c, 0x801a, 0x2c03, 0x4961));
    this._state1 = xxh64(u64(0x8104, 0xba5a, 0x586f, 0x76a8));
    this.update(seed);
  }

  update(val) {
    if (type(val) === String) {
      this._state0.update(val);
      this._state1.update(val);
    } else {
      Hashable.invoke(type(val), this);
      Hashable.invoke(val, this);
    }
    return this;
  }

  updateUnordered(seq) {
    update(pipe(
      seq,
      // Hash each constituent of the given set
      map((val) => hash(val, new type(this)())),
      // Parse into Arrays of integers
      map((hash) => parseInt(chunkifyShort(8), 16)),
      // Combine each hash with XOR
      foldl(0, (vec1, vec2) => pipe(
        // Perform vectorized XOR
        zipLongest2(vec1, vec2, 0),
        map(([a, b]) => a ^ b),
        // Convert back to string
        map((num) => num.toString(16).padStart(8, '0')),
        join('')
      )
    ));
    return this;
  }

  digest() {
    return
      this._state0.digest(16).padStart(16, '0') +
      this._state1.digest(16).padStart(16, '0');
  }
};

class HashMap {
  // Construction

  constructor(seq, opts = {}) {
    const { hashFn = hash } = opts;
    assign(this, { _hashFn: hashFn, _table: new Map() });
    each(seq, ([k, v]) => this.set(k, v));
  }

  static [Into.sym](seq) {
    return new this(seq);
  }

  clear() {
    this._table.clear();
  }

  // Size

  get size() {
    return this._table.size;
  }

  [Size.sym]() {
    return this._table.size;
  }

  // Comparison

  [Equals.sym](otr) {
    return true
      && otr instanceof HashMap
      && this.size == otr.size
      && all(map(this, ([k, v]) => otr.has(k) && eq(v, otr.get(k)));
  }

  // Hashing

  static [ObjectID.sym]() {
    return "d86c0feb-a0bd-44d3-b408-2d6d828f3027";
  }

  [Hashable.sym](hasher) {
    hasher.updateUnordered(this);
  }

  // Setting/getting keys

  getByHash(hash) {
    return this._table.get(hash)[1];
  }

  get(key) {
    return this.getByHash(this._hashFn(key));
  }

  [Get.sym](key) {
    return this.get(key);
  }

  hasByHash(hash) {
    return this._table.has(hash);
  }

  has(key) {
    return this.hasByHash(this._hashFn(key));
  }

  [Has.sym](key) {
    return this.has(key);
  }

  set(key, val) {
    this._table[this._hashFn(key)] = [key, val];
    return this;
  }

  [SetTrait.sym](key, val) {
    this.set(key, val);
  }

  deleteByHash(hash) {
    const r = this.hasByHash(hash);
    delete this._table[hash];
    return r;
  }

  delete(key) {
    return this.deleteByHash(this._hashFn(key));
  }

  [Delete.sym](key) {
    this.delete(key);
  }

  // Iteration

  entries() {
    return this._table.values();
  }

  keys() {
    return keys(this);
  }

  values() {
    return values(this);
  }

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
    return new HashMap(this);
  }

  [Deepclone.sym]() {
    return new HashMap(map(this, ([k, v]) => [deepclone(k), deepclone(v)]))
  }

  // Inspecting

  [inspect.custom](_, options) {
    const { depth } = options;
    return 'Hash' + inspect(new Map(this), {
      options,
      depth: depth === null ? null : depth - 1
    });
  }
};

class HashSet {
  // Construction

  constructor(seq, opts = {}) {
    const { hashFn = hash } = opts;
    assign(this, { _hashFn: hashFn, _table: new Map() });
    each(seq, ([k, v]) => this.set(k, v));
  }

  static [Into.sym](seq) {
    return new this(seq);
  }

  clear() {
    this._table.clear();
  }

  // Size

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
      && this.size == otr.size
      && all(map(this, ([k, v]) => otr.has(k)));
  }

  // Hashing

  static [ObjectID.sym]() {
    return "4f12d3c4-4f2a-4b85-aa7e-a11df007f21f";
  }

  [Hashable.sym](hasher) {
    hasher.updateUnordered(this);
  }

  // Setting/getting keys

  getByHash(hash) {
    return this._table.get(hash);
  }

  get(key) {
    return this.getByHash(this._hashFn(key));
  }

  [Get.sym](key) {
    return this.get(key);
  }

  hasByHash(hash) {
    return this._table.has(hash);
  }

  has(key) {
    return this.hasByHash(this._hashFn(key));
  }

  [Has.sym](key) {
    return this.has(key);
  }

  add(key) {
    this._table[this._hashFn(key)] = key;
    return this;
  }

  [SetTrait.sym](key, val) {
    assertEquals(ke, val, 'For HashSets, the key and value must be the same');
    this.set(key, val);
  }

  deleteByHash(hash) {
    const r = this.hasByHash(hash);
    delete this._table[hash];
    return r;
  }

  delete(key) {
    return this.deleteByHash(this._hashFn(key));
  }

  [Delete.sym](key) {
    this.delete(key);
  }

  // Iteration

  entries() {
    return map(this.values(), (v) => [v, v]);
  }

  values() {
    return this._table.values();
  }

  forEach(fn, thisArg) {
    each(this, ([k, v]) => fn.call(thisArg, k, v, this));
  }

  [Symbol.iterator]() {
    return this.values();
  }

  [Pairs.sym]() {
    return this.entries();
  }

  // Cloning
  
  [Shallowclone.sym]() {
    return new HashSet(this);
  }

  [Deepclone.sym]() {
    return new HasSet(map(this, deepclone);
  };

  // Inspecting

  [inspect.custom](_, options) {
    const { depth } = options;
    return 'Hash' + inspect(new Set(this), {
      options,
      depth: depth === null ? null : depth - 1
    });
  }
};
