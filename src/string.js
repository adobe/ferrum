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

const { pipe } = require('./functional');
const { size } = require('./stdtraits');
const {
  filter, map, count, foldl, join,
} = require('./sequence');

/**
 * Helpers for working with strings.
 */

/**
 * This is a helper for declaring multiline strings.
 *
 * ```
 * const { strictEqual: assertIs } = require('assert');
 * const { multiline } = require('ferrum');
 *
 * assertIs(
 *   multiline(`
 *     Foo
 *     Bar
 *     Baz
 *
 *        Hello
 *
 *     Bang
 *
 *   `),
 *   'Foo\nBar\nBaz\n\n   Hello\n\nBang\n');
 *
 * assertIs(
 *   multiline(`Foo\nBar`),
 *   'Foo\nBar');
 * ```
 *
 * The function basically just takes a string and then
 * strips the first & last lines if they are empty.
 *
 * In order to remove indentation, we determine the common
 * whitespace prefix length (number of space 0x20 characters
 * at the start of the line). This prefix is simply removed
 * from each line...
 *
 * @function
 */
const multiline = (str) => {
  // Discard the leading & trailing line
  const lines = str.split('\n');

  // Strip the first and the last line
  if (lines[0].match(/^\s*$/)) {
    lines.shift();
  }
  if (size(lines) > 0 && lines[size(lines) - 1].match(/^\s*$/)) {
    lines.pop();
  }

  // Find the prefix length
  const prefixLen = pipe(
    lines,
    filter((l) => !l.match(/^\s*$/)), // Disregarding empty lines
    map((l) => l.match(/^ */)[0]), // Extract prefixes
    map(count), // calculate length
    foldl(Infinity, (a, b) => Math.min(a, b)),
  ); // minimum

  return pipe(
    lines,
    map((l) => l.slice(prefixLen)), // discard prefixes
    join('\n'),
  );
};

module.exports = { multiline };
