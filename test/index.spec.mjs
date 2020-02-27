import * as assert from 'assert';
import * as reflex from '../index.mjs';

describe('value', function () {
    let item;
    it('can contain string', function () {
        item = reflex.value('test');
    });
    it('can return its value', function () {
        assert.equal(item.value, 'test');
    });
    it('can set value', function () {
        item.value = 101;
        assert.equal(item.value, 101);
    });
});

describe('pipe', function () {
    let a, b;
    before(function () {
        a = reflex.value(1);
        b = reflex.value(2);
    });
    it('throws if reactants are not supplied', function () {
        assert.throws(() => {
            reflex.pipe(a, 1);
        }, Error);
        assert.throws(() => {
            reflex.pipe(1, b);
        }, Error);
        assert.throws(() => {
            reflex.pipe(1, 1);
        }, Error);
    })
    it('can create pipe', function () {
        let aValue = a.value;
        reflex.pipe(a, b);
        assert.equal(aValue, b.value);
    });
    it('changes the target whenever the source changes', async function () {
        ++a.value;
        await b.update;
        assert.equal(a.value, b.value);
    });
});

describe('bind', function () {
    let a, b;
    before(function () {
        a = reflex.value('1');
        b = reflex.value('2');
    });
    it('can bind value', function () {
        let aValue = a.value;
        reflex.bind(a, b);
        assert.equal(aValue, b.value);
    });
    it('changes the target whenever the source changes', async function () {
        const newValue = '3';
        a.value = newValue;
        await b.update;
        assert.equal(newValue, b.value);
    });
    it('changes the source whenever the target changes', async function () {
        const newValue = '4';
        b.value = newValue;
        await a.update;
        assert.equal(newValue, a.value);
    });
});
describe('computed', function () {
    let a, b, sum;
    before(function () {
        a = reflex.value(1);
        b = reflex.value(2);
    });
    it('throws if a function is not supplied', function () {
        assert.throws(() => {
            sum = reflex.computed(1);
        }, Error);
    });
    it('can create computed property', function () {
        sum = reflex.computed(() => a.value + b.value);
        assert.equal(sum.value, a.value + b.value);
    });
    it('updates computed property automatically', async function () {
        a.value = 3;
        b.value = 4;
        await sum.update;
        assert.equal(sum.value, 7);
    });
    describe('nested', function () {
        let sum2;
        it('can create nested computed property', function () {
            sum2 = reflex.computed(() => a.value + sum.value);
            assert.equal(sum.value, a.value + b.value);
        });
        it('updates computed property automatically', async function () {
            const answer = a.value + sum.value + 1;
            ++b.value;
            await sum2.update;
            assert.equal(sum2.value, answer);
        });
    });
    let a2;
    it('can create a proxy to an object', function () {
        a2 = reflex.computed(() => a.value * 2, (value) => {
            if (value % 2 !== 0) {
                throw new Error('This is not an even number.');
            }
            a.value = value / 2;
        });
    });
    it('can get through proxy', async function () {
        const value = 7;
        a.value = value;
        await a2.update;
        assert.equal(a2.value, value * 2);
    });
    it('can set through proxy', async function () {
        const oddValue = 3, evenValue = 10;
        assert.throws(() => {
            a2.value = oddValue;
        }, Error);
        a2.value = evenValue;
        await a2.update;
        assert.equal(a2.value, evenValue);
        assert.equal(a.value, evenValue / 2);
    });
});
