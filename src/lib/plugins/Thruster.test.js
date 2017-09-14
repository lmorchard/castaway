import { expect } from 'chai';
import sinon from 'sinon';
import { Component, System, World } from '../Core';
import * as ThrusterPlugin from './Thruster';
import * as MotionPlugin from './Motion';
import * as PositionPlugin from './Position';

describe('plugins/Thruster', () => {
  /*
  let world;

  beforeEach(() => {
    world = World.create();
    World.install(world, [ CollisionPlugin, PositionPlugin ]);
    World.configure(world, [ 'Position', 'Collision' ]);
    World.insert(world,
      { Position: { x: 0, y: 0 }, Collidable: {} },
      { Position: { x: 100, y: 100 }, Collidable: {} },
      { Position: { x: -100, y: 100 }, Collidable: {} }
    );
    World.start(world);
  });

  it('should start with none in collision', () => {
    World.update(world, 16);
    const collidables = World.get(world, 'Collidable');
    for (const entityId in collidables) {
      const collidable = collidables[entityId];
      expect(collidable.inCollisionWith).to.deep.equal({});
    }
  });

  it('should show two in collision after adding an entity in overlap with one', () => {
    World.insert(world, { Position: { x: 150, y: 150 }, Collidable: {} });
    World.update(world, 16);
    const collidables = World.get(world, 'Collidable');
    expect(collidables['2'].inCollisionWith).to.deep.equal({'4': 1});
    expect(collidables['4'].inCollisionWith).to.deep.equal({'2': 1});
  });

  it('should show three in collision after adding an entity in overlap with two', () => {
    World.insert(world, { Position: { x: 50, y: 50 }, Collidable: {} });
    World.update(world, 16);
    const collidables = World.get(world, 'Collidable');
    expect(collidables['1'].inCollisionWith).to.deep.equal({'4': 1});
    expect(collidables['2'].inCollisionWith).to.deep.equal({'4': 1});
    expect(collidables['4'].inCollisionWith).to.deep.equal({'1': 1, '2': 1});
  });
  */
});

