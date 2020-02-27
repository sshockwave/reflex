class EventPipe {
    constructor() {
        let resolve, promise;
        function renewPromise() {
            promise = new Promise(res => {
                resolve = res;
            });
        }
        renewPromise();

        const callbackList = new Set;
        this.push = (value) => {
            for (const fn of callbackList) {
                promise.then(fn);
            }
            const oldResolve = resolve;
            renewPromise();
            oldResolve(value);
        };
        this.listen = (onfulfilled) => {
            if (typeof onfulfilled !== 'function') {
                throw new Error('The argument passed to listen() is not a function');
            }
            callbackList.add(onfulfilled);
        };
        this.stop = (onfulfilled) => {
            callbackList.delete(onfulfilled);
        };
        Object.defineProperty(this, 'next', {
            get() {
                return promise;
            },
        });
    }
}
