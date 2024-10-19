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
const { count, filter, foldl, join, map } = require('./sequence');

const multiline = (str) => {
  if (!str.trim()) return '';  // Handle empty or whitespace-only strings early

  const lines = str.trim().split('\n');  // Use trim to avoid shift/pop

  const prefixLen = pipe(
    lines,
    filter(l => l.trim()),  // Ignore empty lines
    map(l => l.match(/^ */)[0].length),  // Calculate prefix lengths
    foldl(Infinity, Math.min)  // Find minimum prefix length
  );

  return pipe(
    lines,
    map(l => l.slice(prefixLen)),  // Remove the common prefix
    join('\n')
  );
};

module.exports = { multiline };


  return pipe(
    lines,
    map((l) => l.slice(prefixLen)), // discard prefixes
    join('\n'),
  );
};

module.exports = { multiline };
