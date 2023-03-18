import { ReflexError } from './error.js';
import { accessNode, ComputedHandle, handleMap } from './computed.js';

class ValueNode {
  constructor(value) {
    this.value = value;
  }
  getValue() {
    return this.value;
  }
  setValue(value) {
    this.value = value;
  }
  destroy() { }
}

class ReflexState {
  state = new Map();
}

const handler = {
  defineProperty() {
    throw new ReflexError('not implemented');
  },
  deleteProperty() {
    throw new ReflexError('not implemented');
  },
  get({ state }, property, receiver) {
    const node = state.get(property);
    accessNode(node);
    return node.getValue();
  },
  getOwnPropertyDescriptor() {
    throw new ReflexError('not implemented');
  },
  getPrototypeOf() {
    throw new ReflexError('not implemented');
  },
  has({ state }, property) {
    return state.has(property);
  },
  isExtensible() {
    throw new ReflexError('not implemented');
  },
  ownKeys({ state }) {
    return Array.from(state.keys());
  },
  preventExtensions() {
    throw new ReflexError('not implemented');
  },
  set({ state }, property, value, receiver) {
    const node = state.get(property);
    if (node === undefined) {
      if (value instanceof ComputedHandle) {
        state.set(property, handleMap[value.handle]);
      } else {
        state.set(property, new ValueNode(value));
      }
    } else {
      node.setValue(value);
    }
  },
  setPrototypeOf() {
    throw new ReflexError('not implemented');
  },
};

export function createState(ac) {
  const target = new ReflexState;
  ac.addEventListener('abort', () => {
    for (const node of target.state.values()) {
      node.destroy();
    }
  });
  return new Proxy(target, handler);
}
