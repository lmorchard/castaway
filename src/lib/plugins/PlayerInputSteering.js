// TODO: Get pointer input working, in combination with viewport zoom & center

import { World, System, Component } from '../Core';

const PI2 = Math.PI * 2;

const PlayerInputSteering = Component({
  defaults: () => ({
    active: true,
    radPerSec: Math.PI * 2
  })
});

const PlayerInputSteeringSystem = System({

  configure: config => ({
    gamepadDeadzone: 0.2,
    ...config
  }),

  start (world, config, runtime) {
    runtime.gamepad = { active: false };
    runtime.pointer = { active: false, x: 0, y: 0 };
    runtime.keys = { active: false };
    runtime.touch = { active: false, x: 0, y: 0 };

    /*
    runtime.world
      .subscribe('mouseDown', (msg, cursorPosition) =>
        runtime.setPointer(true, cursorPosition))
      .subscribe('mouseUp', (msg, cursorPosition) =>
        runtime.setPointer(false, cursorPosition))
      .subscribe('mouseMove', (msg, cursorPosition) =>
        runtime.setPointer(runtime.pointer.active, cursorPosition));
    */

    runtime.windowEvents = {
      keydown: ev => this.handleKeyDown(runtime, ev),
      keyup: ev => this.handleKeyUp(runtime, ev)
    };
    Object.keys(runtime.windowEvents)
      .forEach(k => window.addEventListener(k, runtime.windowEvents[k]));
  },

  stop (world, config, runtime) {
    Object.keys(runtime.windowEvents)
      .forEach(k => window.removeEventListener(k, runtime.windowEvents[k]));
  },

  update (world, config, runtime, timeDelta) {
    this.updateGamepads(world, config, runtime, timeDelta);
    this.updateKeyboard(world, config, runtime, timeDelta);

    const components = World.get(world, 'PlayerInputSteering');
    for (const entityId in components) {
      const steering = components[entityId];
      this.updateComponent(world, config, runtime, timeDelta, entityId, steering);
    }
  },

  updateComponent(world, config, runtime, timeDelta, entityId, steering) {
    const thruster = World.get(world, 'Thruster', entityId);
    const motion = World.get(world, 'Motion', entityId);

    thruster.active = true;
    thruster.stop = false;

    if (runtime.keys.active) {
      return this.updateComponentFromKeyboard(world, config, runtime, timeDelta, entityId, steering);
    }

    /*
    if (this.pointer.active) {
      return this.updateComponentFromPointer(world, config, runtime, timeDelta, entityId, steering);
    }
    */

    if (runtime.gamepad.active) {
      return this.updateComponentFromGamepad(world, config, runtime, timeDelta, entityId, steering);
    }

    thruster.stop = true;
    motion.drotation = 0;
  },

  /*
  updateComponentFromPointer(world, config, runtime, timeDelta, entityId, steering) {
    const position = World.get(world, 'Position', entityId);
    this.updateMotionFromTargetAngle(world, config, runtime, timeDelta, entityId, steering,
      Math.atan2(this.pointer.y - position.y, this.pointer.x - position.x));
  }
  */

  updateComponentFromGamepad(world, config, runtime, timeDelta, entityId, steering) {
    this.updateMotionFromTargetAngle(world, config, runtime, timeDelta, entityId, steering,
      Math.atan2(runtime.gamepad.axis1, runtime.gamepad.axis0));
  },

  updateComponentFromKeyboard(world, config, runtime, timeDelta, entityId, steering) {
    const thruster = World.get(world, 'Thruster', entityId);
    const motion = World.get(world, 'Motion', entityId);

    const dleft  = (runtime.keys[65] || runtime.keys[37] || runtime.gamepad.button13);
    const dright = (runtime.keys[68] || runtime.keys[39] || runtime.gamepad.button14);
    const dup    = (runtime.keys[87] || runtime.keys[38] || runtime.gamepad.button11);
    // const ddown  = (runtime.keys[83] || runtime.keys[40] || runtime.gamepad.button12);

    if (dup) {
      thruster.active = true;
    } else {
      thruster.stop = true;
    }

    const direction = dleft ? -1 : (dright ? 1 : 0);
    const targetDr = direction * steering.radPerSec;
    motion.drotation = targetDr;
  },

  updateGamepads(world, config, runtime) {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    // TODO: specify which gamepad, i.e. for multiplayer
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp || !gp.connected) continue;
      gp.buttons.forEach((val, idx) => runtime.gamepad[`button${idx}`] = val.pressed);
      gp.axes.forEach((val, idx) => runtime.gamepad[`axis${idx}`] = val);
      break; // stop after the first gamepad
    }

    Object.keys(runtime.gamepad).forEach(k => {
      if (!runtime.gamepad[k]) { delete runtime.gamepad[k]; }
    });

    const axisX = runtime.gamepad.axis0;
    const axisY = runtime.gamepad.axis1;
    runtime.gamepad.active =
      (Math.abs(axisX) > 0 || Math.abs(axisY) > 0) &&
      (Math.sqrt(axisX * axisX + axisY * axisY) > this.options.gamepadDeadzone);
  },

  updateKeyboard(world, config, runtime) {
    const dleft  = (runtime.keys[65] || runtime.keys[37] || runtime.gamepad.button13);
    const dright = (runtime.keys[68] || runtime.keys[39] || runtime.gamepad.button14);
    const dup    = (runtime.keys[87] || runtime.keys[38] || runtime.gamepad.button11);
    const ddown  = (runtime.keys[83] || runtime.keys[40] || runtime.gamepad.button12);

    runtime.keys.active = (dleft || dright || dup || ddown);
  },

  handleKeyDown(runtime, ev) {
    runtime.keys[ev.keyCode] = true;
    ev.preventDefault();
  },

  handleKeyUp(runtime, ev) {
    delete runtime.keys[ev.keyCode];
    ev.preventDefault();
  },

  updateMotionFromTargetAngle(world, config, runtime, timeDelta, entityId, steering, targetAngleRaw) {
    const position = World.get(world, 'Position', entityId);
    const motion = World.get(world, 'Motion', entityId);

    const targetAngle = (targetAngleRaw < 0) ?
      targetAngleRaw + PI2 : targetAngleRaw;

    // Pick the direction from current to target angle
    let direction = (targetAngle < position.rotation) ? -1 : 1;

    // If the offset between the angles is more than half a circle, go
    // the other way because it'll be shorter.
    const offset = Math.abs(targetAngle - position.rotation);
    if (offset > Math.PI) {
      direction = 0 - direction;
    }

    // Work out the desired delta-rotation to steer toward target
    const targetDr = direction * Math.min(steering.radPerSec, offset / timeDelta);

    // Calculate the delta-rotation impulse required to meet the goal,
    // but constrain to the capability of the steering thrusters
    let impulseDr = (targetDr - motion.drotation);
    if (Math.abs(impulseDr) > steering.radPerSec) {
      if (impulseDr > 0) {
        impulseDr = steering.radPerSec;
      } else if (impulseDr < 0) {
        impulseDr = 0 - steering.radPerSec;
      }
    }

    motion.drotation += impulseDr;
  }

});

export const components = { PlayerInputSteering };
export const systems = { PlayerInputSteering: PlayerInputSteeringSystem };
