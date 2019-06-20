## Modules

<dl>
<dt><a href="#module_functional">functional</a></dt>
<dd><p>Generic library for functional programming &amp; working with functions.</p>
</dd>
<dt><a href="#module_op">op</a></dt>
<dd><p>Provides common javascript operators as curryable functions.</p>
</dd>
<dt><a href="#module_seqeuence">seqeuence</a></dt>
<dd><p>Generic library for advanced utilization of es6 iterators.</p>
<p>map, fold and so on...</p>
<p>sequence.js functions are fully lazy and work with anything implementing
the iterator protocol; in addition, all functions also support treating
plain objects as sequences!</p>
<p>The advantage of lazy implementations is that these functions work efficiently
with very long or even infinite sequences; assuming the following example is
given a sequence with ten billion elements, it would still start printing it&#39;s
output immediately and would not require creating another billion element array
as <code>Array.map</code> would do.
In practice the <code>x*2</code> would be calculated immediately before the result is printed.</p>
<pre><code>each(map(sequence, (x) =&gt; x*2), console.log)</code></pre><p>A disadvantage of lazyness is that side effects (e.g. a console.log inside a map())
are not executed, before the resulting sequence is actually being consumed by a
for loop or each() or fold() or similar functions…
So if you need to perform side effects, remember to use one of these
instead of lazy functions like map();</p>
<p>sequence.js functions also support passing functions as the last argument:</p>
<pre><code>each(seq, (elm) =&gt; {
  doSomething(elm);
  console.log(elm);
});</code></pre><p>is much more readable then the example below; especially when you
are using multiple nested each/map/fold calls and the function bodies
grow long!</p>
<pre><code>each((elm) =&gt; {
  doSomething(elm);
  console.log(elm);
}, seq);</code></pre><p>Some of the utilities in here can <em>mostly</em> be implemented with
standard js6.
The emphasis here is on mostly, since sequence.js functions are
designed to have fewer edge cases that classical es6 pendants and
therefor make for a smoother coding experience.</p>
<p>Examples:</p>
<h4 id="iteration">Iteration</h4>
<pre><code>&gt; for (const v of {foo: 42, bar: 23}) console.log(v);
TypeError: {(intermediate value)(intermediate value)} is not iterable</code></pre><p>Does not work because plain objects do not implement the iterator protocol.</p>
<h4 id="replace-with">Replace With</h4>
<pre><code>&gt; each([1,2,3,4], console.log);
1
2
3
4</code></pre><p>or</p>
<pre><code>&gt; each({foo: 42}, v =&gt; console.log(v));
[ &#39;foo&#39;, 42 ]</code></pre><p>or the following if the full power of a for loop is really required..</p>
<pre><code>for (const v of iter({foo: 42})) console.log(v);
[ &#39;foo&#39;, 42 ]</code></pre><h4 id="arrayforeach">Array.forEach</h4>
<pre><code>&gt; [1,2,3,4].forEach(console.log)
1 0 [ 1, 2, 3, 4 ]
2 1 [ 1, 2, 3, 4 ]
3 2 [ 1, 2, 3, 4 ]
4 3 [ 1, 2, 3, 4 ]</code></pre><p>Unexpectedly yields a lot of output; that is because forEach also passes
the index in the array as well as the <code>thisArgument</code>.
This behaviour is often unexpected and forces us to define an intermediate
function.</p>
<h4 id="replace-with-1">Replace With</h4>
<pre><code>&gt; each([1,2,3,4], console.log);
1
2
3
4</code></pre><p>If the index is really needed, <code>enumerate()</code> may be used:</p>
<pre><code>each(enumerate([42, 23]), console.log)
[ 0, 42 ]
[ 1, 23 ]</code></pre><p>As a sidenote this also effortlessly fits the concept of a key/value
container; the output of <code>enumerate([42, 23])</code> could easily passed
into <code>new Map(...)</code>;</p>
<p>The full behaviour of for each</p>
</dd>
<dt><a href="#module_stdtraits">stdtraits</a></dt>
<dd><p>Highly generic traits/interfaces.</p>
<h3 id="laws">Laws</h3>
<p>These apply to all traits in this module.</p>
<ul>
<li>Arrays, Strings and any list-like data structures are treated
as mappings from index -&gt; value</li>
<li>Array sparseness is ignored on read; any list-like container <code>has</code> a
specific index if <code>size(myContainer) =&gt; key</code>; getting an unset value
yields <code>undefined</code></li>
<li>Sets are treated as mappings from a key to itself</li>
</ul>
</dd>
<dt><a href="#module_trait">trait</a></dt>
<dd><p>Introducing type classes (from haskell)/traits (from rust) to javascript.</p>
</dd>
<dt><a href="#module_typesafe">typesafe</a></dt>
<dd><p>Helpers for working with types; specifically designed
to allow null/undefined to be treated the same as any other value.</p>
</dd>
</dl>

<a name="module_functional"></a>

## functional
Generic library for functional programming & working with functions.


* [functional](#module_functional)
    * [~exec()](#module_functional..exec)
    * [~identity()](#module_functional..identity)
    * [~pipe(val, ...fns)](#module_functional..pipe) ⇒ <code>Any</code>
    * [~compose(...fns)](#module_functional..compose) ⇒ <code>function</code>
    * [~withFunctionName(name, fn, Just)](#module_functional..withFunctionName)
    * [~curry()](#module_functional..curry)

<a name="module_functional..exec"></a>

### functional~exec()
Immediately execute the given function.

```
const {exec} = require('ferrum');

// Normal scopes cannot return values
let r;
{
  let x = 42, y = 5;
  r = x + y;
}

// Can be rewritten as
const r = exec(() => {
  let x = 42, y = 5;
  return  x + y;
});
```

**Kind**: inner method of [<code>functional</code>](#module_functional)  
<a name="module_functional..identity"></a>

### functional~identity()
Just a function that returns it's argument!

```
const {identity, list, filter} = require('ferrum');

identity(null) # => null
identity(42) # => 42

// Identity is sometimes useful in higher order functions like
// filter(); this example for instance removes all values from
// the list that are falsy
pipe(
  [null, "asd", "", "foo"],
  filter(identity),
  list
);
// => ["asd", "foo"]
```

**Kind**: inner method of [<code>functional</code>](#module_functional)  
<a name="module_functional..pipe"></a>

### functional~pipe(val, ...fns) ⇒ <code>Any</code>
Pipeline a value through multiple function calls.

```
// Sometimes you get very nested function invocations:

pipe(
  [1,2,null,3,4,null,5,1,3,2,null,1,4],
  filter(identity),
  uniq,
  map(plus(2)),
)
console.log(pipe(
  4,
  (x) => x+2,
  (x) => x*3
));
// => 18
```

**Kind**: inner method of [<code>functional</code>](#module_functional)  

| Param | Type | Description |
| --- | --- | --- |
| val | <code>Any</code> | The value to pipe through the functions |
| ...fns | <code>function</code> | Multiple functions |

<a name="module_functional..compose"></a>

### functional~compose(...fns) ⇒ <code>function</code>
Function composition.

```
const fn = compose(
  (x) => x+2,
  (x) => x*3
);

console.log(fn(4)); // => 18
```

**Kind**: inner method of [<code>functional</code>](#module_functional)  
**Returns**: <code>function</code> - All the functions in the sequence composed into one  

| Param | Type | Description |
| --- | --- | --- |
| ...fns | <code>function</code> | Multiple functions |

<a name="module_functional..withFunctionName"></a>

### functional~withFunctionName(name, fn, Just)
Manually assign a name to a function.

**Kind**: inner method of [<code>functional</code>](#module_functional)  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | The new name of the function. |
| fn | <code>function</code> | The function to assign a name to |
| Just | <code>function</code> | returns `fn` again. |

<a name="module_functional..curry"></a>

### functional~curry()
Autocurry a function!

https://en.wikipedia.org/wiki/Currying

Any function that has a fixed number of parameters may be curried!
Curried parameters will be in reverse order. This is useful for
functional programming, because it allows us to use function parameters
in the suffix position when using no curring:

```
const toNumber = (seq) => map(seq, n => Number(n));

// is the same as

const toNumber = map(n => Number(n))

// or even

const toNumber = map(Number);
```

Note how in the second version we specified the last parameter
first due to currying.

Reverse order only applies in separate invocations:

```
const sum = (seq) => foldl(seq, 0, (a, b) => a+b);

// is the same as

const sum = foldl(0, (a, b) => a+b);

// or even

concat = sum = foldl(0, plus);
```

Note how in version two, we specify the parameters in order 2, 3, and then 1:

`fn(a, b, c) <=> fn(c)(b)(a) <=> fn(b, c)(a)`

**Kind**: inner method of [<code>functional</code>](#module_functional)  
<a name="module_op"></a>

## op
Provides common javascript operators as curryable functions.


* [op](#module_op)
    * [~and(a, b)](#module_op..and) ⇒ <code>A</code> \| <code>B</code>
    * [~or(a, b)](#module_op..or) ⇒ <code>A</code> \| <code>B</code>
    * [~not(a)](#module_op..not) ⇒ <code>Boolean</code>
    * [~nand(a, b)](#module_op..nand) ⇒ <code>Boolean</code>
    * [~nor(a, b)](#module_op..nor) ⇒ <code>Boolean</code>
    * [~xor(a, b)](#module_op..xor) ⇒ <code>Boolean</code>
    * [~xnor(a, b)](#module_op..xnor) ⇒ <code>Boolean</code>
    * [~is(a, b)](#module_op..is) ⇒ <code>Boolean</code>
    * [~aint(a, b)](#module_op..aint) ⇒ <code>Boolean</code>
    * [~plus(a, b)](#module_op..plus) ⇒ <code>Number</code> \| <code>String</code>
    * [~mul(a, b)](#module_op..mul) ⇒ <code>Number</code>

<a name="module_op..and"></a>

### op~and(a, b) ⇒ <code>A</code> \| <code>B</code>
The `&&` operator as a function.

```
const {and} = require('ferrum');

and("", true) // => ""
and(true, 42) // => 42

and(true)("") // => ""
and(42)(true) // => 42
```

**Kind**: inner method of [<code>op</code>](#module_op)  

| Param | Type |
| --- | --- |
| a | <code>A</code> | 
| b | <code>B</code> | 

<a name="module_op..or"></a>

### op~or(a, b) ⇒ <code>A</code> \| <code>B</code>
The `||` operator as a function

```
const {or} = require('ferrum');

or(42, false) // => 42
or(true, 5) // => 5

or(false)(42) // => 42
or(5)(true) // => 5
```

**Kind**: inner method of [<code>op</code>](#module_op)  

| Param | Type |
| --- | --- |
| a | <code>A</code> | 
| b | <code>B</code> | 

<a name="module_op..not"></a>

### op~not(a) ⇒ <code>Boolean</code>
The `!` as a function

```
const {not} = require('ferrum');

not(42); // => false
not(null); // => true
```

**Kind**: inner method of [<code>op</code>](#module_op)  

| Param | Type |
| --- | --- |
| a | <code>A</code> | 

<a name="module_op..nand"></a>

### op~nand(a, b) ⇒ <code>Boolean</code>
NAND as a function.

```
const {nand} = require('ferrum');

nand(true, 42) // => false
nand(null, false) // => true
nand(true, false) // => true

nand(true)(42) // => false
nand(null)(false) // => true
nand(true)(false) // => true
```

**Kind**: inner method of [<code>op</code>](#module_op)  

| Param | Type |
| --- | --- |
| a | <code>A</code> | 
| b | <code>B</code> | 

<a name="module_op..nor"></a>

### op~nor(a, b) ⇒ <code>Boolean</code>
NOR as a function.

```
const {nor} = require('ferrum');

nor(true, true) // => false
nor(false, true) // => false
nor(false, false) // => true

nor(true)(true) // => false
nor(false)(true) // => false
nor(false)(false) // => true
```

**Kind**: inner method of [<code>op</code>](#module_op)  

| Param | Type |
| --- | --- |
| a | <code>A</code> | 
| b | <code>B</code> | 

<a name="module_op..xor"></a>

### op~xor(a, b) ⇒ <code>Boolean</code>
XOR as a function.

```
const {xor} = require('ferrum');

xor(true, true) // => false
xor(false, true) // => true
xor(true, false) // => true
xor(false, false) // => false

xor(true)(true) // => false
xor(false)(true) // => true
xor(true)(false) // => true
xor(false)(false) // => false
```

**Kind**: inner method of [<code>op</code>](#module_op)  

| Param | Type |
| --- | --- |
| a | <code>A</code> | 
| b | <code>B</code> | 

<a name="module_op..xnor"></a>

### op~xnor(a, b) ⇒ <code>Boolean</code>
XNOR as a function.

```
const {xnor} = require('ferrum');

xnor(true, true) // => true
xnor(false, true) // => false
xnor(true, false) // => false
xnor(false, false) // => true

xnor(true)(true) // => true
xnor(false)(true) // => false
xnor(true)(false) // => false
xnor(false)(false) // => true
```

**Kind**: inner method of [<code>op</code>](#module_op)  

| Param | Type |
| --- | --- |
| a | <code>A</code> | 
| b | <code>B</code> | 

<a name="module_op..is"></a>

### op~is(a, b) ⇒ <code>Boolean</code>
`===` as a function

```
const {is, count, filter, pipe} = require('ferrum');

is(42, 42) // => true
is(42, "") // => false
is({}, {}) // => false (Can only successfully compare primitives)

is(42)(42) // => true
is(42)("") // => false
is({})({}) // => false (Can only successfully compare primitives)

// Count how many times the value `42` occurs in the list
const cnt = pipe(
  [42, 23, 1, 4, 17, 22, 42],
  filter(is(42)),
  count
);
assert(cnt == 42);
```

**Kind**: inner method of [<code>op</code>](#module_op)  

| Param | Type |
| --- | --- |
| a | <code>A</code> | 
| b | <code>B</code> | 

<a name="module_op..aint"></a>

### op~aint(a, b) ⇒ <code>Boolean</code>
`!==` as a function

```
const {aint, list, filter, pipe} = require('ferrum');

aint(42, 42) // => false
aint(42, "") // => true
aint({}, {}) // => true (Can only successfully compare primitives)

aint(42)(42) // => false
aint(42)("") // => true
aint({})({}) // => false (Can only successfully compare primitives)

// Remove the value 42 from the list
pipe(
  [1,2,3,4,42,5,24],
  filter(aint(42)),
  list;
)
// => [1,2,3,4,5]
```

**Kind**: inner method of [<code>op</code>](#module_op)  

| Param | Type |
| --- | --- |
| a | <code>A</code> | 
| b | <code>B</code> | 

<a name="module_op..plus"></a>

### op~plus(a, b) ⇒ <code>Number</code> \| <code>String</code>
The `+` operator as a function:

```
const {plus, list, map, pipe} = require('ferrum');

plus(3, 4) // => 7
plus(3, -4) // => -1; Can also be used for substraction
plus("foo", "bar") // => "foobar"

plus(3)(4) // => 7
plus(3)(-4) // => -1; Can also be used for subtraction
plus("bar")("foo") // => "foobar"

// Subtract one from each element in the list
pipe(
  [1,2,3,4,5],
  plus(-1),
  list
);
// => [0,1,2,3,4]
```

NOTE: There is no subtract function, if you need subtraction just
negate the value to subtract with the  operator please: `const minus = (a, b) => plus(a, -b)`

**Kind**: inner method of [<code>op</code>](#module_op)  

| Param | Type |
| --- | --- |
| a | <code>Number</code> \| <code>String</code> | 
| b | <code>Number</code> \| <code>String</code> | 

<a name="module_op..mul"></a>

### op~mul(a, b) ⇒ <code>Number</code>
The `*` operator as a function:

```
const {mul, list, map, pipe} = require('ferrum');

mul(3, 4) // => 12
mul(3, 1/10) // => -1; Can also be used for s

plus(3)(4) // => 7
plus(3)(-4) // => -1; Can also be used for substraction

// Divide each element in the list by ten
pipe(
  [1,2,3,4,5],
  map(div(1/10)),
  list
);
// [0.1, 0.2, 0.3, 0.4, 0.5]
```

NOTE: There is no division function, if you need division just
do this: `const div = (a, b) => mul(a, 1/b)`;

**Kind**: inner method of [<code>op</code>](#module_op)  

| Param | Type |
| --- | --- |
| a | <code>Number</code> | 
| b | <code>Number</code> | 

<a name="module_seqeuence"></a>

## seqeuence
Generic library for advanced utilization of es6 iterators.

map, fold and so on...

sequence.js functions are fully lazy and work with anything implementing
the iterator protocol; in addition, all functions also support treating
plain objects as sequences!

The advantage of lazy implementations is that these functions work efficiently
with very long or even infinite sequences; assuming the following example is
given a sequence with ten billion elements, it would still start printing it's
output immediately and would not require creating another billion element array
as `Array.map` would do.
In practice the `x*2` would be calculated immediately before the result is printed.

```
each(map(sequence, (x) => x*2), console.log)
```

A disadvantage of lazyness is that side effects (e.g. a console.log inside a map())
are not executed, before the resulting sequence is actually being consumed by a
for loop or each() or fold() or similar functions…
So if you need to perform side effects, remember to use one of these
instead of lazy functions like map();

sequence.js functions also support passing functions as the last argument:

```
each(seq, (elm) => {
  doSomething(elm);
  console.log(elm);
});
```

is much more readable then the example below; especially when you
are using multiple nested each/map/fold calls and the function bodies
grow long!

```
each((elm) => {
  doSomething(elm);
  console.log(elm);
}, seq);
```

Some of the utilities in here can *mostly* be implemented with
standard js6.
The emphasis here is on mostly, since sequence.js functions are
designed to have fewer edge cases that classical es6 pendants and
therefor make for a smoother coding experience.

Examples:

#### Iteration

```
> for (const v of {foo: 42, bar: 23}) console.log(v);
TypeError: {(intermediate value)(intermediate value)} is not iterable
```

Does not work because plain objects do not implement the iterator protocol.

#### Replace With

```
> each([1,2,3,4], console.log);
1
2
3
4
```

or

```
> each({foo: 42}, v => console.log(v));
[ 'foo', 42 ]
```

or the following if the full power of a for loop is really required..

```
for (const v of iter({foo: 42})) console.log(v);
[ 'foo', 42 ]
```

#### Array.forEach

```
> [1,2,3,4].forEach(console.log)
1 0 [ 1, 2, 3, 4 ]
2 1 [ 1, 2, 3, 4 ]
3 2 [ 1, 2, 3, 4 ]
4 3 [ 1, 2, 3, 4 ]
```

Unexpectedly yields a lot of output; that is because forEach also passes
the index in the array as well as the `thisArgument`.
This behaviour is often unexpected and forces us to define an intermediate
function.

#### Replace With

```
> each([1,2,3,4], console.log);
1
2
3
4
```

If the index is really needed, `enumerate()` may be used:

```
each(enumerate([42, 23]), console.log)
[ 0, 42 ]
[ 1, 23 ]
```

As a sidenote this also effortlessly fits the concept of a key/value
container; the output of `enumerate([42, 23])` could easily passed
into `new Map(...)`;

The full behaviour of for each


* [seqeuence](#module_seqeuence)
    * [~Sequence](#module_seqeuence..Sequence)
    * [~Into](#module_seqeuence..Into)
    * [~extend](#module_seqeuence..extend) ⇒ <code>Iterator</code>
    * [~extend1](#module_seqeuence..extend1) ⇒ <code>Iterator</code>
    * [~flattenTree](#module_seqeuence..flattenTree) ⇒ <code>Sequnece</code>
    * [~join](#module_seqeuence..join)
    * [~into](#module_seqeuence..into)
    * [~foldl](#module_seqeuence..foldl)
    * [~foldr](#module_seqeuence..foldr)
    * [~map](#module_seqeuence..map) ⇒ <code>Iterator</code>
    * [~filter](#module_seqeuence..filter) ⇒ <code>Iterator</code>
    * [~reject](#module_seqeuence..reject)
    * [~trySkip](#module_seqeuence..trySkip) ⇒ <code>Iterator</code>
    * [~skip](#module_seqeuence..skip) ⇒ <code>Iterator</code>
    * [~skipWhile](#module_seqeuence..skipWhile) ⇒ <code>Iterator</code>
    * [~tryTake](#module_seqeuence..tryTake) ⇒ <code>Iterator</code>
    * [~take](#module_seqeuence..take) ⇒ <code>Array</code>
    * [~takeWhile](#module_seqeuence..takeWhile) ⇒ <code>Iterator</code>
    * [~takeUntilVal](#module_seqeuence..takeUntilVal) ⇒ <code>Iterator</code>
    * [~prepend](#module_seqeuence..prepend)
    * [~append](#module_seqeuence..append)
    * [~mapSort](#module_seqeuence..mapSort) ⇒ <code>Array</code>
    * [~zipLeast2](#module_seqeuence..zipLeast2)
    * [~zip2](#module_seqeuence..zip2)
    * [~zipLongest](#module_seqeuence..zipLongest) ⇒ <code>Iterator</code>
    * [~zipLongest2](#module_seqeuence..zipLongest2)
    * [~slidingWindow](#module_seqeuence..slidingWindow) ⇒ <code>Iterator</code>
    * [~trySlidingWindow](#module_seqeuence..trySlidingWindow)
    * [~lookahead](#module_seqeuence..lookahead)
    * [~mod](#module_seqeuence..mod) ⇒ <code>T</code>
    * [~union2](#module_seqeuence..union2)
    * [~iter(obj)](#module_seqeuence..iter) ⇒ <code>Iterator</code>
    * [~range(start, start)](#module_seqeuence..range)
    * [~range0()](#module_seqeuence..range0)
    * [~repeat()](#module_seqeuence..repeat)
    * [~next(seq)](#module_seqeuence..next) ⇒ <code>Any</code>
    * [~tryNext(seq, fallback)](#module_seqeuence..tryNext) ⇒ <code>Any</code>
    * [~nth(seq, idx)](#module_seqeuence..nth) ⇒ <code>Any</code>
    * [~first(seq)](#module_seqeuence..first) ⇒ <code>Any</code>
    * [~second(seq)](#module_seqeuence..second) ⇒ <code>Any</code>
    * [~last(seq)](#module_seqeuence..last) ⇒ <code>Any</code>
    * [~tryNth(seq, idx, fallback)](#module_seqeuence..tryNth) ⇒ <code>Any</code>
    * [~tryFirst(seq, fallback)](#module_seqeuence..tryFirst) ⇒ <code>Any</code>
    * [~trySecond(seq, fallback)](#module_seqeuence..trySecond) ⇒ <code>Any</code>
    * [~tryLast(seq, fallback)](#module_seqeuence..tryLast) ⇒ <code>Any</code>
    * [~each(seq, fn)](#module_seqeuence..each)
    * [~find(seq, fn)](#module_seqeuence..find) ⇒
    * [~tryFind(seq, fallback, fn)](#module_seqeuence..tryFind) ⇒
    * [~contains(seq)](#module_seqeuence..contains) ⇒ <code>Boolean</code>
    * [~seqEq(a, b)](#module_seqeuence..seqEq) ⇒ <code>Boolean</code>
    * [~count(a)](#module_seqeuence..count) ⇒ <code>Number</code>
    * [~list()](#module_seqeuence..list)
    * [~uniq()](#module_seqeuence..uniq)
    * [~dict()](#module_seqeuence..dict)
    * [~obj()](#module_seqeuence..obj)
    * [~any()](#module_seqeuence..any)
    * [~all()](#module_seqeuence..all)
    * [~sum()](#module_seqeuence..sum)
    * [~product()](#module_seqeuence..product)
    * [~reverse(seq)](#module_seqeuence..reverse) ⇒ <code>Array</code>
    * [~enumerate(seq)](#module_seqeuence..enumerate) ⇒ <code>Iterator</code>
    * [~takeDef(seq)](#module_seqeuence..takeDef) ⇒ <code>Iterator</code>
    * [~flat(seq)](#module_seqeuence..flat)
    * [~concat()](#module_seqeuence..concat)
    * [~zipLeast(seq)](#module_seqeuence..zipLeast) ⇒ <code>Iterator</code>
    * [~zip(seq)](#module_seqeuence..zip) ⇒ <code>Iterator</code>
    * [~cartesian(seqs)](#module_seqeuence..cartesian)
    * [~union()](#module_seqeuence..union)

<a name="module_seqeuence..Sequence"></a>

### seqeuence~Sequence
Trait for any iterable type.

Uses the `Symbol.iterator` Symbol, so this is implemented for any
type that implements the iterator protocol.

**Kind**: inner interface of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..Into"></a>

### seqeuence~Into
Into can be used to turn sequences back into other types.

into is the inverse of `iter()`, meaning that taking the result
of `iter()` and calling `into()`, yields the original value.

So in a purely functional language, `into(iter(v))` would be a
no-op; since we are in javascript, this essentially implements
a poor mans shallow copy for some types

```
const shallowcopy = (v) => into(v, v.constructor);
```

#### Interface

`(T: Type/Function, v: Sequence) => r: T

#### Laws

* `into(v, type(v)) <=> shallowclone(v)`

#### Specialization notes

String: Uses toString() on each value from the sequence
  and concatenates them into one string...
Object: Expects key/value pairs; the keys must be strings;
  sequences containing the same key multiple times and sequences
  with bad key/value pairs are considered to be undefined behaviour.
  The key/value pairs may be sequences themselves.
Map: Same rules as for object.
Set: Refer to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set

#### Examples

Practical uses of into include converting between types; e.g:

```
into({foo:  42, bar: 23}, Map) # Map { 'foo' => 42, 'bar' }
into(["foo", " bar"], String) # "foo bar"
into([1,1,2,3,4,2], Set) # Set(1,2,3,4)
```

Into is also useful to transform values using the functions
in this class:

```
# Remove odd numbers from a set
const st = new Set([1,1,2,2,3,4,5]);
into(filter(st, n => n % 2 == 0), Set) # Set(2,4)

# Remove a key/value pair from an object
const obj = {foo: 42, bar: 5};
into(filter(obj, ([k, v]) => k !== 'foo'), Obj)
# yields {bar: 5}
```

It can be even used for more complex use cases:

```
# Merge multiple key/value containers into one sequence:
const seq = concat([[99, 42]], new Map(true, 23), {bar: 13});
into(seq, Map) # Map( 99 => 42, true => 23, bar => 13 )
```

**Kind**: inner interface of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..extend"></a>

### seqeuence~extend ⇒ <code>Iterator</code>
Generate a sequence by repeatedly calling the same function on the
previous value.

This is often used in conjunction with takeDef or takeWhile to generate
a non-infinite sequence.

```
// Generate an infinite list of all positive integers
extend(0, x => x+1);
// Generate the range of integers [first; last[
const range = (first, last) =>
  takeUntilVal(extend(first, x => x+1), last);
```

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type |
| --- | --- |
| init | <code>Any</code> | 
| fn | <code>function</code> | 

<a name="module_seqeuence..extend1"></a>

### seqeuence~extend1 ⇒ <code>Iterator</code>
Like extend(), but the resulting sequence does not contain
the initial element.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type |
| --- | --- |
| init | <code>Any</code> | 
| fn | <code>function</code> | 

<a name="module_seqeuence..flattenTree"></a>

### seqeuence~flattenTree ⇒ <code>Sequnece</code>
Flatten trees of any type into a sequence.

The given function basically has three jobs:

1. Decide whether a given value in a tree is a node or a leaf (or both)
2. Convert nodes into sequences so we can easily recurse into them
3. Extract values from leaves

If the given function does it's job correctly, visit will yield
a sequence with all the values from the tree.

The function must return a sequence of values! It is given the current
node as well as a callback that that takes a list of child nodes and flattens
the given subnodes.

Use the following return values:

```
flattenTree((node, recurse) => {
  if (isEmptyLeaf()) {
    return [];

  } else if (isLeaf(node)) {
    return [node.value];

  } else if (isMultiLeaf(node)) {
    return node.values;

  } else if (isNode(node)) {
    return recurse(node.childNodes);

  } else if (isLeafAndNode(node)) {
    return concat([node.value], recurse(node.childNodes));
  }
 }
});
```

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
**Returns**: <code>Sequnece</code> - A sequence containing the actual values from the tree  

| Param | Type | Description |
| --- | --- | --- |
| val | <code>Any</code> | The tree to flatten |
| fn | <code>function</code> | The function that does the actual flattening |

<a name="module_seqeuence..join"></a>

### seqeuence~join
Convert each element from a sequence into a string
and join them with the given separator.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..into"></a>

### seqeuence~into
Convert values into a given type using the `Into` trait.
Note that this has inverse parameters compared to the trait
(sequence first, type second) for currying purposes.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..foldl"></a>

### seqeuence~foldl
Combine all the values from a sequence into one value.

This function is also often called reduce, because it reduces
multiple values into a single value.

Here are some common use cases of the foldl function:

```
const all = (seq) => foldl(seq, true, (a, b) => a && b);
const any = (seq) => foldl(seq, false, (a, b) => a || b);
const sum = (seq) => foldl(seq, 0, (a, b) => a + b);
const product = (seq) => foldl(seq, 1, (a, b) => a * b);
```

Notice the pattern: We basically take an operator and apply
it until the sequence is empty: sum([1,2,3,4]) is pretty much
equivalent to `1 + 2 + 3 + 4`.

(If you want to get very mathematical here...notice how we basically
have an operation and then just take the operation's neutral element
as the initial value?)

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | The sequence to reduce |
| Any | <code>initial</code> | The initial value of the reduce operation.   If the sequence is empty, this value will be returned. |

<a name="module_seqeuence..foldr"></a>

### seqeuence~foldr
Like foldl, but right-to-left

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..map"></a>

### seqeuence~map ⇒ <code>Iterator</code>
Lazily transform all the values in a sequence.

```
into(map([1,2,3,4], n => n*2), Array) # [2,4,6,8]
```

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| fn | <code>function</code> | The function that transforms all the values in the sequence |

<a name="module_seqeuence..filter"></a>

### seqeuence~filter ⇒ <code>Iterator</code>
Remove values from the sequence based on the given condition.

```
filter(range(0,10), x => x%2 == 0) // [2,4,6,8]
```

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| fn | <code>function</code> | The function |

<a name="module_seqeuence..reject"></a>

### seqeuence~reject
Opposite of filter: Removes values from the sequence if the function
returns true.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..trySkip"></a>

### seqeuence~trySkip ⇒ <code>Iterator</code>
Like skip, but returns an exhausted iterator if the sequence contains
less than `no` elements instead of throwing IteratorEnded.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
**Params**: <code>Number</code> no The number of elements to skip  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..skip"></a>

### seqeuence~skip ⇒ <code>Iterator</code>
Skip elements in a sequence.
Throws IteratorEnded if the sequence contains less than `no` elements.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
**Params**: <code>Number</code> no The number of elements to skip  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..skipWhile"></a>

### seqeuence~skipWhile ⇒ <code>Iterator</code>
Skips elements in the given sequences until one is found
for which the predicate is false.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
**Returns**: <code>Iterator</code> - The first element for which pred returns false
  plus the rest of the sequence.  
**Params**: <code>Function</code> pred  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..tryTake"></a>

### seqeuence~tryTake ⇒ <code>Iterator</code>
Yields an iterator of the first `no` elements in the given
sequence; the resulting iterator may contain less then `no`
elements if the input sequence was shorter than `no` elements.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
**Returns**: <code>Iterator</code> - The first element for which pred returns false
  plus the rest of the sequence.  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| no | <code>Number</code> | The number of elements to take |

<a name="module_seqeuence..take"></a>

### seqeuence~take ⇒ <code>Array</code>
Version of tryTake that will throw IteratorEnded
if the given iterable is too short.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..takeWhile"></a>

### seqeuence~takeWhile ⇒ <code>Iterator</code>
Cut off the sequence at the first point where the given condition is no
longer met.

`list(takeWhile([1,2,3,4,5,6...], x => x < 4))` yields `[1,2,3]`

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| fn | <code>function</code> | The predicate function |

<a name="module_seqeuence..takeUntilVal"></a>

### seqeuence~takeUntilVal ⇒ <code>Iterator</code>
Cut of the sequence at the point where the given value is
first encountered.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..prepend"></a>

### seqeuence~prepend
Given a sequence and a value, prepend the value to the sequence,
yielding a new iterator.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..append"></a>

### seqeuence~append
Given a sequence and a value, append the value to the sequence,
yielding a new iterator.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..mapSort"></a>

### seqeuence~mapSort ⇒ <code>Array</code>
Sort a sequence.
The given function must turn map each parameter to a string or
number. Objects will be sorted based on those numbers.A
If the given parameters are already numbers/strings, you may
just use identity as the mapping function.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| fn | <code>function</code> |  |

<a name="module_seqeuence..zipLeast2"></a>

### seqeuence~zipLeast2
Curryable version of zipLeast

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..zip2"></a>

### seqeuence~zip2
Curryable version of zip

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..zipLongest"></a>

### seqeuence~zipLongest ⇒ <code>Iterator</code>
Zip multiple sequences.
Puts all the first values from sequences into one sublist;
all the second values, third values and so on...
If the sequences are of different length, the resulting iterator
will have the length of the longest sequence; the missing values
from the shorter sequences will be substituted with the given
fallback value.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | A sequence of sequences |

<a name="module_seqeuence..zipLongest2"></a>

### seqeuence~zipLongest2
Curryable version of zipLongest

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..slidingWindow"></a>

### seqeuence~slidingWindow ⇒ <code>Iterator</code>
Forms a sliding window on the underlying iterator.

`slidingWindow([1,2,3,4,5], 3)`
yields `[[1,2,3], [2,3,4], [3,4,5]]`

Will throw IteratorEnded if the sequence is shorter than
the given window.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
**Returns**: <code>Iterator</code> - Iterator of lists  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | A sequence of sequences |

<a name="module_seqeuence..trySlidingWindow"></a>

### seqeuence~trySlidingWindow
Like slidingWindow, but returns an empty sequence if the given
sequence is too short.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..lookahead"></a>

### seqeuence~lookahead
Almost like trySlidingWindow, but makes sure that
every element from the sequence gets it's own subarray,
even the last element. The arrays at the end are filled
with the filler value to make sure they have the correct
length.

```
lookahead([], 3, null) # => []
lookahead([42], 3, null) # => [[42, null, null, null]]
lookahead([42, 23], 3, null) # => [[42, 23, null, null], [23, null, null, null]]
lookahead([42, 23], 0, null) # => [[42], [23]]
```

Try sliding window would yield an empty array in each of the examples
above.

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..mod"></a>

### seqeuence~mod ⇒ <code>T</code>
Modify/Transform the given value.

Applys the given value to the given function; after the return
value is known, that return value is converted into the type
of the given parameter.

```
const s = new Set([1,2,3,4]);
const z = mod1(s, map(plus(1))); # => new Set([2,3,4,5]),
assert(z.constructor === Set)
```

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| v | <code>T</code> | The value to transform |
| Fn | <code>function</code> | The transformation function |

<a name="module_seqeuence..union2"></a>

### seqeuence~union2
Curryable version of union

**Kind**: inner constant of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..iter"></a>

### seqeuence~iter(obj) ⇒ <code>Iterator</code>
Turn any object into an iterator.
Takes objects that implement the iterator protocol.
Plain objects are treated as key-value stores and yield
a sequence of their key value bytes, represented as size-2 arrays.

Any value that is allowed as a parameter for this function shall be
considered to be a `Sequence` for the purpose of this file.
This term shall be distinguished from `Iterable` in that iterables
must implement the iterator protocol `iterable[Symbol.iterator]()`.

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type |
| --- | --- |
| obj | <code>Object</code> \| <code>Iterable</code> \| <code>Iterator</code> | 

<a name="module_seqeuence..range"></a>

### seqeuence~range(start, start)
Generates an iterator with the numeric range [start; end[
Includes start but not end.

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
**Retunrs**: <code>Iterator</code>  

| Param | Type |
| --- | --- |
| start | <code>Number</code> | 
| start | <code>Number</code> | 

<a name="module_seqeuence..range0"></a>

### seqeuence~range0()
Like range(a, b) but always starts at 0

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..repeat"></a>

### seqeuence~repeat()
Generates an infinite iterator of the given value.

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..next"></a>

### seqeuence~next(seq) ⇒ <code>Any</code>
Extracts the next element from the iterator.

```
const {iter, next} = require('ferrum');

const it = iter([1,2,3]);
next(it); // => 1
next(it); // => 2
next(it); // => 3
next(it); // throws IteratorEnded
next(it); // throws IteratorEnded
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
**Throws**:

- <code>IteratorEnded</code> If the sequence is empty


| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..tryNext"></a>

### seqeuence~tryNext(seq, fallback) ⇒ <code>Any</code>
Extracts the next element from the iterator.

```
const {iter, tryNext} = require('ferrum');

const it = iter([1,2,3]);
tryNext(it, null); // => 1
tryNext(it, null); // => 2
tryNext(it, null); // => 3
tryNext(it, null); // => null
tryNext(it, null); // => null
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| fallback | <code>Any</code> | The value to return if the sequence is empty |

<a name="module_seqeuence..nth"></a>

### seqeuence~nth(seq, idx) ⇒ <code>Any</code>
Extract the nth element from the sequence

```
const {iter, next, nth} = require('ferrum');


const it = iter('hello world');
nth(it, 3);  // => 'l'
next(it);    // => 'o'

const fifth = nth(4);
fifth(it)  // => 'l'
nth(it, 10); // throws IteratorEnded
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
**Throws**:

- <code>IteratorEnded</code> If the sequence is too short


| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| idx | <code>Number</code> | The index of the element |

<a name="module_seqeuence..first"></a>

### seqeuence~first(seq) ⇒ <code>Any</code>
Extract the first element from the sequence; this is effectively
an alias for next();

```
const {first} = require('ferrum');

first([1,2]) // => 1
first([]); // throws IteratorEnded
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
**Throws**:

- <code>IteratorEnded</code> If the sequence is too short


| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..second"></a>

### seqeuence~second(seq) ⇒ <code>Any</code>
Extract the second element from the sequence

```
const {second} = require('ferrum');

second([1,2]) // => 2
second([1]); // throws IteratorEnded
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
**Throws**:

- <code>IteratorEnded</code> If the sequence is too short


| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..last"></a>

### seqeuence~last(seq) ⇒ <code>Any</code>
Extract the last element from the sequence

```
const {last} = require('ferrum');

last([1,2,3,4,5]) // => 5
last([]); // throws IteratorEnded
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
**Throws**:

- <code>IteratorEnded</code> If the sequence is empty


| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..tryNth"></a>

### seqeuence~tryNth(seq, idx, fallback) ⇒ <code>Any</code>
Extract the nth element from the sequence

```
const {iter, next, tryNth} = require('ferrum');

const it = iter('hello world');
tryNth(it, null, 3);  // => 'l'
next(it);    // => 'o'

const fifth = nth(4, null);
fifth(it)  // => 'l'
tryNth(it, 10, null); // => null
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| idx | <code>Number</code> | The index of the element |
| fallback | <code>Any</code> | The value to return if the sequence is too short |

<a name="module_seqeuence..tryFirst"></a>

### seqeuence~tryFirst(seq, fallback) ⇒ <code>Any</code>
Extract the first element from the sequence; this is effectively
an alias for tryNext();

```
const {tryFirst} = require('ferrum');

tryFirst([1,2], null) // => 1
tryFirst([], null);   // => null

const fn = tryFirst(null);
fn([]); // => null
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| fallback | <code>Any</code> | The value to return if the sequence is too short |

<a name="module_seqeuence..trySecond"></a>

### seqeuence~trySecond(seq, fallback) ⇒ <code>Any</code>
Extract the second element from the sequence

```
const {trySecond} = require('ferrum');

trySecond([1,2], null) // => 2
trySecond([1], null);  // => null

const fn = trySecond(null);
fn([1]); // => null
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| fallback | <code>Any</code> | The value to return if the sequence is too short |

<a name="module_seqeuence..tryLast"></a>

### seqeuence~tryLast(seq, fallback) ⇒ <code>Any</code>
Extract the last element from the sequence

```
const {tryLast} = require('ferrum');

tryLast([1,2,3,4,5], null) // => 5
tryLast([], null); // => null

const fn = tryLast(null);
fn([]); // => null
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| fallback | <code>Any</code> | The value to return if the sequence is empty |

<a name="module_seqeuence..each"></a>

### seqeuence~each(seq, fn)
Iterate over sequences: Apply the give function to
every element in the sequence

```
const {each} = require('ferrum');

each({foo: 42, bar: 23}, ([key, value]) => {
  console.log(`${key}: ${value}`)
});

each([1,2,3], (v) => {
  console.log(v);
});
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| fn | <code>function</code> | Function taking a single parameter |

<a name="module_seqeuence..find"></a>

### seqeuence~find(seq, fn) ⇒
Return the first element in the sequence for which the predicate matches.

```
const {find} = require('ferrum');

find([1,2,3,4], v => v>2); // => 3
find([1,2,3,4], v => v>10); // throws IteratorEnded

const findEven = find(v => v % 2 === 0);
find([3,4,1,2]); // => 4
find([]); // throws IteratorEnded
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
**Returns**: Any  
**Throws**:

- <code>IteratorEnded</code> If no element in the sequence matches the predicate..


| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| fn | <code>function</code> | The predicate |

<a name="module_seqeuence..tryFind"></a>

### seqeuence~tryFind(seq, fallback, fn) ⇒
Return the first element in the sequence for which the predicate matches.

```
const {tryFind} = require('ferrum');

tryFind([1,2,3,4], null, v => v>2); // => 3
tryFind([1,2,3,4], null, v => v>10); // => null

const findEven = tryFind(null, v => v%2 === 0);
findEven([1,9,10,14]); // => 10
findEven([]); // => null
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
**Returns**: Any  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |
| fallback | <code>Any</code> | The value to return if no element in the sequence matches the predicate |
| fn | <code>function</code> | The predicate |

<a name="module_seqeuence..contains"></a>

### seqeuence~contains(seq) ⇒ <code>Boolean</code>
Test if the given sequence contains a value that matches the predicate.

```
const {contains, eq, is, not} = require('ferrum');

const containsEven = contains(x => x%2 === 0);#
containsEven([1,2,3,4]); // => true
containsEven([1,3,5,7]); // => false

// Use is to search vor values using the === operator
const contains4 = contains(is(4));
// const contains4 = contains(x => x === 4); // this is a bit longer & harder to read
contains4([1,2,3]); // => false
contains4([4,4,4]); // => true

// You can use eq to search for values equal to another value
const containsEmptyObject = contains(eq({}));
containsEmptyObject([{foo: 42}]); // => false
containsEmptyObject([{}]); // => true
```

This function should be used over `tryFind` in cases where just the presence
of a value should be tested for:

```
// The usual pattern checking whether a value is contained would be this:
tryFind([1,2,3,4], null, is(3)); // => 3 (truthy)
tryFind([1,2,4,5], null, is(3)); // => null (falsy)

// Obviously this pattern breaks down when searching for falsy values
tryFind([0,1,2,3,4], null, is(0)); // => 0 (falsy - FALSE POSITIVE)
tryFind([1,1,2,3,4], null, is(0)); // => null (falsy)

// Using contains() gets you around this issue and does what you would expect
contains([0,1,2,3,4], is(0)); // => true
contains([1,1,2,3,4], is(0)); // => false

// If you need to search for the value and do not want to run into this issue,
// the following pattern (creating a symbol on the fly) can be used
// This is also how contains() is implemented.
// You could also use null or undefined as the sentinel value, but this is discouraged,
// as the sequence could contain those values; this can never be the case with a symbol
// you just created

const nothing = Symbol('');
const v = tryFind([1,2,3,null,4,0], nothing, not) // tryFindFalsy
if (v === nothing) {
  // handle that case
} else {
  // Got a valid, falsy value
}
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..seqEq"></a>

### seqeuence~seqEq(a, b) ⇒ <code>Boolean</code>
Determine whether the items in two sequences are equal.

```
const {seqEq, eq} = require('ferrum');

seqEq([1,2,3,4], [1,2,3,4]); // => true
seqEq([1,2,3,4], [1,2,3]); // => false

// The types of the objects being compared is not important,
// just the contents of the iterator
seqEq(new Set([1,2,3]), [1,2,3]); // => true
seqEq(new Set([1,2,3,3]), [1,2,3,3]); // => false (the set discards the second 3)

// Note that sets and maps should usually compared using eq() and not
// seqEq, since seqEq cares about the infestation order while eq() does
// not for sets and maps
eq(new Set([1,2,3]), new Set([1,2,3])); // => true
eq(new Set([3,2,1]), new Set([1,2,3])); // => true

seqEq(new Set([1,2,3]), new Set([1,2,3])); // => true
seqEq(new Set([3,2,1]), new Set([1,2,3])); // => false

// Objects should never be compared using seqEq, because the order
// in which the elements of an object are returned is undefined
const obj = {foo: 23, bar: 42};
seqEq(obj, obj); // UNDEFINED BEHAVIOUR; could be true or false

// Same goes of course for es6 Maps created from objects
seqEq(dict(obj), dict(obj))); // => UNDEFINED BEHAVIOUR; could be true or false

// Objects as elements inside the iterator are OK; elements are compared
// using eq() not seqEq()
seqEq([{foo: 42, bar: 23}], [{bar: 23, foo: 42}]); // => true
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| a | <code>Sequence</code> | Any sequence for which iter() is defined |
| b | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..count"></a>

### seqeuence~count(a) ⇒ <code>Number</code>
Determine the number of elements in an iterator.
This will try using trySize(), but fall back to iterating
over the container and counting the elements this way if necessary.

```
const {iter,count} = require('ferrum')

count([1,2,3]); // => 3; O(1)
count(iter([1,2,3])); // => 3; O(n)
```

See: [https://en.wikipedia.org/wiki/Big_O_notation]()

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| a | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..list"></a>

### seqeuence~list()
Turns any sequence into a list.
Shorthand for `Array.from(iter())`.
This is often utilized to cache a sequence so it can be
iterated over multiple times.

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..uniq"></a>

### seqeuence~uniq()
Turns any sequence into a set.
Shorthand for new Set(iter()).
This often finds practical usage as a way of
removing duplicates elements from a sequence.

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..dict"></a>

### seqeuence~dict()
Turns any sequence into an es6 map
This is particularly useful for constructing es7 maps from objects...

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..obj"></a>

### seqeuence~obj()
Turns any sequence into an object

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..any"></a>

### seqeuence~any()
Test whether any element in the given sequence is truthy.
Returns null if the list is empty.

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..all"></a>

### seqeuence~all()
Test whether all elements in the given sequence are truthy
Returns true if the list is empty.

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..sum"></a>

### seqeuence~sum()
Calculate the sum of a list of numbers.
Returns 0 is the list is empty.

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..product"></a>

### seqeuence~product()
Calculate the product of a list of numbers.
Returns 1 is the list is empty.

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..reverse"></a>

### seqeuence~reverse(seq) ⇒ <code>Array</code>
Reverse a given sequence

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..enumerate"></a>

### seqeuence~enumerate(seq) ⇒ <code>Iterator</code>
Extend the given sequences with indexes:
Takes a sequence of values and generates
a sequence where each element is a pair [index, element];

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..takeDef"></a>

### seqeuence~takeDef(seq) ⇒ <code>Iterator</code>
Cut of the given sequence at the first undefined or null value.

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..flat"></a>

### seqeuence~flat(seq)
Flattens a sequence of sequences.

```
into(flat([[1,2], [3,4]]), Array) # [1,2,3,4]
into(flat({foo: 42}), Array) # ["foo", 42]
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence(Sequence)</code> | Any sequence for which iter() is defined |

<a name="module_seqeuence..concat"></a>

### seqeuence~concat()
Concatenate any number of sequences.
This is just a variadic alias for `flat()`

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_seqeuence..zipLeast"></a>

### seqeuence~zipLeast(seq) ⇒ <code>Iterator</code>
Zip multiple sequences.
Puts all the first values from sequences into one sublist;
all the second values, third values and so on.
If the sequences are of different length, the output sequence
will be the length of the *shortest* sequence and discard all
remaining from the longer sequences...

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | A sequence of sequences |

<a name="module_seqeuence..zip"></a>

### seqeuence~zip(seq) ⇒ <code>Iterator</code>
Zip multiple sequences.
Puts all the first values from sequences into one sublist;
all the second values, third values and so on.
If the sequences are of different length, an error will be thrown.

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seq | <code>Sequence</code> | A sequence of sequences |

<a name="module_seqeuence..cartesian"></a>

### seqeuence~cartesian(seqs)
Calculate the cartesian product of the given sequences.

```
const {cartesian, list} = require('ferrum');

list(cartesian([])); // => []
list(cartesian([[1,2]])); // => [[1], [2]]
list(cartesian([[1,2], [3,4]])); // => [[1,3], [1, 4], [2, 3], [2, 4]]
list(cartesian([[1,2], [3,4], [5,6]]));
// => [[1,3,5], [1,3,6], [1,4,5], [1,4,6],
       [2,3,5], [2,3,6], [2,4,5], [2,4,6]]
list(cartesian([[], [3,4], [5,6]])); // => []
```

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  

| Param | Type | Description |
| --- | --- | --- |
| seqs | <code>Sequence</code> | A sequence of sequences |

<a name="module_seqeuence..union"></a>

### seqeuence~union()
Combine multiple map/set like objects.

The return type is always the type of the first value.
Internally this just concatenates the values from all
parameters and then uses into to convert the values back
to the original type.

`union({a: 42, b: 23}, new Map([['b', 99]]))` => `{a: 42, b: 99}`
`union(new Set(1,2,3,4), [4,6,99])` => `new Set([1,2,3,4,6,99])`AA

Takes any number of values to combine.

**Kind**: inner method of [<code>seqeuence</code>](#module_seqeuence)  
<a name="module_stdtraits"></a>

## stdtraits
Highly generic traits/interfaces.

### Laws

These apply to all traits in this module.

- Arrays, Strings and any list-like data structures are treated
  as mappings from index -> value
- Array sparseness is ignored on read; any list-like container `has` a
  specific index if `size(myContainer) => key`; getting an unset value
  yields `undefined`
- Sets are treated as mappings from a key to itself


* [stdtraits](#module_stdtraits)
    * [~Immutable](#module_stdtraits..Immutable)
    * [~Equals](#module_stdtraits..Equals)
    * [~Size](#module_stdtraits..Size)
    * [~Shallowclone](#module_stdtraits..Shallowclone)
    * [~Deepclone](#module_stdtraits..Deepclone)
    * [~Pairs](#module_stdtraits..Pairs)
    * [~Get](#module_stdtraits..Get)
    * [~Has](#module_stdtraits..Has)
    * [~Assign](#module_stdtraits..Assign)
    * [~Delete](#module_stdtraits..Delete)
    * [~Setdefault](#module_stdtraits..Setdefault)
    * [~Replace](#module_stdtraits..Replace)
    * [~get](#module_stdtraits..get)
    * [~has](#module_stdtraits..has)
    * [~assign](#module_stdtraits..assign)
    * [~del](#module_stdtraits..del)
    * [~setdefault](#module_stdtraits..setdefault)
    * [~replace](#module_stdtraits..replace)
    * [~typeIsImmutable(t)](#module_stdtraits..typeIsImmutable) ⇒ <code>Boolean</code>
    * [~isImmutable(v)](#module_stdtraits..isImmutable) ⇒ <code>Boolean</code>
    * [~eq(a, b)](#module_stdtraits..eq) ⇒ <code>Boolean</code>
    * [~uneq(a, b)](#module_stdtraits..uneq) ⇒ <code>Boolean</code>
    * [~assertEquals(a, b, msg)](#module_stdtraits..assertEquals)
    * [~assertUneq(a, b, msg)](#module_stdtraits..assertUneq)
    * [~size(what)](#module_stdtraits..size) ⇒ <code>Number</code>
    * [~empty(what)](#module_stdtraits..empty) ⇒ <code>Boolean</code>
    * [~shallowclone(a)](#module_stdtraits..shallowclone) ⇒ <code>A</code>
    * [~deepclone(a)](#module_stdtraits..deepclone) ⇒ <code>A</code>
    * [~pairs(what)](#module_stdtraits..pairs)
    * [~keys(what)](#module_stdtraits..keys)
    * [~values(what)](#module_stdtraits..values)

<a name="module_stdtraits..Immutable"></a>

### stdtraits~Immutable
This is a flag trait that indicates whether a type is immutable.

```
const {Immutable, isImmutable, typeIsImmutable} = require('ferrum');

// Mark a custom type as immutable
class Foo {
  [Immutable.sym]() {}
};

// Or alternatively
Immutable.impl(Foo, true);

// Mark a custom value as immutable
const bar = {};
Immutable.implStatic(bar, true);

// Test a type for immutability
typeIsImmutable(Foo); // => true
typeIsImmutable(Number); // => true
typeIsImmutable(Object); // => false

// Test a value for immutability
isImmutable(42); // => true
isImmutable({}); // => false
isImmutable(bar); // => true

// Any other classes will not be considered immutable by default
class Bang {};
typeIsImmutable(Bang); // => false
```

Since javascript has not real way to enforce absolute immutability
this trait considers anything immutable that is hard to mutate
or really not supposed to be mutated.
Function is considered immutable despite it being possible to assign
parameters to functions...

This is used in a couple paces; specifically it is used as a list of types
that should be left alone in `deepclone` and `shallowclone`.

**See:** [ isImmutable ]( module-stdtraits.html#~isImmutable )
**See:** [ typeIsImmutable ]( module-stdtraits.html#~typeIsImmutable )

**By default implemented for:** String, Number, Boolean, RegExp,
Date, Symbol, Function, null, undefined

**Kind**: inner interface of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..Equals"></a>

### stdtraits~Equals
Trait to check whether two values are equal.a

```
const {equals, eq, uneq, assertEquals, assertUneq} = require('ferrum');

// Implementing this type
class Bar {
  constructor(foo, bang) {
    this.foo = foo;
    this.bang = bang;
  }

  [Equals.sym](a, b) {
    return b instanceof Bar
        && eq(a.foo, b.foo)
        && eq(a.bang, b.bang);
  }
}

// Or alternatively
Equals.impl(Bar, (a, b) => {
  ...
});

// Test for equality
eq(new Bar(42, 23), new Bar(42, 23)); // => true
eq(new Bar(42, 23), new Bar(0, 0)); // => falseAA

uneq(4, 3); // => true
uneq(4, 4); // => false

assertEquals({}, {}, 'Values where different!'); // OK!
assertEquals({}, {foo: 42}, 'Values where different!'); // Assertion Error!

assertUneq([], [{}], 'Values where the same'); // OK!
assertUneq([], [], 'Values where the same'); // Assertion Error!
```

Normally this trait should not be used directly; consider using
`eq()` instead.

This trait should be used only in cases where `===`/`is()` is too
strict. Equals is for cases in which the content of two variables
or data structures is the same/semantically equivalent.

#### Interface

`(value1: Any, value2: Any) => r: Boolean`

#### Laws

* `Equals.invoke(a, b) <=> Equals.invoke(b, a)`

This law seems trivial at first, but one actually needs to take some
care to make this work: The trait resolves to the implementation for
the **first argument**!
So `Equals.invoke(a: Number, b: String)` and `Equals.invoke(a: String, b: Number)`
will actually resolve to two different implementations.
The easiest way to make this work is just to add a check `(a, b) => type(b) === Number`
to the implementation for number and adding an equivalent check in string.
If comparing across types is actually desired (and might return `true`),
I suggest using the same code for both implementations: Consider the following
contrive examples:

```
Equals.impl(Number, (a, b) =>
  type(b) === (String || type(b) === Number)
  && a.toString() === b.toString());
Equals.impl(String, (a, b) =>
  type(b) === (String || type(b) === Number)
  && a.toString() === b.toString());
```

#### Specialization notes

Extra implementations provided for Date, RegExp, URL and typed arrays.

Note that for sets: `eq(new Set([{}]), new Set([{}]))` does not hold true,
since in sets keys and values are the same thing and keys always follow `===`
semantics.

**See:** [ eq ]( module-stdtraits.html#~eq )
**See:** [ uneq ]( module-stdtraits.html#~uneq )
**See:** [ assertEquals ]( module-stdtraits.html#~assertEquals )
**See:** [ assertUneq ]( module-stdtraits.html#~assertUneq )

**Kind**: inner interface of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..Size"></a>

### stdtraits~Size
Trait to determine the size of a container.

```
// Implementing size
class Foo {
  constructor(len) {
    this.len = len || 42;
  }

  [Size.symbol]() {
    return this.len;
  }
}

// Alternatively
Size.impl(Foo, (v) => v.len);

// Determine the size
size(new Map()); // => 0
size("foobar"); // => 6
size({foo: 42, bar: 5}); // => 2
empty(new Set()); // => true
empty([1,2]); // => false
```

Implemented at least for Object, String, Array, Map, Set.

#### Interface

Invocation takes the form `(c: Container) => i: Integer`

#### Laws

- `i >= 0`
- `i !== null && i !== undefined`.
- Must be efficient to execute. No IO, avoid bad algorithmic complexities.

**See:** [ size ]( module-stdtraits.html#~size )
**See:** [ empty ]( module-stdtraits.html#~empty )

**Kind**: inner interface of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..Shallowclone"></a>

### stdtraits~Shallowclone
Shallowly clone an object.

```
const {Shallowclone, shallowclone} = require('ferrum');

class Bar {
  constructor(foo, bang) {
    this.foo = foo;
    this.bang = bang;
  }

  [Shallowclone.sym]() {
    return new Bar(this.foo, this.bar);
  }
}

const a = new Bar({foo: 42}, {bar: 5});
const b = shallowclone(a);

assert(a !== b);
assertEquals(a, b);

a.foo.foo = 5;
assert(b.foo.foo === 5);
```

#### Interface

`(x: TheValue) => r: TheValue`

#### Laws

- `x !== r`
- `get(r, k) === get(x, k)` for any k.

#### Implementation Notes

No-Op implementations are provided for read only primitive types.

**See:** [ shallowclone ]( module-stdtraits.html#~shallowclone )

**Kind**: inner interface of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..Deepclone"></a>

### stdtraits~Deepclone
Recursively clone an object.

```
const {Deepclone, deepclone} = require('ferrum');

class Bar {
  constructor(foo, bang) {
    this.foo = foo;
    this.bang = bang;
  }

  [Deepclone.sym]() {
    return new Bar(deepclone(this.foo), deepclone(this.bar));
  }
}

const a = new Bar({foo: 42}, {bar: 5});
const b = deepclone(a);

assert(a !== b);
assertEquals(a, b);

a.foo.foo = 5;
assert(b.foo.foo === 42);
```

#### Interface

`(x: TheValue) => r: TheValue`

#### Laws

- `x !== r`
- `x equals r` wehre eq is the equals() function.
- `get(r, k) !== get(x, k)` for any k.
- `has(r, k) implies has(x, k)` for any k.
- `get(r, k) equals get(x, k)` for any k wehre eq is the equals() function.
- The above laws apply recursively for any children.

#### Specialization Notes

No implementation provided for set: In sets keys and values are the
same thing.
If we cloned sets deeply, `has(orig, key) implies has(clone, key)` would be violated
and the sets would not be equal after cloning.
For the same reason, Map keys are not cloned either!

**See:** [ deepclone ]( module-stdtraits.html#~deepclone )

**Kind**: inner interface of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..Pairs"></a>

### stdtraits~Pairs
Get an iterator over a container.

```
const {list, values, keys, pairs, Pairs} = require('ferrum');
class Bar {
  *[Pairs.sym]() {
    yield ['foo', 42];
    yield ['bar', 5];
  }
}

list(pairs(new Bar()); // => [['foo', 42], ['bar', 5]]
list(keys(new Bar()); // => ['foo', 'bar']
list(values(new Bar()); // => [42, 5]
```

This is different from the `Sequence` trait in `sequence.js`
in that this always returns pairs, even for lists, sets, strings...

#### Interface

`(c: Container(k: Key, v: Value)) => r: Sequence([k: Key, v: Value], ...)`.

#### Specialization Notes

Array like types return index => value, set returns value => value.

**See:** [ pairs ]( module-stdtraits.html#~pairs )
**See:** [ keys ]( module-stdtraits.html#~keys )
**See:** [ values ]( module-stdtraits.html#~values )

**Kind**: inner interface of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..Get"></a>

### stdtraits~Get
Trait to get a value from a container like type.

Implemented for Object, String, Array, Map.

#### Interface

`(c: Container, k: Key) => v: Value|undefined`. Will return undefined
if the key could not be found.

#### Laws

- Must not be implemented for set-like data structures

**Kind**: inner interface of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..Has"></a>

### stdtraits~Has
Test if a container holds an entry with the given key.

#### Interface

`(c: Container, k: Key) => b: Boolean`.

#### Laws

- Must not be implemented for set-like data structures

**Kind**: inner interface of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..Assign"></a>

### stdtraits~Assign
Trait to assign a value in a container like type.

Implemented for Object, String, Array, Map.

#### Interface

`(c: Container, v: Value, k: Key) => void`.

#### Laws

- Must not be implemented for set-like data structures

#### Specialization Notes

No implementation provided for String since String is read only.

**Kind**: inner interface of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..Delete"></a>

### stdtraits~Delete
Test if a container holds an entry with the given key.

#### Interface

`(c: Container, k: Key) => Void`.

#### Laws

- The value must actually be deleted, not set to `undefined` if possible.
  Arrays become sparse if a value in their midst is deleted.

#### Specialization Notes

No implementation provided for String since String is read only.
No implementation for Array since has() disregards sparse slots in arrays
(so a delete op would be the same as assign(myArray, idx, undefined)) which
would be inconsistent.

**Kind**: inner interface of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..Setdefault"></a>

### stdtraits~Setdefault
Set a default value in a container.

This trait is implicitly implemented if the container implements Has, Get and Set.

#### Interface

`(c: Container, v: Value, k: Key) => r: Value`.

**Kind**: inner interface of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..Replace"></a>

### stdtraits~Replace
Swap out one value in a container for another.

This trait is implicitly implemented if the container implements Get and Set.

#### Interface

`(c: Container, v: Value, k: Key) => r: Value`.

**Kind**: inner interface of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..get"></a>

### stdtraits~get
Given a key, get a value from a container.

**Kind**: inner constant of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..has"></a>

### stdtraits~has
Test if a container includes an entry with the given key

**Kind**: inner constant of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..assign"></a>

### stdtraits~assign
Set a value in a container.
Always returns the given value.

**Kind**: inner constant of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..del"></a>

### stdtraits~del
Delete an entry with the given key from a container

**Kind**: inner constant of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..setdefault"></a>

### stdtraits~setdefault
Set a default value in a container.

**Kind**: inner constant of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..replace"></a>

### stdtraits~replace
Swap out one value in a container for another

**Kind**: inner constant of [<code>stdtraits</code>](#module_stdtraits)  
<a name="module_stdtraits..typeIsImmutable"></a>

### stdtraits~typeIsImmutable(t) ⇒ <code>Boolean</code>
Test whether instance of a given type is immutable.

```
typeIsImmutable(Object); // => false
typeIsImmutable(String); // => true
```

**Kind**: inner method of [<code>stdtraits</code>](#module_stdtraits)  
**See**: [Immutable](module-stdtraits-Immutable.html)  

| Param | Type |
| --- | --- |
| t | <code>Type</code> | 

<a name="module_stdtraits..isImmutable"></a>

### stdtraits~isImmutable(v) ⇒ <code>Boolean</code>
Test whether a given value is immutable.

```
isImmutable({}); // => false
isImmutable(42); // => true
```

**Kind**: inner method of [<code>stdtraits</code>](#module_stdtraits)  
**See**: [Immutable](module-stdtraits-Immutable.html) for examples  

| Param | Type |
| --- | --- |
| v | <code>T</code> | 

<a name="module_stdtraits..eq"></a>

### stdtraits~eq(a, b) ⇒ <code>Boolean</code>
Determine whether two values are equal using the Equals trait.

```
eq([{foo: 42}], [{foo: 42}]); // => true
eq(1, 2); // => false
```

This function is a bit more powerful than than the Equals trait itself:
First of all it searches for a `Equals` implementation for both arguments
and it falls back to `===` if none is found.
For this reason using eq() is usually preferred over using the Equals trait directly.

**Kind**: inner method of [<code>stdtraits</code>](#module_stdtraits)  
**See**: [Equals](module-stdtraits-Equals.html)  

| Param | Type |
| --- | --- |
| a | <code>A</code> | 
| b | <code>B</code> | 

<a name="module_stdtraits..uneq"></a>

### stdtraits~uneq(a, b) ⇒ <code>Boolean</code>
Equivalent to `!eq(a, b)`

```
uneq(4, 5); # => true
```

**Kind**: inner method of [<code>stdtraits</code>](#module_stdtraits)  
**See**: [Equals](module-stdtraits-Equals.html) for examples  

| Param | Type |
| --- | --- |
| a | <code>A</code> | 
| b | <code>B</code> | 

<a name="module_stdtraits..assertEquals"></a>

### stdtraits~assertEquals(a, b, msg)
Assert that `eq(actual, expected)`

```
assertEquals([{foo: 42}], [{foo: 42}]); // OK!
assertEquals(1, 2); // AssertionError!
```

**Kind**: inner method of [<code>stdtraits</code>](#module_stdtraits)  
**Throws**:

- <code>AssertionError</code> 

**See**: [Equals](module-stdtraits-Equals.html) for examples  

| Param | Type | Description |
| --- | --- | --- |
| a | <code>A</code> |  |
| b | <code>B</code> |  |
| msg | <code>String</code> \| <code>undefined</code> | The error message to print |

<a name="module_stdtraits..assertUneq"></a>

### stdtraits~assertUneq(a, b, msg)
Assert that `!eq(actual, expected)`

```
assertUneq(1, 2); // OK!
assertUneq([{foo: 42}], [{foo: 42}]); // AssertionError!
```

**Kind**: inner method of [<code>stdtraits</code>](#module_stdtraits)  
**Throws**:

- AssertionError

**See**: [Equals](module-stdtraits-Equals.html) for examples  

| Param | Type | Description |
| --- | --- | --- |
| a | <code>A</code> |  |
| b | <code>B</code> |  |
| msg | <code>String</code> \| <code>undefined</code> | The error message to print |

<a name="module_stdtraits..size"></a>

### stdtraits~size(what) ⇒ <code>Number</code>
Determine the size of a container. Uses the Size trait.

```
size({foo: 42}); // => 1
size([1,2,3]); // => 3
```

**Kind**: inner method of [<code>stdtraits</code>](#module_stdtraits)  
**See**: [Size](module-stdtraits-Size.html) for examples  

| Param | Type |
| --- | --- |
| what | <code>T</code> | 

<a name="module_stdtraits..empty"></a>

### stdtraits~empty(what) ⇒ <code>Boolean</code>
Determine if a container is empty. Uses `size(x) === 0`a

```
empty([]); // => true
empty({}); // => true
empty("asd"); // => false
```

**Kind**: inner method of [<code>stdtraits</code>](#module_stdtraits)  
**See**: [Size](module-stdtraits-Size.html) for examples  

| Param | Type |
| --- | --- |
| what | <code>T</code> | 

<a name="module_stdtraits..shallowclone"></a>

### stdtraits~shallowclone(a) ⇒ <code>A</code>
Shallowly clone an object

```
const a = {foo: []};
const b = shallowclone(a);
b.foo.push(42);

a;  // => {foo: [42]}
b;  // => {foo: [42]}
```

**Kind**: inner method of [<code>stdtraits</code>](#module_stdtraits)  
**See**: [Shallowclone](module-stdtraits-Shallowclone.html) for examples  

| Param | Type |
| --- | --- |
| a | <code>A</code> | 

<a name="module_stdtraits..deepclone"></a>

### stdtraits~deepclone(a) ⇒ <code>A</code>
Recursively clone an object

```
const a = {foo: []};
const b = deepclone(a);
b.foo.push(42);

a;  // => {foo: []}
b;  // => {foo: [42]}
```

**Kind**: inner method of [<code>stdtraits</code>](#module_stdtraits)  
**See**: [Deepclone](module-stdtraits-Deepclone.html) for examples  

| Param | Type |
| --- | --- |
| a | <code>A</code> | 

<a name="module_stdtraits..pairs"></a>

### stdtraits~pairs(what)
Get an iterator over any container.
Always returns pairs `[key, value]`, this distinguishes `pairs()`
from `iter()`/normal iteration.

Note that usually you should use `iter()` over pairs unless you
really know that forcing a container into key/value representation
is needed (e.g. Array with indices) since `pairs()` will only work
on a very select number of containers, while `iter()` will work on
any iterators and will actually support lists of key value pairs.

```
const {list, pairs} = require('ferrum');

list(pairs(['a', 'b'])); // => [[0, 'a'], [1, 'b']]
list(pairs(new Set[1, 2])); // => [[1, 1], [2, 2]]
list(pairs({foo: 42})); // [['foo', 42]]
```

**Kind**: inner method of [<code>stdtraits</code>](#module_stdtraits)  
**See**: [Pairs](module-stdtraits-Pairs.html)  

| Param | Type |
| --- | --- |
| what | <code>T</code> | 

<a name="module_stdtraits..keys"></a>

### stdtraits~keys(what)
Get an iterator over the keys of a container. Uses `pairs(c)`.

```
const {list, keys} = require('ferrum');

list(keys(['a', 'b'])); // => [0, 1]
list(keys(new Set[1, 2])); // => [1, 2]
list(keys({foo: 42})); // ['foo']
```

**Kind**: inner method of [<code>stdtraits</code>](#module_stdtraits)  
**See**: [Pairs](module-stdtraits-Pairs.html)  

| Param | Type |
| --- | --- |
| what | <code>T</code> | 

<a name="module_stdtraits..values"></a>

### stdtraits~values(what)
Get an iterator over the values of a container. Uses `pairs(c)`.

```
const {list, values} = require('ferrum');

list(values(['a', 'b'])); // => ['a', 'b']
list(values(new Set[1, 2])); // => [1, 2]
list(values({foo: 42})); // [42]
```

**Kind**: inner method of [<code>stdtraits</code>](#module_stdtraits)  
**See**: [Pairs](module-stdtraits-Pairs.html)  

| Param | Type |
| --- | --- |
| what | <code>T</code> | 

<a name="module_trait"></a>

## trait
Introducing type classes (from haskell)/traits (from rust) to javascript.


* [trait](#module_trait)
    * [~HybridWeakMap](#module_trait..HybridWeakMap)
    * [~TraitNotImplemented](#module_trait..TraitNotImplemented)
    * [~Trait](#module_trait..Trait)
        * [new Trait(name, sym)](#new_module_trait..Trait_new)
        * [.lookupValue(what)](#module_trait..Trait+lookupValue) ⇒ <code>function</code> \| <code>falsy-value</code>
        * [.lookupType()](#module_trait..Trait+lookupType)
        * [.invoke()](#module_trait..Trait+invoke)
        * [.impl()](#module_trait..Trait+impl)
        * [.implStatic()](#module_trait..Trait+implStatic)
        * [.implDerived()](#module_trait..Trait+implDerived)
        * [.implWild()](#module_trait..Trait+implWild)
        * [.implWildStatic()](#module_trait..Trait+implWildStatic)
    * [~supports()](#module_trait..supports)
    * [~valueSupports()](#module_trait..valueSupports)

<a name="module_trait..HybridWeakMap"></a>

### trait~HybridWeakMap
Drop-in replacement for WeakMap that can store primitives.

```
new
const m = new HybridWeakMap([['foo', 42], ]);
```

Normally WeakMaps cannot store primitive values like Strings
or Numbers; this is mostly an implementation detail and there
still are some use cases where one would wish to store primitives
in a weak map even though those primitive values won't be garbage
collected.a

This is what HybridWeakMap is for: It simply contains two maps; one
Weak map for objects, and one normal Map for primitives...

**Kind**: inner class of [<code>trait</code>](#module_trait)  
<a name="module_trait..TraitNotImplemented"></a>

### trait~TraitNotImplemented
Thrown thrown to indicate a trait is not implemented for a specific
type or value.

**Kind**: inner class of [<code>trait</code>](#module_trait)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| trait | <code>Trait</code> | The trait that was not implemented |

<a name="module_trait..Trait"></a>

### trait~Trait
Helper for implementing generic functions/protocols.

```
// Declaring a trait
const Size = new Trait('Size');

// Using it
const size = (what) => Size.invoke(what);
const empty = (what) => size(what) === 0;

// Providing implementations for own types
class MyType {
  [Size.sym]() {
    return 42;
  }
}

// Providing implementations for third party types
Size.impl(Array, (x) => x.length); // Method of type Array
Size.impl(String, (x) => x.length);
Size.impl(Map, (x) => x.size);
Size.impl(Set, (x) => x.size);

Size.impl(Object, (x) => { // Note that this won't apply to subclasses
  let cnt = 0;
  for (const _ in x) cnt++;
  return cnt;
});

// Note: The two following examples would be a bad idea in reality,
// they are just here toshow the mechanism
Size.implStatic(null, (_) => 0); // Static implementation (for a value and not a type)

// This implementation will be used if the underlying type/value
// implements the magnitude trait
Size.implDerived([Magnitued], ([magnitude], v) => magnitude(v));

// This will be called as a last resort, so this must be very fast!
// This example would implement the `size` trait for any even number.
// Note how we just return `undefined` for non even numbers
Size.implWildStatic(
   (x) => type(x) === Number && x % 2 == 0 ? (x => x) : undefined);

// test if an object is a dom node
const isNode = o =>
    typeof Node === "object"
       ? o instanceof Node
       : o && typeof o === "object"
           && typeof o.nodeType === "number"
           && typeof o.nodeName==="string";

// Last resort lookup for types. Implements Size for any dom nodes…
Size.implWild(
   (t) => isNodeType(t) ? ((elm) => elm.childElementCount) : undefined);


// Using all the implementations
size([1,2,3]) # => 3
size({foo: 42}) # => 1
size(new Set([1,2,3])) # => 3
size(new MyType()) # => 42
size(null) # => 0
size(document.body) # => 1
```

### Traits, an introduction: Very specific interfaces that let you choose your guarantees

This helps to implement a concept known as type classes in haskell,
traits in rust, protocols in elixir, protocols (like the iteration protocol)
in javascript.
This helper is not supposed to replace ES6 protocols, instead it is supposed
to expand on them and make them more powerfull.

Basically this allows you to declare an interface, similar to interfaces in
C++ or C# or Java. You declare the interface; anyone implementing this generic
interface (like the iterator protocol, or Size interface which can be used to
determine the size of a container) promises to obey the rules and the laws of
the interface.
This is much more specific than having a size() method for instance; size() is
just an name which might be reasonably used in multiple circumstances; e.g. one
might use the name size() for a container that can have a `null` size, or return
a tuple of two numbers because the size is two dimensional. Or it might require
io to return the size or be complex to compute (e.g. in a linked list).

A size() method may do a lot of things, the Size trait however has a highly specific
definition: It returns the size of a container, as a Number which must be greater than
zero and cannot be null. The size must be efficient to compute as well.

By using the Size trait, the developer providing an implementation specifically says
'I obey those rules'. There may even be a second trait called `Size` with it's own rules.
The trait class is written in a way so those two would not interfere.

#### Traits do not provide type checks

Because we are in javascript, these guarantees are generally not enforced by the type system
and the dev providing an implementation is still responsible for writing extensive tests.

#### Traits provide abstraction: Think about what you want to do, not how you want to do it

One specific feature traits provide is that they let you state what you want to do instead of how
to do it.
Need to determine the size of a container? Use `.length` for arrays and strings,
use `.size` for ES6 Maps and Sets and a for loop to determine the size of an object.
Or you could just use the Size trait and call `size(thing)` which works for all of these
types. This is one of the features traits provide; define an implementation for a trait
once and you no longer have to think about how to achieve a thing, just what to achieve.

#### Implementing traits for third party types

This is another feature that makes traits particularly useful! Java for instance
has interfaces, but the creator of a class/type must think of implementing a specific interface;
this is particularly problematic if the type is from a library; the interface must
either come from the standard library or from that particular library.

This usually is not very helpful; with traits this is not a problem at all.
Just use `MyTrait.impl` as in the example above.

#### Subclassing the Trait class

You may subclass Trait and overwrite any of it's methods.

**Kind**: inner class of [<code>trait</code>](#module_trait)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>String</code> \| <code>undefined</code> | The name of the trait |
| sym | <code>Symbol</code> | The symbol for lookup inside third party classes |


* [~Trait](#module_trait..Trait)
    * [new Trait(name, sym)](#new_module_trait..Trait_new)
    * [.lookupValue(what)](#module_trait..Trait+lookupValue) ⇒ <code>function</code> \| <code>falsy-value</code>
    * [.lookupType()](#module_trait..Trait+lookupType)
    * [.invoke()](#module_trait..Trait+invoke)
    * [.impl()](#module_trait..Trait+impl)
    * [.implStatic()](#module_trait..Trait+implStatic)
    * [.implDerived()](#module_trait..Trait+implDerived)
    * [.implWild()](#module_trait..Trait+implWild)
    * [.implWildStatic()](#module_trait..Trait+implWildStatic)

<a name="new_module_trait..Trait_new"></a>

#### new Trait(name, sym)

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The name of the trait |
| sym | <code>Symbol</code> \| <code>null</code> | Symbol associated with the trait; this symbol   will be available under `MyTrait.sym` for devs to implement their   interfaces with. This parameter is usually left empty; in this case a   new symbol is created for the trait. An example where the extra   parameter is used is the `Sequence` trait in `sequence.js`; this trait   is just a wrapper around the built in `Symbol.iterator` protocol, so   it's using it's symbol. |

<a name="module_trait..Trait+lookupValue"></a>

#### trait.lookupValue(what) ⇒ <code>function</code> \| <code>falsy-value</code>
Find the implementation of this trait for a specific value.
This is used by `.invoke()`, `.supports()` and `.valueSupports`.

It uses the following precedence by default:

- Implementations added with `implStatic`
- Implementations using the symbol in a method of a prototype
- Implementations added with `impl`
- Implementations added with `implDerived` in the order they where added
- Implementations added with `implWild` in the order…
- Implementations added with `implWildStatic` in the order…

This function can be used directly in order to avoid a double lookiup
of the implementation:

```
const impl = MyTrait.lookupValue(what);
if (impl) {
  impl(what, ...);
} else {
  ...
}
```

**Kind**: instance method of [<code>Trait</code>](#module_trait..Trait)  
**Returns**: <code>function</code> \| <code>falsy-value</code> - The function that was found or nothing.
  Takes the same parameters as `.invoke(what, ...args)`, so if you are not
  using invoke, you must specify `what` twice; once in the `lookupValue` call, once
  in the invocation.  

| Param | Type | Description |
| --- | --- | --- |
| what | <code>Any</code> | The thing to find an implementation for |

<a name="module_trait..Trait+lookupType"></a>

#### trait.lookupType()
Lookup the implementation of this trait for a specific type.
Pretty much the same as lookupValue, just skips the value lookup steps…

**Kind**: instance method of [<code>Trait</code>](#module_trait..Trait)  
<a name="module_trait..Trait+invoke"></a>

#### trait.invoke()
Invoke the implementation. See examples above.

**Kind**: instance method of [<code>Trait</code>](#module_trait..Trait)  
<a name="module_trait..Trait+impl"></a>

#### trait.impl()
Implement this trait for a class as a 'method'. See examples above

**Kind**: instance method of [<code>Trait</code>](#module_trait..Trait)  
<a name="module_trait..Trait+implStatic"></a>

#### trait.implStatic()
Implement this trait for a value/as a 'static method'. See examples above
Prefer impl() when possible since implementations using this function will
not show up in supports()/this.typeHasImpl().

**Kind**: instance method of [<code>Trait</code>](#module_trait..Trait)  
<a name="module_trait..Trait+implDerived"></a>

#### trait.implDerived()
Implements a trait based on other traits

**Kind**: instance method of [<code>Trait</code>](#module_trait..Trait)  
<a name="module_trait..Trait+implWild"></a>

#### trait.implWild()
Arbitrary code implementation of this trait for types. See examples above
Prefer implWild() when possible since implementations using this function will
not show up in supports()/this.typeHasImpl().

**Kind**: instance method of [<code>Trait</code>](#module_trait..Trait)  
<a name="module_trait..Trait+implWildStatic"></a>

#### trait.implWildStatic()
Arbitrary code implementation of this trait for values. See examples above

**Kind**: instance method of [<code>Trait</code>](#module_trait..Trait)  
<a name="module_trait..supports"></a>

### trait~supports()
Test if the given trait has been implemented for the given type

**Kind**: inner method of [<code>trait</code>](#module_trait)  
<a name="module_trait..valueSupports"></a>

### trait~valueSupports()
Test if the given trait has been implemented for the given value

**Kind**: inner method of [<code>trait</code>](#module_trait)  
<a name="module_typesafe"></a>

## typesafe
Helpers for working with types; specifically designed
to allow null/undefined to be treated the same as any other value.


* [typesafe](#module_typesafe)
    * [~isdef(v)](#module_typesafe..isdef) ⇒ <code>Boolean</code>
    * [~ifdef(v, fn)](#module_typesafe..ifdef) ⇒
    * [~type(v)](#module_typesafe..type) ⇒ <code>function</code> \| <code>null</code> \| <code>undefined</code>
    * [~typename(The)](#module_typesafe..typename) ⇒ <code>String</code>
    * [~isPrimitive(v)](#module_typesafe..isPrimitive) ⇒ <code>Boolean</code>

<a name="module_typesafe..isdef"></a>

### typesafe~isdef(v) ⇒ <code>Boolean</code>
Checks whether a value is null or undefined

```
const {isdef} = require('ferrum');

isdef(null) # => false
isdef(undefined) # => false
isdef(0) # => true
isdef(false) # => true
```

This function considers all values that are not null
and not undefined to be defined.

**Kind**: inner method of [<code>typesafe</code>](#module_typesafe)  

| Param | Type |
| --- | --- |
| v | <code>T</code> | 

<a name="module_typesafe..ifdef"></a>

### typesafe~ifdef(v, fn) ⇒
Apply the given function to the value only if the value is defined
(not null or undefined).

This basically implements Optional semantics using null/undefined.

```
const {plus, pipe, isdef, ifdef} = require('ferrum');

const o = {
  foo: 42
};

ifdef(o['foo'], plus(2)); // 44
ifdef(o['bar'], plus(2)); // undefined

// This is particularly useful for map or curry
pipe(
  [1,2,null,3],
  map(ifdef(x => x*3))
  list);
// yields [3,6,null,9]

// Without ifdef the pipe above would have to be manually written,
// which is a bit harder to read
pipe(
  [1,2,null,3],
  map(x => isdef(x) ? x : x*3)
  list);
```

**Kind**: inner method of [<code>typesafe</code>](#module_typesafe)  
**Returns**: null | undefined | typeof(fn())  

| Param | Type |
| --- | --- |
| v | <code>T</code> | 
| fn | <code>function</code> | 

<a name="module_typesafe..type"></a>

### typesafe~type(v) ⇒ <code>function</code> \| <code>null</code> \| <code>undefined</code>
Determine type of an object.

```
const {type} = require('ferrum');a

class Bar {};

type(null) # => null
type(undefined) # => undefined
type(42) # => Number
type(new Number(42)) # => Number
type(new Bar()) # => Bar

// The usual strategy to get the type is this
new Bar().constructor

// Which fails for null and undefined...
null.constructor
// Thrown:
// TypeError: Cannot read property 'constructor' of null
```

Like obj.constructor, but won't fail for null/undefined and just
returns the value itself for those.
This is a useful feature for code that is supposed to be
null/undefined-safe since those need not be special cased.

**Kind**: inner method of [<code>typesafe</code>](#module_typesafe)  
**Returns**: <code>function</code> \| <code>null</code> \| <code>undefined</code> - The type of the given parameter  

| Param | Type |
| --- | --- |
| v | <code>T</code> | 

<a name="module_typesafe..typename"></a>

### typesafe~typename(The) ⇒ <code>String</code>
Given a type, determine it's name.

```
const {type, typename} = require('ferrum');

class Bar {};

typename(type(null)) # => "null"
typename(type(undefined)) # => "undefined"
typename(type(42)) # => "Number"
typename(Bar) # => "Bar"

// The usual strategy to get the name of a value's type is this
new Bar().constructor.name

// But this obviously fails for null & undefined
null.constructor.name
null.name // still throws
```

This is useful as a replacement for val.constructor.name,
since this can deal with null and undefined.

**Kind**: inner method of [<code>typesafe</code>](#module_typesafe)  

| Param | Type | Description |
| --- | --- | --- |
| The | <code>function</code> \| <code>null</code> \| <code>undefined</code> | type to get the name of |

<a name="module_typesafe..isPrimitive"></a>

### typesafe~isPrimitive(v) ⇒ <code>Boolean</code>
Test if a value is primitive

```
const {isPrimitive} = require('ferrum');

isPrimitive(null) # => true
isPrimitive(undefined) # => true
isPrimitive(42) # => true
isPrimitive({}) # => false
isPrimitive(new Number(42)) # => false
```

**Kind**: inner method of [<code>typesafe</code>](#module_typesafe)  

| Param | Type |
| --- | --- |
| v | <code>T</code> | 

