# Reflex

Reflex is a reactive programming framework for JavaScript aiming to be safe & no-surprise.
It is minimal and zero-extensible by design.
Also, the slogan is inspired by [Rust](https://doc.rust-lang.org/book/ch16-00-concurrency.html).

## Getting Started

The core library is minimalistic.
There are only 3 APIs:

1. `new Reflex(constructor[, signal])`
2. `Reflex(executor)`
3. `Reflex(signal)`

Let's start by importing the library:

```js
import { Reflex as $ } from 'reflex';
```

Create a new state object:

```js
const state = new $(function () {
  this.a = 1;
});
```

Computed properties:

```js
const state = new $(function () {
  this.a = 1;
  this.b = 2;
  this.sum = $(() => this.a + this.b);
});
```

`this.sum` will be reactive and updates whenever `this.a` or `this.b` changes.

Side effects:

```js
const state = new $(function () {
  this.title = 'Hello, World!';
  $(() => {
    document.title = this.title;
  });
});
```

Destructors:

```js
const state = new $(function () {
  this.info = 'Hello, World!';
  $((signal) => {
    const node = document.createElement('div');
    node.textContent = this.info;
    document.body.appendChild(node);
    console.log(this.info);
    signal.addEventListener('abort', () => {
      node.remove();
    });
  });
});
```

State objects could be destructed as well:

```js
const controller = new AbortController;
const state = new $(function () {
  $((signal) => {
    signal.addEventListener('abort', () => {
      console.log('Destroyed!');
    });
  });
}, controller);

controller.abort();
// Destroyed!
```

Asynchronous operations are going to be a little bit more complicated.
Inside callbacks,
`this` must be retrieved using `$(signal)`:

```js
const state = new $(function () {
  $(async (signal) => {
    const response = await fetch('https://api.example.com/');
    const result = await response.json();
    if (signal.aborted) return;
    $(signal).result = result;
  });
});
```

Good news: the `signal` object is a standard [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal).

```js
const state = new $(function () {
  $(async (signal) => {
    this.scrollY = window.scrollY;
    window.addEventListener('scroll', () => {
      $(signal).scrollY = window.scrollY;
    }, { signal });
  });
});
```

That's all!

## Rationale

You might be thrown with tons of annoying errors when starting to use the library.
The constraints are required by neither the library or the JavaScript language,
but rather the reactive programming paradigm itself.

What are the implications for reading 
Since it's "reactive",
its value might change in the future.
So what has been done should be done again whenever the reactive value have changed.
Hence Reflex requires that the reactive value should only be read inside `executor`s,
where Reflex can detect what reactive values have been used
and Reflex would be able to run the function again when necessary.

Be aware that the `executor` context does not include callbacks or asynchronous operations.
The values might have changed during the async operations.
This results in inconsistent values between the states read before and after the async operation.
For example:

```js
const state = new $(function () {
  this.expenses = 10;
  $(() => {
    const response = await fetch('/api/revenue');
    const revenue = Number.parseInt(await response.text());
    console.log('Profit: ', revenue - this.expenses);
  });
});
```

If `this.expenses` is changed during `fetch()`,
the console would output a profit value which does not occur at any point in time.
If you really need the value, read it before the async operations:

```js
const state = new $(function () {
  this.expenses = 10;
  $(async () => {
    const { expenses } = this;
    const response = await fetch('/api/revenue');
    const revenue = Number.parseInt(await response.text());
    console.log('Profit: ', revenue - expenses);
  });
});
```

Now the values are consistent,
but another problem remains:
The result can be outdated after `this.expenses` changed.
Changing `this.expenses` would trigger another calculation,
and the previous calculation is no longer required.
Reflex uses `AbortController` to abort the ongoing request when needed.

```js
const state = new $(function () {
  this.expenses = 10;
  $(async (signal) => {
    const { expenses } = this;
    const response = await fetch('/api/revenue', { signal });
    if (signal.aborted) return;
    // ...
  })
});
```

Abort signal can also be used to release external resources:

```js
const state = new $(function () {
  this.value = 1;
  $((signal) => {
    const resource = new Resource(this.value);
    signal.addEventListener('abort', () => {
      resource.release();
    });
  });
});
```

Whenever `this.value` changes,
the resource will be released and a new one will be created,
so that the resource is up-to-date.
Some resources can be updated instead of being released and created again.
This is feasible:

```js
const state = new $(function () {
  const initial_value = 1; // don't use a reactive value here
  this.resource = $((signal) => {
    signal.addEventListener('abort', () => {
      this.resource.release();
    });
    return new Resource(initial_value);
  });
  $((signal) => {
    if (this.value === undefined) return;
    this.resource.update(this.value);
  });
});
```

`this.resource.update()` is not noticed by Reflex,
which is intended,
because there are a lot of ways in JavaScript to sneak in the updates without letting Reflex notice.
Therefore,
Reflex only does what it can do,
and does it well:
monitor the updates of direct properties of state objects.

But updating a value correctly is not an easy task, too.
If an executor has been aborted,
the executor should no longer touch any states,
because the states will be updated by newer runs.
It is easy to forget to check the abort signal
and a proper mechanism to prevent this type of errors is necessary.

Reflex checks the update access within the `$(signal)` function.
Reflex poses an additional constraint that an executor can only update `this`.
This is for simplicity of API, declarative programming, and better encapsulation.
In terms of encapsulation,
if any state can be updated using a signal,
there is a hack:

```js
let global_signal;
$((signal) => {
  global_signal = signal;
});
```

Then any value can be updated using `$(global_signal)`.
Unexpected updates can happen and this is not a good practice.
Easily put,
we should create setters for properties as if they are private.

This also solves the problem of the state object lifecycle. (?)

## Best Practices

* Seperate executors if two operations depend on different states.

  ```js
  function updateA(a) { }
  function updateSum(sum) { }

  // bad
  new $(function () {
    this.a = 1;
    this.b = 2;
    $(() => {
      updateA(this.a);
      updateSum(this.a + this.b);
    });
  });

  // good
  new $(function () {
    this.a = 1;
    this.b = 2;
    $(() => updateA(this.a));
    $(() => updateSum(this.a + this.b));
  });
  ```

* Avoid circular dependencies.

  ```js
  const state1 = new $(function () {
    this.a2 = 1;
    this.sum = 3;
  });
  const state2 = new $(function () {
    this.a = 1;
    this.b = 2;

    // bad
    $(() => {
      state1.a2 = this.a * 2;
    });
    $(() => {
      state1.sum = state1.a2 + this.b;
    });

    // good
  });
  ```

## Development

The code goal is to make the library unbreakable from either intentional or accidental misuse.

An identifier starts with `Reflex` if and only if it's public API or it can be seen from the outside.

Reflex is built on top of ECMAScript 2015 (ES6).
It's recommended to use a transpiler to compile the code to a compatible version.
It also uses `AbortController`,
which is a part of Web API & Node.js 15.0.0+.
