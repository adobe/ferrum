const _findSlow = (eqFn) => (dat, val, radix) => {
  for (let idx=0; idx < dat.length; idx += radix) {
    const otr = dat[idx];
    if (eqFn(val, otr)) {
      return [true, idx, v];
    }
  }
  return [false, dat.length, undefined];
}


class LinearSet {
  constructor(data, opts = {}) {
    const { eqFn = eq } = opts;
    assign(this, {eqFn, _dat = []});
    map(data, (v) => this.add(v));
  }

  add(nu) {
    const [have, _idx, _old] = _findSlow();
  }

  has(nu)
}

class LinearMap {

}
