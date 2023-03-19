# Reflex

A reactive programming framework for javascript with the no-surprise principle.

## Getting Started

The core library is minimalistic.
There are only 3 APIs:

1. `new Reflex(constructor[, abortController])`
2. `Reflex(executor)`
3. `Reflex(state)`

Let's start by importing the library:

```js
import { Reflex as $ } from 'reflex';
```

Calling `new $(constructor)` is similar to running `new constructor()`,
which creates a new object using the constructor function.
An object created by Reflex is called a state object.

```js
const state = new $(function () {
  this.a = 1;
});
```

The difference between state objects and ordinary objects is that the properties of state objects are _reactive_. [^object_difference]
Reactive values can only be read in special contexts called _executors_.
Calculations inside executors are re-run whenever any of the reactive values changes,
so that the results are always up-to-date.

[^object_difference]: Also, a state object cannot have prototypes, which you probably don't care about.

An executor is created using the API `$(executor)`,
where the `executor` is a function.
The return value can only be assigned to a state property.
and only during the construction of the state.

```js
const state = new $(function () {
  this.a = 1;
  this.b = 2;
  this.sum = $(() => this.a + this.b);
});
```

Of course, the return value of `$(executor)` can be ignored,
in which case the executor is run for its side effects.

Javascript performs garbage collection for objects,
but some external resources need explicit release.
Reflex provides a mechanism to release resources by leveraging [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
You can define custom abort behaviours for executors by listening to the `abort` event on the `AbortController.signal` passed to the `executor`.

```js
const windowSize = new $(function () {
  const update = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  };
  update();
  $(({ signal }) => {
    window.addEventListener('resize', update);
    signal.addEventListener('abort', () => {
      window.removeEventListener('resize', update);
    });
  });
});
```

So when will the executor be aborted?
There are two possible cases:

1. If any of the reactive dependencies of the executor changes,
the executor is aborted and re-run.
2. If the executor is created during the construction of a state object,
the executor is aborted when the state object is destroyed.

State objects can be destroyed by first passing an `AbortController` during construction,
and then calling `abortController.abort()`.
When destroyed, all executors associated with the state object are aborted,
and the state object is no longer usable.

```js
const abortController = new AbortController();
const component = new $(function () {
  // ...
}, abortController);

// Unmount the component
abortController.abort();
```

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
