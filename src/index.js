import { createComputed } from './computed.js';
import { createState } from './state.js';

export const Reflex = new Proxy(
  Object.freeze(new class Reflex { }),
  {
    apply(target, thisArg, [fn]) {
      return createComputed(fn, createState());
    },

    construct(target, [fn, ac], newTarget) {
      const state = createState(ac);
      Reflect.apply(fn, state, []);
      return state;
    },
  },
);

export { ReflexError } from './errors.js';
