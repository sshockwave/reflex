import { ReflexError } from './error.js';
import { link, unlink } from './graph.js';

let inputs = null;

export function accessNode(node) {
  if (inputs) {
    inputs.add(node);
  }
}

export const handleMap = new WeakMap;

class ReflexComputed {
  constructor(node) {
    this.handle = Symbol();
    handleMap.set(handle, node);
  }
}

class ComputedNode {
  constructor(fn, state) {
    this.fn = fn;
    this.state = state;
    const oldInput = inputs;
    this.abortController = new AbortController;
    this.value = Reflect.apply(fn, state, [this.abortController]);
    for (const input of inputs) {
      link(input, this);
    }
    this.inputs = inputs;
    inputs = oldInput;
  }
  update() {
    for (const input of this.inputs) {
      unlink(input, this);
    }
    console.assert(inputs === null);
    inputs = new Set;
    this.abortController.abort();
    this.abortController = new AbortController;
    this.value = Reflect.apply(fn, state, [this.abortController]);
    for (const input of inputs) {
      link(input, this);
    }
    this.inputs = inputs;
    inputs = null;
  }
  getValue() {
    return this.value;
  }
  setValue() {
    throw new ReflexError('Computed properties should not be assigned with new values.');
  }
  destroy() {
    this.abortController.abort();
  }
}

export function createComputed(fn, state) {
  return Object.freeze(new ReflexComputed(new ComputedNode(fn, state)));
}
