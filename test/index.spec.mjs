import * as assert from 'assert';
import * as reflex from '../index.mjs';
import { pipe } from '../index.mjs';
import { bind } from '../index.mjs';

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
    it('can create pipe', function () {
        reflex.pipe(a, b);
        assert.equal(a.value, b.value);
    });
    it('changes the target whenever the source changes', function(){
        ++a.value;
        assert.equal(a.value,b.value);
    });
});
