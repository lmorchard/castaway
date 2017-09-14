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

    const exampleSystem1 = System({
      configure: config => ({ foo: 'yay', bar: 'rab', ...config }),
      start: sinon.spy(),
      stop: sinon.spy(),
      drawStart: sinon.spy(),
      draw: sinon.spy(),
      drawEnd: sinon.spy(),
      updateStart: sinon.spy(),
      update: sinon.spy(),
      updateEnd: sinon.spy(),
      toBeCalled: sinon.spy(
        (world, config, runtime, ...args) => ['called1', ...args]
      )
    });

    const exampleSystem2 = System({
      configure: config => ({ quux: 'zork', info: 'com', ...config }),
      start: sinon.spy(),
      stop: sinon.spy(),
      drawStart: sinon.spy(),
      draw: sinon.spy(),
      drawEnd: sinon.spy(),
      updateStart: sinon.spy(),
      update: sinon.spy(),
      updateEnd: sinon.spy(),
      toBeCalled: sinon.spy(
        (world, config, runtime, ...args) => ['called2', ...args]
      )
    });

    const commonWorld = World.create({
      configs: [
        { name: 'exampleSystem1', opt: 'first' },
        { name: 'exampleSystem1', opt: 'second' },
        { name: 'exampleSystem2', opt: 'third' }
      ]
    });

    World.install(commonWorld, [
      { systems: { exampleSystem1, exampleSystem2 } }
    ]);

    describe('create()', () => {
      it('should populate world with initial data', () => {
        const world = World.create();
        ['configs', 'components', 'runtime']
          .forEach(name => expect(world).to.have.property(name));
        expect(world.lastId).to.equal(0);
      });
    });

    describe('configure()', () => {
      it('should populate system configuration', () => {
        const world = World.create();
        World.install(world, [
          { systems: { exampleSystem1, exampleSystem2 } }
        ]);
        World.configure(world, [
          'exampleSystem1',
          'exampleSystem2',
          [ 'exampleSystem1', { foo: 'bar' } ],
          [ 'exampleSystem1', { bar: 'frotz' } ],
          [ 'exampleSystem2', { quux: 'xyzzy' } ]
        ]);
        expect(world.configs).to.deep.equal(
          [ { foo: 'yay', bar: 'rab', name: 'exampleSystem1' },
            { quux: 'zork', info: 'com', name: 'exampleSystem2' },
            { foo: 'bar', bar: 'rab', name: 'exampleSystem1' },
            { foo: 'yay', bar: 'frotz', name: 'exampleSystem1' },
            { quux: 'xyzzy', info: 'com', name: 'exampleSystem2' } ]
        );
      });
    });

    describe('start()', () => {
      it('should set isRunning to true', () => {
        const world = World.create({ runtime: { isRunning: false } });
        World.start(world);
        expect(world.runtime.isRunning).to.be.true;
      });

      it('should schedule the first update & draw ticks only once', () => {
        const world = World.create({ runtime: { isRunning: false } });
        [0, 1].forEach(() => {
          World.start(world);
          expect(global.setTimeout.callCount).to.equal(1);
          expect(global.requestAnimationFrame.callCount).to.equal(1);
        });
      });

      it('should start all the configured systems', () => {
        World.start(commonWorld);

        let fn;
        fn = exampleSystem1.start;
        expect(fn.callCount).to.equal(2);
        expect(fn.firstCall.args[1]).to.deep.equal(commonWorld.configs[0]);
        expect(fn.secondCall.args[1]).to.deep.equal(commonWorld.configs[1]);

        fn = exampleSystem2.start;
        expect(fn.callCount).to.equal(1);
        expect(fn.firstCall.args[1]).to.deep.equal(commonWorld.configs[2]);
      });
    });

    describe('stop()', () => {
      it('should set isRunning to false', () => {
        const world = World.create({ runtime: { isRunning: true } });
        World.stop(world);
        expect(world.runtime.isRunning).to.be.false;
      });

      it('should stop all the configured systems', () => {
        World.start(commonWorld);
        World.stop(commonWorld);

        let fn;
        fn = exampleSystem1.stop;
        expect(fn.callCount).to.equal(2);
        expect(fn.firstCall.args[1]).to.deep.equal(commonWorld.configs[0]);
        expect(fn.secondCall.args[1]).to.deep.equal(commonWorld.configs[1]);

        fn = exampleSystem2.stop;
        expect(fn.callCount).to.equal(1);
        expect(fn.firstCall.args[1]).to.deep.equal(commonWorld.configs[2]);
      });
    });

    describe('pause()', () => {
      it('should set isPaused to true', () => {
        const world = { runtime: { isPaused: false } };
        World.pause(world);
        expect(world.runtime.isPaused).to.be.true;
      });
    });

    describe('resume()', () => {
      it('should set isPaused to false', () => {
        const world = { runtime: { isPaused: true } };
        World.resume(world);
        expect(world.runtime.isPaused).to.be.false;
      });
    });

    describe('update()', () => {
      it('should call updateStart, update, and updateEnd functions for systems', () => {
        World.update(commonWorld, 10000);
        ['updateStart', 'update', 'updateEnd'].forEach(name => {
          const fn1 = exampleSystem1[name];
          expect(fn1.callCount).to.equal(2);
          expect(fn1.firstCall.args[1]).to.deep.equal(commonWorld.configs[0]);
          expect(fn1.secondCall.args[1]).to.deep.equal(commonWorld.configs[1]);

          const fn2 = exampleSystem2[name];
          expect(fn2.callCount).to.equal(1);
          expect(fn2.firstCall.args[1]).to.deep.equal(commonWorld.configs[2]);
        });
      });
    });

    describe('draw()', () => {
      it('should call drawStart, draw, and drawEnd functions for systems', () => {
        World.draw(commonWorld, 10000);
        ['drawStart', 'draw', 'drawEnd'].forEach(name => {
          const fn1 = exampleSystem1[name];
          expect(fn1.callCount).to.equal(2);
          expect(fn1.firstCall.args[1]).to.deep.equal(commonWorld.configs[0]);
          expect(fn1.secondCall.args[1]).to.deep.equal(commonWorld.configs[1]);

          const fn2 = exampleSystem2[name];
          expect(fn2.callCount).to.equal(1);
          expect(fn2.firstCall.args[1]).to.deep.equal(commonWorld.configs[2]);
        });
      });
    });

    describe('callSystem()', () => {
      it('should call a function on a system', () => {
        const result1 = World.callSystem(commonWorld, 'exampleSystem1',
                                         'toBeCalled', 'passed1');
        expect(result1).to.deep.equal([ 'called1', 'passed1' ]);
        const result2 = World.callSystem(commonWorld, 'exampleSystem2',
                                         'toBeCalled', 'passed2');
        expect(result2).to.deep.equal([ 'called2', 'passed2' ]);
      });
    });

    describe('generateId()', () => {
      it('should produce a unique ID after several calls', () => {
        const world = World.create();
        const ids = [];
        [0, 1, 2].forEach(() => {
          const id = World.generateId(world);
          expect(ids).to.not.contain(id);
          ids.push(id);
        });
      });
    });

    describe('get()', () => {
      const readOnlyworld = World.create({
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
        expect(World.get(readOnlyworld, 'component1', '8675309')).to.deep.equal({
          prop1: 'a', prop2: 'xx', prop3: 'yy'
        });
      });
      it('should get all components of one type', () => {
        expect(World.get(readOnlyworld, 'component1')).to.deep.equal({
          8675309: { prop1: 'a', prop2: 'xx', prop3: 'yy' },
          9035768: { prop1: 'a', prop2: 'b' }
        });
      });
      it('should return an empty object if no components of type exist', () => {
        expect(World.get(readOnlyworld, 'notacomponent')).to.deep.equal({});
      });
    });

    describe('insert()', () => {
      it('should accept a collection of components to create an entity', () => {
        const world = World.create();

        const component1 = Component({ defaults: () => ({ prop1: 'a', prop2: 'b' }) });
        const component2 = Component({ defaults: () => ({ propA: '1', propB: '2' }) });
        const component3 = Component({ defaults: () => ({ propX: 'A', propY: 'B' }) });

        World.install(world, [{
          components: { component1, component2, component3 }
        }]);

        World.insert(world,
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

        expect(world.components).to.deep.equal({
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
        const world = World.create({
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

        World.destroy(world, '1');

        expect(world.components).to.deep.equal({
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
