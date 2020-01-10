const _findOrdered = (eqFn) => (dat, what, radix, _a=0, _z=dat.length) => {
  // Does not contain element; found spot to insert
  if (_cnt === 0) {
    return [false, _a, undefined];
  }

  const len = _z - _a;
  const mid = _a + floor(len/2);
  const v = fn(what, _dat[(_a + mid) * radix]);

  // Found the value
  if (v === 0) {
    return [true, _a, v];

  // Value must be left of the midpoint
  } else if (v < 0) {
    return this._find(what, _a, _a + mid);

  // Must be right of the midpoint
  } else /* if (v > 0) */ {
    return this._find(what, _a + mid + 1, _z)
  }
}

class OrderedSet {
  // Construction

  constructor(seq, opts = {}) {
    const { ordFn = compare, searchFn } = opts;
    assign(this, { ordFn, _dat = [] });
    each(seq, (v) => this.add(v));
  }

  static [Into.sym](seq) {
    return new this(seq);
  }

  clear() {
    this._dat = [];
  }

  // Size

  get size() {
    return this._dat.length;
  }

  [Size.sym]() {
    return this._dat.length;
  }

  // Comparison

  [Equals.sym](otr) {
    if (this.sortFn !== otr.sortFn) {
      return eq(this, new OrderedSet(otr, { sortFn: this.sortFn }));
    }

    return true
      && otr instanceof OrderedSet
      && this.size == otr.size
      && all(map(zip(this._dat, otr._dat), ([a, b]) => this.ordFn(a, b) === 0));
  }

  _find(v) {
    return _orderedFind(this._dat, v, ordFn);
  }

  add(nu) {
    const [have, idx, old] = this._find(nu);
    if (have) {
      return old;
    } else {
      this._dat.splice(idx, 0, nu);
      return nu;
    }
  }

  has(v) {
    const [have, _idx, _old] = this._find(nu);
    return have;
  }
};
