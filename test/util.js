/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const assert = require('assert');
const { type, typename, assertEquals } = require('../src/types');
const { list, foldr } = require('../src/sequence');

const ckEqSeq = (a, b) => assertEquals(list(a), list(b));

const ckThrows = (cls, fn) => {
  let err;
  assert.throws(fn, (e) => {
    err = e;
    return true;
  });
  assert(err instanceof cls, `Error (${typename(type(err))}) should be an instance of ${typename(cls)}.`);
  return err;
};

const ckCurry = (fn, ...args) => {
  const a = fn(...args);
  const b = foldr(args, fn, (f, v) => f(v));
  assert.deepStrictEqual(a, b);
  return a;
};

module.exports = { ckEqSeq, ckThrows, ckCurry };
