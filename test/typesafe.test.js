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

const { builder } = require('../src/index');
const { ckEq } = require('./util');

it('construct()', () => {
  class Foo {
    // eslint-disable-next-line no-unused-vars, no-useless-constructor, no-empty-function
    constructor(a, b) {}
  }

  const cfoo = builder(Foo);
  const cnull = builder(null);
  const cundef = builder(undefined);

  ckEq(cfoo.name, 'Foo');
  ckEq(cnull.name, 'null');
  ckEq(cundef.name, 'undefined');

  ckEq(cfoo.length, 2);
  ckEq(cnull.length, 0);
  ckEq(cundef.length, 0);
});
