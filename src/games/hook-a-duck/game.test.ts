import { describe, expect, it } from 'vitest';
import {
  CASTS,
  DUCK_SPEED,
  ROD_Y,
  aim,
  cast,
  createState,
  duckPosition,
  step,
  type HookADuckState,
} from './game';

/** Puts one duck, worth `value`, still at the point where the hook will land. */
function oneDuckUnderHook(state: HookADuckState, value: number) {
  state.ducks = [{ angle: Math.PI / 2, value }];
  const p = duckPosition(state.ducks[0]);
  aim(state, p.x);
  return p;
}

/** Steps until the hook is back up on the rod. */
function finishCast(state: HookADuckState) {
  for (let i = 0; i < 100 && state.hook.phase !== 'up'; i++) step(state, 0.05);
}

describe('hook a duck', () => {
  it('starts with every cast left and no score', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.hook.phase).toBe('up');
  });

  it('floats the ducks round the stream in a loop', () => {
    const state = createState();
    const before = duckPosition(state.ducks[0]);
    step(state, (Math.PI * 2) / DUCK_SPEED / 4);
    expect(duckPosition(state.ducks[0])).not.toEqual(before);
    step(state, ((Math.PI * 2) / DUCK_SPEED) * 0.75);
    const after = duckPosition(state.ducks[0]);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('uses one cast each time the hook goes down', () => {
    const state = createState();
    expect(cast(state, 300)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.hook.phase).toBe('lowering');
  });

  it('cannot cast again while the hook is still down', () => {
    const state = createState();
    cast(state, 300);
    expect(cast(state, 300)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('only moves the hook along the rod while it is up', () => {
    const state = createState();
    aim(state, 200);
    cast(state, 300);
    aim(state, 600);
    expect(state.hook.x).toBe(200);
  });

  it("scores the number on a hooked duck's base", () => {
    const state = createState();
    const p = oneDuckUnderHook(state, 50);
    cast(state, p.y);
    // Start the hook just above the duck, so it lands before the duck floats away.
    state.hook.y = p.y - 1;
    step(state, 1 / 600);
    expect(state.score).toBe(50);
    expect(state.hook.phase).toBe('raising');
  });

  it('scores nothing when the hook misses', () => {
    const state = createState();
    state.ducks = [{ angle: 0, value: 50 }];
    aim(state, duckPosition(state.ducks[0]).x - 200);
    cast(state, 300);
    finishCast(state);
    expect(state.score).toBe(0);
  });

  it('brings the hook back up to the rod after a cast', () => {
    const state = createState();
    cast(state, 400);
    finishCast(state);
    expect(state.hook.phase).toBe('up');
    expect(state.hook.y).toBe(ROD_Y);
  });

  it('ends the round once the last cast is back up', () => {
    const state = createState();
    state.casts = 1;
    cast(state, 400);
    step(state, 0.05);
    expect(state.phase).toBe('playing');
    finishCast(state);
    expect(state.phase).toBe('over');
    expect(cast(state, 400)).toBe(false);
  });
});
