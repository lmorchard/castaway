import { expect } from 'chai';
import sinon from 'sinon';
import core from '../src/lib/core';

describe('core', () => {

  beforeEach(() => global.reset());

  describe('Component()', () => {
    const { Component } = core;

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

  describe('World', () => {
    const { World, Component } = core;

    it('should exist', () => expect(World).to.exist);

    describe('initialize()', () => {
      it('should populate state with initial data', () => {
        const state = World.initialize();
        ['world', 'systems', 'components', 'runtime']
          .forEach(name => expect(state).to.have.property(name));
        expect(state.world.lastEntityId).to.equal(0);
      });
    });

    describe('start()', () => {
      it('should set isRunning to true', () => {
        const state = World.initialize({ runtime: { isRunning: false } });
        World.start(state);
        expect(state.runtime.isRunning).to.be.true;
      });

      it('should schedule the first update & draw ticks only once', () => {
        const state = World.initialize({ runtime: { isRunning: false } });
        [0, 1].forEach(() => {
          World.start(state);
          expect(global.setTimeout.callCount).to.equal(1);
          expect(global.requestAnimationFrame.callCount).to.equal(1);
        });
      });

      it('should start all the configured systems', () => {
        const state = World.initialize({
          systems: [
            { name: 'example1', opt: 'first' },
            { name: 'example1', opt: 'second' },
            { name: 'example2', opt: 'third' }
          ]
        });
        const example1 = {
          start: sinon.spy(),
        };
        const example2 = {
          start: sinon.spy(),
        };
        World.installPlugins(state, [
          { systems: { example1, example2 } }
        ]);
        World.start(state);

        Object.keys(example1).forEach(key => {
          const fn = example1[key];
          expect(fn.callCount).to.equal(2);
          expect(fn.firstCall.args[1]).to.deep.equal(state.systems[0]);
          expect(fn.secondCall.args[1]).to.deep.equal(state.systems[1]);
        });

        Object.keys(example2).forEach(key => {
          const fn = example2[key];
          expect(fn.callCount).to.equal(1);
          expect(fn.firstCall.args[1]).to.deep.equal(state.systems[2]);
        });
      });
    });

    describe('stop()', () => {
      it('should set isRunning to false', () => {
        const state = World.initialize({ runtime: { isRunning: true } });
        World.stop(state);
        expect(state.runtime.isRunning).to.be.false;
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
        const state = World.initialize({
          systems: [
            { name: 'example1', opt: 'first' },
            { name: 'example1', opt: 'second' },
            { name: 'example2', opt: 'third' }
          ]
        });
        const example1 = { update: sinon.spy(), };
        const example2 = { update: sinon.spy(), };
        World.installPlugins(state, [
          { systems: { example1, example2 } }
        ]);
        World.update(state, 10000);

        const fn1 = example1.update;
        expect(fn1.callCount).to.equal(2);
        expect(fn1.firstCall.args[1]).to.deep.equal(state.systems[0]);
        expect(fn1.secondCall.args[1]).to.deep.equal(state.systems[1]);

        const fn2 = example2.update;
        expect(fn2.callCount).to.equal(1);
        expect(fn2.firstCall.args[1]).to.deep.equal(state.systems[2]);
      });
    });

    describe('draw()', () => {
      it('should call drawStart, draw, and drawEnd functions for systems', () => {
        const state = World.initialize({
          systems: [
            { name: 'example1', opt: 'first' },
            { name: 'example1', opt: 'second' },
            { name: 'example2', opt: 'third' }
          ]
        });
        const example1 = { draw: sinon.spy() };
        const example2 = { draw: sinon.spy() };
        World.installPlugins(state, [
          { systems: { example1, example2 } }
        ]);
        World.draw(state, 10000);

        const fn1 = example1.draw;
        expect(fn1.callCount).to.equal(2);
        expect(fn1.firstCall.args[1]).to.deep.equal(state.systems[0]);
        expect(fn1.secondCall.args[1]).to.deep.equal(state.systems[1]);

        const fn2 = example2.draw;
        expect(fn2.callCount).to.equal(1);
        expect(fn2.firstCall.args[1]).to.deep.equal(state.systems[2]);
      });
    });

    describe('addComponent()', () => {
      it('should add a component to the store', () => {
        const state = World.initialize();
        const component1 = Component({
          defaults: () => ({ prop1: 'a', prop2: 'b' })
        });
        World.installPlugins(state, [ { components: { component1 } } ]);
        World.addComponent(state, '9035768', 'component1');
        World.addComponent(state, '8675309', 'component1', { prop2: 'xx', prop3: 'yy' });
        expect(state.components).to.deep.equal({
          component1: {
            8675309: { prop1: 'a', prop2: 'xx', prop3: 'yy' },
            9035768: { prop1: 'a', prop2: 'b' }
          }
        });
      });
    });

    describe('removeComponent()', () => {
      it('should remove a component from the store', () => {
        const state = World.initialize({
          components: {
            component1: {
              8675309: { prop1: 'a', prop2: 'xx', prop3: 'yy' },
              9035768: { prop1: 'a', prop2: 'b' }
            }
          }
        });
        World.removeComponent(state, '9035768', 'component1');
        expect(state.components).to.deep.equal({
          component1: {
            8675309: { prop1: 'a', prop2: 'xx', prop3: 'yy' }
          }
        });
      });
    });

    const readOnlyState = World.initialize({
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

    describe('hasComponent()', () => {
      it('should check presence of a component is in the store', () => {
        expect(World.hasComponent(readOnlyState, '8675309', 'component1')).to.be.true;
        expect(World.hasComponent(readOnlyState, '9035768', 'component1')).to.be.true;
        expect(World.hasComponent(readOnlyState, '999', 'component1')).to.be.false;
        expect(World.hasComponent(readOnlyState, '8675309', 'goats')).to.be.false;
      });
    });

    describe('get()', () => {
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
    });

    describe('generateEntityId()', () => {
      it('should produce a unique ID after several calls', () => {
        const state = World.initialize();
        const ids = [];
        [0, 1, 2].forEach(() => {
          const id = World.generateEntityId(state);
          expect(ids).to.not.contain(id);
          ids.push(id);
        });
      });
    });

    describe('insert()', () => {
      it('should accept a collection of components to create an entity', () => {
        const state = World.initialize();

        const component1 = Component({ defaults: () => ({ prop1: 'a', prop2: 'b' }) });
        const component2 = Component({ defaults: () => ({ propA: '1', propB: '2' }) });
        const component3 = Component({ defaults: () => ({ propX: 'A', propY: 'B' }) });

        World.installPlugins(state, [{
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
        const state = World.initialize({
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
