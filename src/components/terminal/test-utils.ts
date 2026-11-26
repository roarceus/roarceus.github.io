import { act } from '@testing-library/react';

/** Runs `fn` inside `act` and lets the command it starts settle (runs are async). */
export async function actAsync(fn: () => void): Promise<void> {
  await act(async () => {
    fn();
    await Promise.resolve();
  });
}
