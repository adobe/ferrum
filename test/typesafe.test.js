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

const assert = require('assert');
const {
  isPrimitive, each, type, isdef, ifdef, typename, plus,
} = require('../src/index');

it('isdef()', () => {
  each([null, undefined], v => assert(!isdef(v)));
  each([false, [], {}, 0], v => assert(isdef(v)));
});

it('ifdef()', () => {
  const f = ifdef(plus(2));
  const ck = (x, r) => assert.strictEqual(f(x), r);
  ck(2, 4);
  ck(0, 2);
  ck(Infinity, Infinity);
  ck(NaN, NaN);
  ck(null, null);
  ck(undefined, undefined);
});

it('type()', () => {
  assert.strictEqual(type(null), null);
  assert.strictEqual(type(undefined), undefined);
  assert.strictEqual(type(2), Number);
  assert.strictEqual(type({}), Object);
});

it('typename()', () => {
  const examples = {
    null: null,
    undefined,
    Number:
   22,
    Object: {},
    Map: new Map(),
  };

  each(examples, ([k, v]) => assert.strictEqual(typename(type(v)), k));
});

it('isPrimitive()', () => {
  assert(isPrimitive(null));
  assert(isPrimitive(undefined));
  assert(isPrimitive(0));
  assert(isPrimitive(true));
  assert(isPrimitive('hello'));
  assert(isPrimitive(Symbol('')));
  assert(!isPrimitive({}));
  // eslint-disable-next-line no-new-wrappers
  assert(!isPrimitive(new Number(0)));
});
