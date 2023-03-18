import { createComputed } from './computed.js';
import { createState } from './state.js';

class Reflex { }

export const reflex = new Proxy(
  Object.freeze(new Reflex),
  {
    apply(target, thisArg, [fn]) {
      return createComputed(fn, createState());
    },

    construct(target, [fn, ac], newTarget) {
      const state = createState(ac);
      Reflect.apply(fn, state, []);
      return state;
    },

    getPrototypeOf(target) { return Reflex.prototype; },
  },
);

export { ReflexError } from './errors.js';
