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

/* eslint-env mocha */

const assert = require('assert');
const { multiline } = require('../src/index');

describe('String tests', () => {
  it('multiline()', () => {
    const ck = (ref, str) => assert.strictEqual(multiline(str), ref);

    ck('', '');
    ck('Hello', 'Hello');
    ck('Hello', `
    Hello`);
    ck('Hello', `
      Hello`);
    ck('Hello\nWorld', `
      Hello
      World`);
    ck('Hello\nWorld', `
      Hello
      World
  `);
    ck('Hello\n  Foo\nWorld', `
      Hello
        Foo
      World
  `);
  });
});
