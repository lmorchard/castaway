import { expect } from 'chai';
import sinon from 'sinon';
import { Component, System, World } from './Core';

describe('Core', () => {

  beforeEach(() => global.reset());

  describe('Component()', () => {
    it('should support defaults', () => {
      const expectedDefaults = { foo: 'bar', baz: 'quux' };
      const component = Component({ defaults: () => expectedDefaults });

      const data1 = component.create();
      expect(data1).to.deep.equal(expectedDefaults);

      const overrides = { foo: 'barbar', hello: 'world' };
      const data2 = component.create(overrides);
      expect(data2).to.deep.equal(Object.assign({}, expectedDefaults, overrides));
    });
  });

  describe('System()', () => {
    it('should have debug=false by default', () => {
      const system = System();
      expect(system.configure()).to.have.property('debug', false);
    });
  });

  describe('World', () => {

    describe('create()', () => {
      it('should populate state with initial data', () => {
        const state = World.create();
        ['systems', 'components', 'runtime']
          .forEach(name => expect(state).to.have.property(name));
        expect(state.lastEntityId).to.equal(0);
      });
    });

    describe('configure()', () => {
      it('should populate system configuration', () => {
        const state = World.create();
        const example1 = System({
          configure: config => ({ foo: 'yay', bar: 'rab', ...config })
        });
        const example2 = System({
          configure: config => ({ quux: 'zork', info: 'com', ...config })
        });
        World.install(state, [
          { systems: { example1, example2 } }
        ]);
        World.configure(state, [
          'example1',
          'example2',
          [ 'example1', { foo: 'bar' } ],
          [ 'example1', { bar: 'frotz' } ],
          [ 'example2', { quux: 'xyzzy' } ]
        ]);
        expect(state.systems).to.deep.equal(
          [ { foo: 'yay', bar: 'rab', name: 'example1' },
            { quux: 'zork', info: 'com', name: 'example2' },
            { foo: 'bar', bar: 'rab', name: 'example1' },
            { foo: 'yay', bar: 'frotz', name: 'example1' },
            { quux: 'xyzzy', info: 'com', name: 'example2' } ]
        );
      });
    });

    describe('start()', () => {
      it('should set isRunning to true', () => {
        const state = World.create({ runtime: { isRunning: false } });
        World.start(state);
        expect(state.runtime.isRunning).to.be.true;
      });

      it('should schedule the first update & draw ticks only once', () => {
        const state = World.create({ runtime: { isRunning: false } });
        [0, 1].forEach(() => {
          World.start(state);
          expect(global.setTimeout.callCount).to.equal(1);
          expect(global.requestAnimationFrame.callCount).to.equal(1);
        });
      });

      it('should start all the configured systems', () => {
        const state = World.create({
          systems: [
            { name: 'example1', opt: 'first' },
            { name: 'example1', opt: 'second' },
            { name: 'example2', opt: 'third' }
          ]
        });
        const example1 = { start: sinon.spy(), };
        const example2 = { start: sinon.spy(), };
        World.install(state, [
          { systems: { example1, example2 } }
        ]);
        World.start(state);

        let fn;
        fn = example1.start;
        expect(fn.callCount).to.equal(2);
        expect(fn.firstCall.args[1]).to.deep.equal(state.systems[0]);
        expect(fn.secondCall.args[1]).to.deep.equal(state.systems[1]);

        fn = example2.start;
        expect(fn.callCount).to.equal(1);
        expect(fn.firstCall.args[1]).to.deep.equal(state.systems[2]);
      });
    });

    describe('stop()', () => {
      it('should set isRunning to false', () => {
        const state = World.create({ runtime: { isRunning: true } });
        World.stop(state);
        expect(state.runtime.isRunning).to.be.false;
      });

      it('should stop all the configured systems', () => {
        const state = World.create({
          systems: [
            { name: 'example1', opt: 'first' },
            { name: 'example1', opt: 'second' },
            { name: 'example2', opt: 'third' }
          ]
        });
        const example1 = System({ stop: sinon.spy() });
        const example2 = System({ stop: sinon.spy() });
        World.install(state, [
          { systems: { example1, example2 } }
        ]);
        World.start(state);
        World.stop(state);

        let fn;
        fn = example1.stop;
        expect(fn.callCount).to.equal(2);
        expect(fn.firstCall.args[1]).to.deep.equal(state.systems[0]);
        expect(fn.secondCall.args[1]).to.deep.equal(state.systems[1]);

        fn = example2.stop;
        expect(fn.callCount).to.equal(1);
        expect(fn.firstCall.args[1]).to.deep.equal(state.systems[2]);
      });
    });

    describe('pause()', () => {
      it('should set isPaused to true', () => {
        const state = { runtime: { isPaused: false } };
        World.pause(state);
        expect(state.runtime.isPaused).to.be.true;
      });
    });

    describe('resume()', () => {
      it('should set isPaused to false', () => {
        const state = { runtime: { isPaused: true } };
        World.resume(state);
        expect(state.runtime.isPaused).to.be.false;
      });
    });

    describe('update()', () => {
      it('should call updateStart, update, and updateEnd functions for systems', () => {
        const state = World.create({
          systems: [
            { name: 'example1', opt: 'first' },
            { name: 'example1', opt: 'second' },
            { name: 'example2', opt: 'third' }
          ]
        });
        const example1 = {
          updateStart: sinon.spy(),
          update: sinon.spy(),
          updateEnd: sinon.spy()
        };
        const example2 = {
          updateStart: sinon.spy(),
          update: sinon.spy(),
          updateEnd: sinon.spy()
        };
        World.install(state, [
          { systems: { example1, example2 } }
        ]);
        World.update(state, 10000);

        ['updateStart', 'update', 'updateEnd'].forEach(name => {
          const fn1 = example1[name];
          expect(fn1.callCount).to.equal(2);
          expect(fn1.firstCall.args[1]).to.deep.equal(state.systems[0]);
          expect(fn1.secondCall.args[1]).to.deep.equal(state.systems[1]);
        });

        ['updateStart', 'update', 'updateEnd'].forEach(name => {
          const fn2 = example2[name];
          expect(fn2.callCount).to.equal(1);
          expect(fn2.firstCall.args[1]).to.deep.equal(state.systems[2]);
        });
      });
    });

    describe('draw()', () => {
      it('should call drawStart, draw, and drawEnd functions for systems', () => {
        const state = World.create({
          systems: [
            { name: 'example1', opt: 'first' },
            { name: 'example1', opt: 'second' },
            { name: 'example2', opt: 'third' }
          ]
        });
        const example1 = {
          drawStart: sinon.spy(),
          draw: sinon.spy(),
          drawEnd: sinon.spy()
        };
        const example2 = {
          drawStart: sinon.spy(),
          draw: sinon.spy(),
          drawEnd: sinon.spy()
        };
        World.install(state, [
          { systems: { example1, example2 } }
        ]);
        World.draw(state, 10000);

        ['drawStart', 'draw', 'drawEnd'].forEach(name => {
          const fn1 = example1[name];
          expect(fn1.callCount).to.equal(2);
          expect(fn1.firstCall.args[1]).to.deep.equal(state.systems[0]);
          expect(fn1.secondCall.args[1]).to.deep.equal(state.systems[1]);
        });

        ['drawStart', 'draw', 'drawEnd'].forEach(name => {
          const fn2 = example2[name];
          expect(fn2.callCount).to.equal(1);
          expect(fn2.firstCall.args[1]).to.deep.equal(state.systems[2]);
        });
      });
    });

    describe('generateId()', () => {
      it('should produce a unique ID after several calls', () => {
        const state = World.create();
        const ids = [];
        [0, 1, 2].forEach(() => {
          const id = World.generateId(state);
          expect(ids).to.not.contain(id);
          ids.push(id);
        });
      });
    });

    describe('get()', () => {
      const readOnlyState = World.create({
        components: {
          component1: {
            8675309: { prop1: 'a', prop2: 'xx', prop3: 'yy' },
            9035768: { prop1: 'a', prop2: 'b' }
          },
          component2: {
            8675309: { prop1: 'a', prop2: 'xx', prop3: 'yy' },
            9035768: { prop1: 'a', prop2: 'b' }
          }
        }
      });
      it('should get component data from the store for a single entity', () => {
        expect(World.get(readOnlyState, 'component1', '8675309')).to.deep.equal({
          prop1: 'a', prop2: 'xx', prop3: 'yy'
        });
      });
      it('should get all components of one type', () => {
        expect(World.get(readOnlyState, 'component1')).to.deep.equal({
          8675309: { prop1: 'a', prop2: 'xx', prop3: 'yy' },
          9035768: { prop1: 'a', prop2: 'b' }
        });
      });
      it('should return an empty object if no components of type exist', () => {
        expect(World.get(readOnlyState, 'notacomponent')).to.deep.equal({});
      });
    });

    describe('insert()', () => {
      it('should accept a collection of components to create an entity', () => {
        const state = World.create();

        const component1 = Component({ defaults: () => ({ prop1: 'a', prop2: 'b' }) });
        const component2 = Component({ defaults: () => ({ propA: '1', propB: '2' }) });
        const component3 = Component({ defaults: () => ({ propX: 'A', propY: 'B' }) });

        World.install(state, [{
          components: { component1, component2, component3 }
        }]);

        World.insert(state,
          {
            component1: { gabba: 'abba' },
            component2: { whee: 'yay' },
            component3: { propX: 'C' }
          },
          {
            component1: { prop1: 'abba' },
            component2: { propB: 'yay' },
            component3: { propX: 'C' }
          }
        );

        expect(state.components).to.deep.equal({
          component1:
           { '1': { prop1: 'a', prop2: 'b', gabba: 'abba' },
             '2': { prop1: 'abba', prop2: 'b' } },
          component2:
           { '1': { propA: '1', propB: '2', whee: 'yay' },
             '2': { propA: '1', propB: 'yay' } },
          component3:
           { '1': { propX: 'C', propY: 'B' },
             '2': { propX: 'C', propY: 'B' } }
        });
      });
    });

    describe('destroy()', () => {
      it('should remove all components for an entity', () => {
        const state = World.create({
          components: {
            component1:
             { '1': { prop1: 'a', prop2: 'b', gabba: 'abba' },
               '2': { prop1: 'abba', prop2: 'b' } },
            component2:
             { '1': { propA: '1', propB: '2', whee: 'yay' },
               '2': { propA: '1', propB: 'yay' } },
            component3:
             { '1': { propX: 'C', propY: 'B' },
               '2': { propX: 'C', propY: 'B' } }
          }
        });

        World.destroy(state, '1');

        expect(state.components).to.deep.equal({
          component1:
           { '2': { prop1: 'abba', prop2: 'b' } },
          component2:
           { '2': { propA: '1', propB: 'yay' } },
          component3:
           { '2': { propX: 'C', propY: 'B' } }
        });
      });
    });

  });

});
