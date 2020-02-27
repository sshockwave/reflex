class EventPipe {
    constructor() {
        let resolve, promise;
        function renewPromise() {
            promise = new Promise(res => {
                resolve = res;
            });
        }
        renewPromise();
        this.push = (value) => {
            const oldResolve = resolve;
            renewPromise();
            oldResolve(value);
        };
        Object.defineProperty(this, 'next', {
            get() {
                return promise;
            },
        });
    }
}

const eventHandler = Symbol();
class Reactant { }

let dependTarget = null;

export function value(store) {
    const updateEvent = new EventPipe;
    return Object.defineProperties(new Reactant, {
        value: {
            get() {
                if (dependTarget) {
                    dependTarget.push(updateEvent.next);
                }
                return store;
            },
            set(value) {
                if (store !== value) {
                    store = value;
                    updateEvent.push(store);
                }
            },
        },
        update: {
            get() {
                return updateEvent.next;
            },
        },
    });
    return inst;
}

export function computed(getter, setter) {
    if (typeof getter !== 'function') {
        throw new Error('The getter passed to computed() is not a function');
    }
    const updateEvent = new EventPipe;
    let store = null;
    function getValue() {
        console.assert(dependTarget === null);
        dependTarget = [];
        const value = getter();
        if (store !== value) {
            store = value;
            updateEvent.push(store);
        }
        Promise.race(dependTarget).then(getValue);
        dependTarget = null;
    }
    getValue();
    return Object.defineProperties(new Reactant, {
        value: {
            get() {
                if (dependTarget) {
                    dependTarget.push(this.update);
                }
                return store;
            },
            set: setter,
        },
        update: {
            get() {
                return updateEvent.next;
            },
        },
    });
}

export function pipe(src, dest) {
    if (!(src instanceof Reactant && dest instanceof Reactant)) {
        throw new Error('flow() needs reactive variables to work properly.');
    }
    function hook() {
        src.update.then(hook);
        dest.value = src.value;
    }
    hook();
}

export function bind(src, dest) {
    pipe(src, dest);
    pipe(dest, src);
}
