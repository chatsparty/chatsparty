import { Observable, Subject, from, of, merge } from 'rxjs';
import {
  map,
  switchMap,
  takeUntil,
  scan,
  shareReplay,
  distinctUntilChanged,
} from 'rxjs/operators';
import { ConversationEvent } from '../../domain/events';
import { ConversationState } from '../../domain/conversation';
import { Effect, runEffect } from '../../core/effects';

export type StreamEvent =
  | { type: 'state'; state: ConversationState }
  | { type: 'event'; event: ConversationEvent }
  | { type: 'thinking'; agentId: string; agentName: string }
  | {
      type: 'message';
      agentId: string;
      agentName: string;
      content: string;
      timestamp: number;
    }
  | { type: 'error'; error: Error }
  | { type: 'complete'; reason: string };

export interface ConversationStreamConfig {
  initialState: ConversationState;
  applyEvent: (
    state: ConversationState,
    event: ConversationEvent
  ) => ConversationState;
}

export interface ConversationStreamHandles {
  pushEvent: (event: ConversationEvent) => void;
  getStateStream: () => Observable<ConversationState>;
  getEventStream: () => Observable<ConversationEvent>;
  getStream: () => Observable<StreamEvent>;
  transformToStreamEvents: () => Observable<StreamEvent>;
  destroy: () => void;
}

export const createConversationStream = ({
  initialState,
  applyEvent,
}: ConversationStreamConfig): ConversationStreamHandles => {
  const events$ = new Subject<ConversationEvent>();
  const destroy$ = new Subject<void>();

  const pushEvent = (event: ConversationEvent): void => {
    events$.next(event);
  };

  const getStateStream = (): Observable<ConversationState> => {
    return events$.pipe(
      scan((state, event) => applyEvent(state, event), initialState),
      distinctUntilChanged(
        (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
      ),
      shareReplay(1),
      takeUntil(destroy$)
    );
  };

  const getEventStream = (): Observable<ConversationEvent> => {
    return events$.pipe(takeUntil(destroy$));
  };

  const getStream = (): Observable<StreamEvent> => {
    const stateEvents$ = getStateStream().pipe(
      map((state): StreamEvent => ({ type: 'state', state }))
    );

    const conversationEvents$ = getEventStream().pipe(
      map((event): StreamEvent => ({ type: 'event', event }))
    );

    return merge(stateEvents$, conversationEvents$).pipe(takeUntil(destroy$));
  };

  const transformToStreamEvents = (): Observable<StreamEvent> => {
    return getEventStream().pipe(
      switchMap(event => {
        switch (event.type) {
          case 'AgentSelected':
            return of<StreamEvent>({
              type: 'thinking',
              agentId: event.agentId,
              agentName: event.agentId,
            });

          case 'MessageGenerated':
            return of<StreamEvent>({
              type: 'message',
              agentId: event.message.agentId || '',
              agentName: event.message.speaker || '',
              content: event.message.content,
              timestamp: event.message.timestamp,
            });

          case 'ConversationTerminated':
            return of<StreamEvent>({
              type: 'complete',
              reason: event.reason,
            });

          case 'ErrorOccurred':
            return of<StreamEvent>({
              type: 'error',
              error: new Error(event.error),
            });

          default:
            return of();
        }
      }),
      takeUntil(destroy$)
    );
  };

  const destroy = (): void => {
    destroy$.next();
    destroy$.complete();
    events$.complete();
  };

  return {
    pushEvent,
    getStateStream,
    getEventStream,
    getStream,
    transformToStreamEvents,
    destroy,
  };
};


export const effectToObservable = <T>(effect: Effect<T>): Observable<T> => {
  return from(runEffect(effect)).pipe(
    switchMap(result => {
      if (result.kind === 'ok') {
        return of(result.value);
      } else {
        throw result.error;
      }
    })
  );
};

export const asyncGeneratorToObservable = <T>(
  generatorFn: () => AsyncGenerator<T>
): Observable<T> => {
  return new Observable<T>(subscriber => {
    const generator = generatorFn();

    (async () => {
      try {
        for await (const value of generator) {
          subscriber.next(value);
        }
        subscriber.complete();
      } catch (error) {
        subscriber.error(error);
      }
    })();

    return () => {
      if (generator.return) {
        void generator.return(undefined);
      }
    };
  });
};

export const createEventEmitter = <T>() => {
  const subject = new Subject<T>();

  return {
    emit: (event: T) => subject.next(event),
    on: (handler: (event: T) => void) => {
      const subscription = subject.subscribe(handler);
      return () => subscription.unsubscribe();
    },
    asObservable: () => subject.asObservable(),
    complete: () => subject.complete(),
  };
};
