import { World, System, Component } from '../Core';

export const MSG_SPAWN = 'spawnSpawn';
export const MSG_DESTROY = 'spawnDestroy';
export const MSG_DESPAWN = 'spawnDespawn';
export const MSG_CAPTURE_CAMERA = 'spawnCaptureCamera';

let spawn, spawns, entityId;

const Spawn = Component({
  defaults: () => ({
    ttl: null,
    age: 0,
    destroy: false,
    tombstone: null
  })
});

const SpawnSystem = System({
  configure: config => ({ debug: false, ...config }),

  update (world, config, runtime, timeDelta) {
    spawns = World.get(world, 'Spawn');

    World.receive(world, MSG_DESTROY, entityId => {
      if (entityId in spawns) {
        spawns[entityId].destroy = true;
      }
    });

    for (entityId in spawns) {
      spawn = spawns[entityId];

      if (!spawn.spawned) {
        spawn.spawned = true;
        World.send(world, MSG_SPAWN, entityId);
        if (spawn.captureCamera) {
          World.send(world, MSG_CAPTURE_CAMERA, entityId);
        }
      }

      if (spawn.ttl !== null) {
        spawn.age += timeDelta;
        if (spawn.age >= spawn.ttl) {
          spawn.destroy = true;
        }
        Math.random() < 0.01 && console.log(spawn);
      }

      if (spawn.destroy) {
        if (spawn.tombstone !== null) {
          const toInsert = (typeof spawn.tombstone === 'function')
            ? spawn.tombstone(spawn, entityId)
            : spawn.tombstone;
          World.insert(world, toInsert);
        }
        World.send(world, MSG_DESPAWN, entityId);
        World.destroy(world, entityId);
      }
    }
  }
});

export const components = { Spawn };
export const systems = { Spawn: SpawnSystem };
