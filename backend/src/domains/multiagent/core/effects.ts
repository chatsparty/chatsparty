import { Result, ok, error } from './types';

export type Effect<A, E = Error> = () => Promise<Result<A, E>>;

export const pure =
  <A, E = Error>(value: A): Effect<A, E> =>
  async () =>
    ok<A, E>(value);

export const fail =
  <E = Error>(err: E): Effect<never, E> =>
  async () =>
    error<E>(err);

export const fromPromise =
  <A, E = Error>(
    promise: () => Promise<A>,
    errorHandler?: (err: unknown) => E
  ): Effect<A, E> =>
  async () => {
    try {
      const value = await promise();
      return ok<A, E>(value);
    } catch (err) {
      if (errorHandler) {
        return error<E>(errorHandler(err));
      }
      return error<E>(
        (err instanceof Error ? err : new Error(String(err))) as E
      );
    }
  };

export const map =
  <A, B, E>(effect: Effect<A, E>, fn: (a: A) => B): Effect<B, E> =>
  async () => {
    const result = await effect();
    if (result.kind === 'ok') {
      return ok<B, E>(fn(result.value));
    }
    return result;
  };

export const flatMap =
  <A, B, E>(effect: Effect<A, E>, fn: (a: A) => Effect<B, E>): Effect<B, E> =>
  async () => {
    const result = await effect();
    if (result.kind === 'ok') {
      return fn(result.value)();
    }
    return result;
  };

export const mapError =
  <A, E1, E2>(effect: Effect<A, E1>, fn: (e: E1) => E2): Effect<A, E2> =>
  async () => {
    const result = await effect();
    return result.kind === 'error'
      ? error<E2>(fn(result.error))
      : ok<A, E2>(result.value);
  };

export const parallel =
  <A, E>(effects: Effect<A, E>[]): Effect<A[], E> =>
  async () => {
    const results = await Promise.all(effects.map(e => e()));

    for (const result of results) {
      if (result.kind === 'error') {
        return result;
      }
    }

    return ok<A[], E>(results.map(r => (r as { kind: 'ok'; value: A }).value));
  };

export const sequence =
  <A, E>(effects: Effect<A, E>[]): Effect<A[], E> =>
  async () => {
    const results: A[] = [];

    for (const effect of effects) {
      const result = await effect();
      if (result.kind === 'error') {
        return result;
      }
      results.push(result.value);
    }

    return ok<A[], E>(results);
  };

export const recover =
  <A, E>(effect: Effect<A, E>, handler: (e: E) => Effect<A, E>): Effect<A, E> =>
  async () => {
    const result = await effect();
    return result.kind === 'error' ? handler(result.error)() : result;
  };

export const retry =
  <A, E>(
    effect: Effect<A, E>,
    maxAttempts: number = 3,
    initialDelay: number = 1000
  ): Effect<A, E> =>
  async () => {
    let lastError: E;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await effect();

      if (result.kind === 'ok') {
        return result;
      }

      lastError = result.error;

      if (attempt < maxAttempts - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return error<E>(lastError!);
  };

export const timeout =
  <A, E = Error>(effect: Effect<A, E>, ms: number): Effect<A, E | Error> =>
  async () => {
    const timeoutPromise = new Promise<Result<never, E | Error>>(resolve =>
      setTimeout(
        () => resolve(error<E | Error>(new Error(`Timeout after ${ms}ms`))),
        ms
      )
    );

    return Promise.race([effect(), timeoutPromise]);
  };

export const tap =
  <A, E>(
    effect: Effect<A, E>,
    fn: (result: Result<A, E>) => void
  ): Effect<A, E> =>
  async () => {
    const result = await effect();
    fn(result);
    return result;
  };

export const runEffect = async <A, E>(
  effect: Effect<A, E>
): Promise<Result<A, E>> => {
  return effect();
};
