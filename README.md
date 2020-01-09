<a name="ferrum"></a>
# Ferrum

Features from the Rust language in JavaScript: Provides [Traits](https://doc.rust-lang.org/rust-by-example/trait.html) & an advanced library for working with sequences/iterators in JS.

[Github](https://github.com/adobe/ferrum)  
[API Documentation](https://www.ferrumjs.org)

<a name="table-of-contents"></a>
## Table of Contents

- [Ferrum](#ferrum)
  - [Table of Contents](#table-of-contents)
  - [Status](#status)
  - [Usage & Features](#usage--features)
    - [Sequence/Iterators](#sequenceiterators)
      - [Objects as Sequences](#objects-as-sequences)
      - [Reverse Currying](#reverse-currying)
      - [Pipelining](#pipelining)
      - [Lazy Evaluation](#lazy-evaluation)
    - [Traits](#traits)
    - [Operators as functions](#operators-as-functions)
    - [Typing utilities](#typing-utilities)
    - [Functional Utilities](#functional-utilities)
  - [Change Log](#change-log)
    - [1.4.0](#140)
    - [1.3.0](#130)
    - [1.2.0](#120)
  - [Development](#development)
    - [Build](#build)
    - [Test](#test)
    - [Lint](#lint)

<a name="status"></a>
## Status

[![CircleCI](https://img.shields.io/circleci/project/github/adobe/ferrum/master.svg)](https://circleci.com/gh/adobe/ferrum/tree/master)
[![codecov](https://img.shields.io/codecov/c/github/adobe/ferrum.svg)](https://codecov.io/gh/adobe/ferrum)
[![GitHub license](https://img.shields.io/github/license/adobe/ferrum.svg)](https://github.com/adobe/ferrum/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/ferrum.svg)](https://github.com/adobe/ferrum/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/ferrum.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/ferrum)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

<a name="usage-features"></a>
## Usage & Features

```bash,notest
$ npm add ferrum
```

<a name="sequence-iterators"></a>
### Sequence/Iterators

| Feature              | Ferrum | Underscore | Lodash | wu.js |
| -------------------- | ------ | ---------- | ------ | ----- |
| Objects as Sequences |    yes |         no |     no |    no |
| Reverse Currying     |    yes |         no |     no |    no |
| Lazy Evaluation      |    yes |         no |     no |   yes |
| Pipelining           |    yes |         no |     no |    no |

Ferrum provides a library for transforming lists & iterables; it provides all the functions
you would expect like `map`, `filter`, `foldl` and many others. In this regard it is very similar
to libraries like wu.js, lodash or underscore. Ferrum has been written to remedy some of the issues
in these libraries.

<a name="objects-as-sequences"></a>
#### Objects as Sequences

`Ferrum/Sequence` has been designed with full iterator support in mind. Generally all functions
can take iterables/iterators and returns iterators.

```js
const {map, assertSequenceEquals} = require('ferrum');

const a = map([1,2,3,4], x => x+2); // a is an iterator
const b = map(a, x => x*2); // b is also an iterator
assertSequenceEquals(b, [6, 8, 10, 12]);
```

In addition to supporting iterables & iterators, `Ferrum/Sequence` can take objects as input:

```js
const {map,  iter, assertEquals, assertSequenceEquals} = require('ferrum');

const a = map({a: 42, b: 43}, ([k, v]) => v+2); // a is an iterator
const b = map(a, x => x*2); // b is also an iterator
assertSequenceEquals(b, [88, 90]);

const obj = {foo: 23, bar: 24};
const log = [];
for (const [key, value] of iter(obj)) {
  log.push(`${key} | ${value}`);
}

assertEquals(log, [
  'foo | 23',
  'bar | 24',
]);
```

`Ferrum/Sequence` uses [lodash.isPlainObject](https://lodash.com/docs/4.17.11#isPlainObject)
and always tries to use the iterator protocol to make sure object iteration is only used if
it really should.

```js
const {map, assertSequenceEquals} = require('ferrum');

const obj = {};
obj[Symbol.iterator] = function*() {
  yield 2;
  yield 3;
};

assertSequenceEquals(map(obj, x => x*2), [4, 6]);
```

`Lodash` and `Underscore` only support arrays as input & output; `wu.js` supports iterators as input & output but has no
support for plain objects.

<a name="reverse-currying"></a>
#### Reverse Currying

`Ferrum/Sequence` provides many higher order functions. These are functions that take other functions as parameters, like `map()` or `filter()`.

```js
const {map, filter, assertSequenceEquals} = require('ferrum');

// Map is used to change each value in a list/iterable
assertSequenceEquals(map([1,2,3,4], x => x*2), [2,4,6,8]);

// Filter removes elements in a list/iterable
assertSequenceEquals(filter([1,2,3,4], x => x%2 === 0), [2, 4]);
```

Sometimes it can be useful to create an intermediate function with just a
few arguments instead of calling the function right away:

```js
const { map, plus, list, assertSequenceEquals } = require('ferrum');

const myList = [
  [1,2,3],
  [4,5,6],
  [7,8,9]
];

// Add 2 to each number in a two dimensional list
// This example uses currying twice: in the `plus(2)`
// and in the `map()`
const a = map(myList, map(plus(2)));
assertSequenceEquals(map(a, list), [
  [3,4,5],
  [6,7,8],
  [9,10,11]
]);

// This is what the code would look like without currying:
// A lot less convenient and harder to read
const b = map(myList, (sublist) => map(sublist, (b) => plus(b, 2)));
assertSequenceEquals(map(b, list), [
  [3,4,5],
  [6,7,8],
  [9,10,11]
]);
```

You may have noticed, that when currying is used, the arguments are given in reverse order; this is
why we call it reverse currying. We have decided to use currying this way, because there should never
be extra arguments after the function (otherwise you end up with dangling arguments multiple lines below)
while the function is usually also the first parameter you want to supply when currying:

```js,notest
const {each} = require('ferrum');

// This is much more handy
each([1,2,3], () => {
  ...
});

// This is not very handy because you might need to scroll down to find the last
// argument; you will also need to scroll down to determine whether the call to
// each is using currying
each(() => {
  ...
}, [1,2,3]);
```

Underscore.js does not support currying at all; lodash provides curried variants of their functions in an extra
module (not very handy either because it is often useful to mix curried and non currying invocations) while lodash
has opted to make the function the first parameter, delivering good support for currying and not so good support
for normal function invocation.

<a name="pipelining"></a>
#### Pipelining

`Ferrum` provides a function called `pipe()` which – together with currying – can be used to build complex data processing pipelines.
Pipelines are conceptually the same as the highly successful pipes in bash; the feature is currently being introduced into the JavaScript
standard library in the form of the [`|>` operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Pipeline_operator).

```js
const {sqrt} = Math;
const {
  pipe, filter, uniq, map, mul, mapSort, identity,
  prepend, takeWhile, all, range, assertSequenceEquals,
} = require('ferrum');

const a = pipe(
  [5,1,6,7,10,11,1,3,4],
  filter(x => x%2 === 1), // Get rid of even number
  uniq,                   // Get rid of duplicates
  map(mul(3)),            // Multiply each element by three
  mapSort(identity));     // Sort all numbers
assertSequenceEquals(a, [3,9,15,21,33]);

// Very simple primality test
const isPrime = (v) => v > 1 && pipe(
  // Build the list of candidate factors
  range(0, Infinity), // List of all even integers >0
  takeWhile(x => x<=sqrt(v)), // Cut of the list at the square root of our input
  // Perform the division test
  map(x => v % x === 0),
  all); // NOTE: Due to lazy evaluation, dividing will stop at the first factor found

// Sequence of all prime numbers (calculated slowly)
const primes = () => pipe(
  range(0, Infinity), // List of all positive integers
  filter(isPrime));
```

Learning to write algorithms in this way is not always easy, but it can be very rewarding
as the pipe form is often a lot more readable. To illustrate this, let's take a look how our
code of the prime sequence example changes as we take a way features from `Ferrum`;
let's first take away currying and the `pipe()` function itself:

```js
const {sqrt} = Math;
const {all, map, takeWhile, filter, range} = require('ferrum');

const isPrime = (v) => v > 1 && all(map(takeWhile(range(2, Infinity), x => x<=sqrt(v)), x => v % x === 0));
const primes = () => filter(range(0, Infinity), isPrime);
```

One way to work around the lack of currying and `pipe()` is to just put all our
filter stages into one expression. Due to this, our code has become much shorter and much harder to read.
Look at how the dataflow jumps around, see how distant the map function and it's argument are from each other
and it does not help that subexpression cannot be properly documented any more.
Let's try another way to write down these functions:

```js
const {sqrt} = Math;
const {all, map, takeWhile, filter, range} = require('ferrum');

const positiveIntegers = () => range(1, Infinity);
const isPrime = (v) => {
  const fromTwo = range(2, Infinity);
  const candidates = takeWhile(fromTwo, x => x<=sqrt(v));
  return v > 1 && all(map(x => v % x === 0));
}
const primes = () => filter(positiveIntegers(), isPrime);
```

This is much better! The data flow is more clear and substeps can be documented again.
In this version we used temporary variables to get around not having `pipe()` and currying;
this is much better than just putting everything into one line.

Note how `positiveIntegers` became its own function while `fromTwo` and `candidates`
became just local variables. Also note how `all` and `map` are still in the same expression.
Sometimes this is the more readable variant. We have to decide each time.

This variant still has disadvantages though; first of all the code still looks more
cluttered and the dataflow still jumps around more than the pipe variant.
You also have to come up with a lot of names for temporary variables and take care
not to reuse them (since they are lazily evaluated they must only be used once).
This is one of the things you communicate by using `pipe()` over local variables: "This variable
will never be used again" – knowing this & limiting the number of variables in a scope can be
very useful, especially in large functions.

Finally, let's implement this in classic imperative style:

```js
const {sqrt} = Math;

const isPrime = (v) => {
  if (v < 2) {
    return false;
  }

  for (let i=2; i <= sqrt(v); i++) {
    if (v % i !== 0) {
      return false;
    }
  }

  return true;
}

const primes = function *primes() {
  for (let i=2; true; i++) {
    if (isPrime(i)) {
      yield i;
    }
  }
}
```

The first thing that becomes noticeable in this version is that it is more
than twice as long as our variant using `pipe()` (not counting comment lines);
this version also uses two levels of nesting, while our pipelined version uses
just one level of nesting. The imperative version also contains two for loops
and three if statements; for loops are notoriously hard to read as well.
Finally, the imperative version forces us to think in imperative terms – to consider
what happens in each step of the for loop one by one and then come to the conclusion:
*Ah, this for loop just gets rid of all those integers that are not prime*. In the imperative
version this intention must be deduced, in the pipelined version it is plain to see.

To sum it up, using `pipe()` and currying the functions from `Ferrum` has a number
of advantages; you end up with fewer levels of nesting, can avoid a lot of branching (if statements)
and hard to write for loops; pipelining let's you break apart your problem into multiple
clearly defined transformation steps with obvious data flow and obvious intention.

Underscore, lodash and wu.js all allow you to do something similar with chaining which does work quite well.
They do require a bit more boilerplate since values need to be wrapped before chaining and unwrapped
after chaining has finished. Pipelining will have even less boilerplate when the `|>` becomes
available and pipelining can be used with arbitrary transformation functions, while
chaining can only be used with functions supported by the library, thus pipelining is much
more generic & extensible.

<a name="lazy-evaluation"></a>
#### Lazy Evaluation

Like Python iterators, sequences support lazy evaluation. They support it, because lazy evaluation
is a core feature of JavaScript ES6 iterators.

This means that the values in iterators/sequences are only evaluated once they
are needed:

```js
const {map, plus, list} = require('ferrum');
const a = map([1,2,3], plus(2)); // At this point, no calculations have been performed
const b = list(a); // This will actually cause the values of the a iterator to be calculated
```

Try the above example with a couple of `console.log` statements and see what happens.

The practical upshot of this property is that it becomes possible to work with infinite
sequences, like the `primes()` sequence above. It can be more efficient as well, since
values that are not needed are not computed.

```js
const {take, list, assertSequenceEquals} = require('ferrum');

function* fibonacci() {
  let a=0, b=1;
  while (true) {
    yield a;
    yield b;
    a += b;
    b += a;
  }
}

// Even though fibonacci() is infinite, this just works because only the
// first five fibonacci numbers are actually generated
// Note that just list(fibonacci()) would crash the program since that would
// require infinite memory and infinite time
assertSequenceEquals(take(fibonacci(), 5), [0, 1, 1, 2, 3]);
```

Underscore and lodash use arrays instead of iterators, so they have no lazy evaluation support.
wu.js uses iterators and thus has full lazy evaluation support.

<a name="traits"></a>
### Traits

`Sequence/Traits` is the second big feature this library provides; it is a concept borrowed from
the Rust language. They let you declare & document a generic interface; like the `sequence` concept
above they are not an entirely new concept; while sequence is a library designed to make working
with the [JavaScript iteration protocols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)
easier, traits standardize the creation of JavaScript protocols itself, thereby reducing boilerplate.
Indeed the `Sequence` Trait is just a wrapper over the `Iterable` protocol of JavaScript.

```js
const {Trait} = require('ferrum');

// Declaring a trait
/**
 * The Size trait is used for any containers that have a known size, like
 * arrays, strings, Maps…
 * Size should be used only for sizes that are relatively quick to compute, O(1) optimally…
 * @interface
 */
const Size = new Trait('Size');

// Using it
const size = (what) => Size.invoke(what);
const empty = (what) => size(what) === 0;

// Providing implementations for own types; this implementation will be
// inherited by subclasses
class MyType {
  [Size.sym]() {
    return 42;
  }
}

// Providing implementations for third party types. These won't be inherited
// by subclasses
Size.impl(Array, (x) => x.length); // Method of type Array
Size.impl(String, (x) => x.length);
Size.impl(Map, (x) => x.size);
Size.impl(Set, (x) => x.size);

// This implementation just applies to plain objects.
Size.impl(Object, (x) => {
  let cnt = 0;
  for (const _ in x) cnt++;
  return cnt;
});

// Note: The two following examples would be a bad idea in reality,
// they are just here toshow the mechanism
Size.implStatic(null, (_) => 0); // Static implementation (for a value and not a type)
```

Some of the advantages of using Traits are illustrated for the code above:
First of all, using traits saves us a bit of boilerplate code; by having an actual
variable representing the trait, we have a good place to document the trait; the `@interface`
jsdoc feature can be used for this. We can also use this documentation to specify laws that
implementations of the trait should abide by, like the (soft) law that `Size` implementations
should be quick to compute.

Trait also features machinery to implement traits for third party types and even built in types
like `Array`, `Object`, `null` or `undefined`. The classic way to implement protocols does not work in these
cases:

```js
const Size = Symbol('Size');

// Using just Symbols works perfectly for your own types
class MyType {
  [Size]() {
    return 42;
  }
}

// Using symbols for third party types is suboptimal,
// since we have to modify the type's prototype which
// could lead to weirdness
Array.prototype[Size] = () => this.length;

// Using symbols for Object, is a very bad idea as the implementation
// will be inherited by all other classes…this implementation obviously
// is the wrong one for Set for instance.
// This also illustrates why it is generally a bad idea to enable inheritance
// for third party types
Object.prototype[Size] = () => {
  let cnt = 0;
  for (const _ in this) cnt++;
  return cnt;
}

// Using symbols on values like null or undefined will just lead to a TypeError
// being thrown

//null[Size] = () => 0; // throws TypeError
```

The oldest pre-ES6 implementation just used method names; this strategy is very
problematic, since two different interfaces may use the same method name:

```js
class MyDbTable {
  size() {
    return request(`https://mydb.com/${this._tableName}/size`);
  }
};

class MyLocalTable {
  size() {
    return this._payload.length;
  }
}
```

In the hypothetical example above, one size() method returns an integer, while
the other returns a promise resolving an integer (which makes total sense since
it's the size of some database table). Even though each method makes sense for itself,
there is no way to distinguish between them; the developer may write a function, expecting an integer…

Since the method name `size()` is already taken, we cannot even implement the async
size interface for `MyLocalTable`.

Using traits we can actually encapsulate this relationship well:

```js
// dbtable.js
const { Trait, Size: SyncSize } = require('ferrum');
const Size = new Trait('Size');

class DbTable {
  [Size.sym]() {
    return request(`https://mydb.com/${this._tableName}/size`);
  }
};

class MyLocalTable {
  [Size.sym]() {
    return this._payload.length;
  }
}

Size.implDerived([SyncSize], ([size], v) => Promise.resolve(size(v)));
```

This example above illustrates how – using traits – we can not only deal with
name collisions by just renaming traits on the fly, we were also able to write
a generic adapter that automatically implements `AsyncSize` for all types supporting `Size`.

To sum up, using Traits provides a number of advantages: Traits let you avoid
some boilerplate code, they allow you to specify and implement generic interfaces
without the danger of name collisions; they let you provide implementations for third
party types, built-in types and even `null`, `undefined` and plain `Object` without
modifying these types.
They even let you write generic adapters, implementing traits for entire groups
of traits at once.

<a name="operators-as-functions"></a>
### Operators as functions

`Ferrum/Ops` provides all of the JS operators and some extra boolean operators as curryable functions.

```js
const {plus, and, not, is, xor, map, list} = require('ferrum');

list(map([1,2,3], plus(2))); // => [3,4,5]
and(true, false);  // => false
not(1); // => false
is(2, 2); // => true
xor(true, false); // => true
```

<a name="typing-utilities"></a>
### Typing utilities

Ferrum provides utilities for working with types that can be safely
used with null and undefined.

```js
const {isdef, type, typename} = require('ferrum');

isdef(0); // => true
isdef(null); // => false
isdef(undefined); // => false

type(22); // => Number
type(null); // => null
type(undefined); // => undefined

typename(type(22)); // => "Number"
typename(type(null)); // => "null"
typename(type(undefined)); // => "undefined"
```

The usual strategy of using `value.constructor` and `value.constructor.name`
yields errors for `null` & `undefined`.

<a name="functional-utilities"></a>
### Functional Utilities

```js
const {curry, pipe, filter, isdef, uniq, map, plus} = require('ferrum');

// Using pipe() + auto currying instead of chaining
pipe(
  [0,1,2,null,3,4,null,5,1,3,2,null,1,4],
  filter(isdef), // Filter out every null & undefined
  uniq,          // Remove duplicates
  map(plus(2))); // Add two to each element
// => [2,3,4,5,6,7]

// Auto currying
const pair = curry('pair', (a, b) => [a, b]);
pair(1,2); // => [1,2]
pair(2)(1); // => [1,2]
```

<a name="changelog"></a>
## Change Log

### 1.4.0

*  Add intersperse() ([8d28f73](https://github.com/adobe/ferrum/commit/d28f73))

### 1.3.0

* Add function repeatFn() ([81de232](https://github.com/adobe/ferrum/commit/81de232))
* Provide chunkify functions ([9ff9603](https://github.com/adobe/ferrum/commit/9ff9603))
* Provide takeShort() & takeWithFallback() ([bafa834](https://github.com/adobe/ferrum/commit/bafa834))
* slidingWindow now returns an empty sequence if no=0 ([533cff4](https://github.com/adobe/ferrum/commit/533cff4))

### 1.2.0

* **Bugfix: Support for objects with Symbol keys** – Before this change
  most functions would disregard Symbol keys in objects. E.g. `size({[Symbol()]: 42})`
  would return zero. Now the functions
  `pairs(), keys(), values(), size(), empty(), shallowclone(), deepclone(), iter(),
   each(), replace(), setdefault(), del(), assign(), has(), get(), eq, uneq,
   assertEquals, assertUneq` are explicitly tested and with objects containing symbol keys.

<a name="development"></a>
## Development

<a name="build"></a>
### Build

```bash,notest
$ npm install
```

<a name="test"></a>
### Test

```bash,notest
$ npm test
```

<a name="lint"></a>
### Lint

```bash,notest
$ npm run lint
```
