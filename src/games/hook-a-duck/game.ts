import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 10;
export const HOOK_SPEED = 600;
export const CATCH_RADIUS = 24;
/** Where the hook hangs from the rod when it is up. */
export const ROD_Y = 70;
/** The stream: an oval loop the ducks float round. */
export const STREAM = { x: WIDTH / 2, y: 290, rx: 310, ry: 130 } as const;
/** Radians per second round the loop. */
export const DUCK_SPEED = 0.5;
/** The number on each duck's base, in order round the loop. */
export const DUCK_VALUES = [10, 20, 10, 50, 10, 20, 10, 30] as const;

export interface Duck {
  /** Angle round the stream, in radians. */
  angle: number;
  value: number;
}

export interface Hook {
  x: number;
  y: number;
  /** How deep this cast goes. */
  targetY: number;
  phase: 'up' | 'lowering' | 'raising';
}

export interface Catch {
  x: number;
  y: number;
  value: number;
  age: number;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook;
  catches: Catch[];
  casts: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const ducks = DUCK_VALUES.map((value, i) => ({
    angle: (i / DUCK_VALUES.length) * Math.PI * 2,
    value,
  }));
  return {
    ducks,
    hook: { x: WIDTH / 2, y: ROD_Y, targetY: ROD_Y, phase: 'up' },
    catches: [],
    casts: CASTS,
    score: 0,
    phase: 'playing',
  };
}

export function duckPosition(duck: Duck): { x: number; y: number } {
  return {
    x: STREAM.x + STREAM.rx * Math.cos(duck.angle),
    y: STREAM.y + STREAM.ry * Math.sin(duck.angle),
  };
}

/** Moves the hook along the rod while it is up. */
export function aim(state: HookADuckState, x: number): void {
  if (state.hook.phase === 'up') state.hook.x = Math.max(0, Math.min(WIDTH, x));
}

/** Lowers the hook to `y` at the hook's place. Returns false if nothing was cast. */
export function cast(state: HookADuckState, y: number): boolean {
  if (state.phase !== 'playing' || state.hook.phase !== 'up' || state.casts === 0) return false;
  state.hook.targetY = Math.max(ROD_Y + 1, Math.min(HEIGHT, y));
  state.hook.phase = 'lowering';
  state.casts -= 1;
  return true;
}

/** The duck under the hook, if one is close enough to catch. */
export function duckUnderHook(state: HookADuckState): Duck | undefined {
  const { x, y } = state.hook;
  let closest: Duck | undefined;
  let closestDistance = CATCH_RADIUS;
  for (const duck of state.ducks) {
    const p = duckPosition(duck);
    const distance = Math.hypot(p.x - x, p.y - y);
    if (distance <= closestDistance) {
      closest = duck;
      closestDistance = distance;
    }
  }
  return closest;
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  for (const duck of state.ducks) {
    duck.angle = (duck.angle + DUCK_SPEED * dt) % (Math.PI * 2);
  }

  const { hook } = state;
  if (hook.phase === 'lowering') {
    hook.y = Math.min(hook.y + HOOK_SPEED * dt, hook.targetY);
    if (hook.y === hook.targetY) {
      const duck = duckUnderHook(state);
      if (duck) {
        state.score += duck.value;
        state.catches.push({ ...duckPosition(duck), value: duck.value, age: 0 });
      }
      hook.phase = 'raising';
    }
  } else if (hook.phase === 'raising') {
    hook.y = Math.max(hook.y - HOOK_SPEED * dt, ROD_Y);
    if (hook.y === ROD_Y) hook.phase = 'up';
  }

  for (const caught of state.catches) caught.age += dt;
  state.catches = state.catches.filter((c) => c.age < 1);

  if (state.casts === 0 && hook.phase === 'up') state.phase = 'over';
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream, with a wooden island in the middle.
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx + 44, STREAM.ry + 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.water;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx + 34, STREAM.ry + 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx - 34, STREAM.ry - 34, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const duck of state.ducks) {
    const { x, y } = duckPosition(duck);
    // Ducks face the way they float.
    const facing = Math.sin(duck.angle) < 0 ? 1 : -1;
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.ellipse(x, y, 20, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + facing * 12, y - 14, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.stripeA;
    ctx.fillRect(facing > 0 ? x + 19 : x - 26, y - 16, 7, 4);
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.arc(x + facing * 14, y - 16, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rod and line.
  const { hook } = state;
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(WIDTH, ROD_Y - 20);
  ctx.lineTo(hook.x, ROD_Y - 20);
  ctx.stroke();
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hook.x, ROD_Y - 20);
  ctx.lineTo(hook.x, hook.y);
  ctx.stroke();
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hook.x - 6, hook.y, 6, 0, Math.PI);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = canvasFont('title', 'bold');
  for (const caught of state.catches) {
    ctx.globalAlpha = 1 - caught.age;
    ctx.fillStyle = colors.accent;
    ctx.fillText(`+${caught.value}`, caught.x, caught.y - 30 - caught.age * 40);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Lower the hook to catch a passing duck. The number on its base is what it scores.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => aim(state, toCanvas(event).x);
    const onDown = (event: PointerEvent) => {
      const point = toCanvas(event);
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        aim(state, point.x);
      } else {
        aim(state, point.x);
        cast(state, point.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(hookADuck.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default hookADuck;
