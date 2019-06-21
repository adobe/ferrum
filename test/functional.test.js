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
  exec, identity, pipe, compose, withFunctionName, curry, mul, plus,
} = require('../src/index');
const { ckEq, ckThrows } = require('./util');

it('exec()', () => {
  ckEq(exec(() => 42), 42);
});

it('identity()', () => {
  ckEq(identity(2), 2);
});

it('withFunctionName()', () => {
  const fn = withFunctionName('ford prefect!', () => null);
  ckEq(fn.name, 'ford prefect!');
});

it('compose(), pipe()', () => {
  const ck = (ini, fns, expect) => {
    ckEq(compose(...fns)(ini), expect);
    ckEq(pipe(ini, ...fns), expect);
  };
  ck(2, [], 2);
  ck(null, [], null);
  ck(3, [mul(2)], 6);
  ck(3, [mul(2), plus(1)], 7);
  ck(3, [plus(1), mul(3)], 12);
});

it('curry()', () => {
  const fn = curry('foobar', (a, b, c, d) => (a + b * c) * d);
  const ck = (res) => {
    ckEq(res, 28);
  };

  ck(fn(1, 2, 3, 4));
  ck(fn()(1, 2, 3, 4));

  ck(fn(4)(1, 2, 3));
  ck(fn(4)()(1, 2, 3));
  ck(fn(2, 3, 4)(1));
  ck(fn()(2, 3, 4)()(1));

  ck(fn(3, 4)(1, 2));
  ck(fn(4)(3)(1, 2));
  ck(fn(4)(2, 3)(1));

  ck(fn(4)()(3)(2)()(1));

  assert(fn.name.match(/foobar/));

  ckThrows(Error, () => fn(1, 2, 3, 4, 5));
});
