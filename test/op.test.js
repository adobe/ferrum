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
  and, or, not, nand, nor, xor, xnor, is, aint, plus, mul,
} = require('../src/op');
const { ckCurry } = require('./util');

it('and()', () => {
  const ck = (expect, ...args) => assert.strictEqual(ckCurry(and, ...args), expect);
  ck(null, null, null);
  ck(null, true, null);
  ck(0, 0, true);
  ck(true, 1, true);
});

it('or()', () => {
  const ck = (expect, ...args) => assert.strictEqual(ckCurry(or, ...args), expect);
  ck(null, null, null);
  ck(true, true, true);
  ck(1, 0, 1);
  ck(true, 0, true);
});

it('not()', () => {
  assert.strictEqual(not(1), false);
  assert.strictEqual(not(null), true);
});

it('nand()', () => {
  const ck = (expect, ...args) => assert.strictEqual(ckCurry(nand, ...args), expect);
  ck(true, null, null);
  ck(true, true, null);
  ck(true, 0, 1);
  ck(false, 1, true);
});

it('nor()', () => {
  const ck = (expect, ...args) => assert.strictEqual(ckCurry(nor, ...args), expect);
  ck(true, null, null);
  ck(false, true, null);
  ck(false, 0, 1);
  ck(false, 1, true);
});

it('xor()', () => {
  const ck = (expect, ...args) => assert.strictEqual(ckCurry(xor, ...args), expect);
  ck(false, null, null);
  ck(true, true, null);
  ck(true, 0, 1);
  ck(false, 1, true);
});

it('xnor()', () => {
  const ck = (expect, ...args) => assert.strictEqual(ckCurry(xnor, ...args), expect);
  ck(true, null, null);
  ck(false, true, null);
  ck(false, 0, 1);
  ck(true, 1, true);
});

it('is()', () => {
  const ck = (expect, ...args) => assert.strictEqual(ckCurry(is, ...args), expect);
  ck(true, null, null);
  ck(false, true, null);
  ck(false, 0, 1);
  ck(false, 1, true);
});

it('aint()', () => {
  const ck = (expect, ...args) => assert.strictEqual(ckCurry(aint, ...args), expect);
  ck(false, null, null);
  ck(true, true, null);
  ck(true, 0, 1);
  ck(true, 1, true);
});

it('plus()', () => {
  const ck = (expect, ...args) => assert.strictEqual(ckCurry(plus, ...args), expect);
  ck(5, 2, 3);
  ck(0, 1, -1);
});

it('mul()', () => {
  const ck = (expect, ...args) => assert.strictEqual(ckCurry(mul, ...args), expect);
  ck(-2, 2, -1);
  ck(0, 17, 0);
});
