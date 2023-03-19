# Reflex

Reflex is a reactive programming framework for javascript with no-surprise principles.
The code goal is to make the library unhackable, either intentionally or accidentally.

## Getting Started

The core library is minimalistic and only provides the `Reflex` function.

* State objects: `new Reflex(constructor)` creates a state object whose properties are reactive states.
* Executors: `Reflex(executor)` returns a reactive computed value.

```js
import { Reflex as $ } from 'reflex';

const state = new $(function () {
  // Reactive properties
  this.a = 1;
  this.b = 2;

  // Reactive computed value
  this.sum = $(() => this.a + this.b);

  // Reactive side effects
  $(() => console.log('a has new value: ', this.a));
});
```

### Postulates

TL;DR:

1. A state object behaves exactly like an ordinary object inside executors,
except that they can't have prototypes.
2. Reactive values can only be read in executors, while reactive state properties can be set everywhere.
3. The executor function is re-run whenever any of its reactive dependencies change.
3. The return value of an executor can only be assigned to a state property,
and only during the construction of the state.

If you are interested in the rationale, read on.

In order for the reactive properties to be updated correctly,
the reactive states have some postulates that are enforced by the library.
In the production mode, the library would not validate these postulates and violations would cause undefined behavior.

1. Reactive values can only be read in an executor function.

    ```js
    new $(function () {
      this.a = 1;
      this.a2 = $(() => this.a * 2); // ok
      this.a3 = this.a * 3;          // error, reading outside an executor
    });
    ```

    Rationale: If reactive values are used outside of executors, the value would never be updated.

2. Executors can be created and assigned to a state property only during the construction of the state.

    ```js
    const state = new $(function () {
      this.a = 1;                     // ok
      this.a2 = $(() => this.a * 2);  // ok
    });
    state.b = 2;                      // ok
    state.a3 = $(() => state1.a * 3); // error, defining a computed value outside of constructor
    ```

    Another example:

    ```js
    let a2;
    const state1 = new $(function () {
      this.a = 1;
      a2 = $(() => this.a * 2);
    });
    const state2 = new $(function () {
      this.a2 = a2;                      // error, this constructor is not the one that created a2
      state1.a5 = $(() => state1.a * 5); // error, this is not the constructor for state1
    });
    ```

    Rationale: The lifetime of an executor is bound to the lifetime of the state object.

### Destruction

### Best Practices

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

* Merge two executors into one if one executor depends on the output of the other. This is for better performance.

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

Everything starting with `Reflex` is public API or can be seen from the outside.
