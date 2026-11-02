# Hook a Duck

Rubber ducks float round a stream in a loop. Lower the hook to catch one as it
passes.

## How to play

- Move the mouse left and right to slide the hook along the rod.
- Click to lower the hook. It drops as far as the point you clicked, then comes
  back up. If a duck is under the hook when it gets there, you catch it.
- You have 10 casts. The round ends when the last cast is back up on the rod.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and catching it scores that number. The
eight ducks on the stream are worth 10, 20, 10, 50, 10, 20, 10 and 30. A cast
that catches nothing scores 0.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `aim`, `cast`, `step`,
  `duckUnderHook`) and the `hookADuck` entry, the default export the midway
  finds.
- `game.test.ts`: tests for the game logic.
