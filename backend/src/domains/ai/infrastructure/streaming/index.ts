export * from './conversation.stream';

import { ConversationState } from '../../domain/conversation';
import { ConversationEvent } from '../../domain/events';
import {
  createConversationStream,
  createEventEmitter,
} from './conversation.stream';

export const createConversationWorkflow = (
  initialState: ConversationState,
  applyEvent: (
    state: ConversationState,
    event: ConversationEvent
  ) => ConversationState
) => {
  const stream = createConversationStream({ initialState, applyEvent });

  return {
    pushEvent: stream.pushEvent,
    stateStream: stream.getStateStream(),
    eventStream: stream.getEventStream(),
    streamEvents: stream.transformToStreamEvents(),
    destroy: stream.destroy,
  };
};

export const createMessageStream = () => {
  const { emit, on, asObservable, complete } = createEventEmitter<string>();

  return {
    send: (message: string) => emit(message),
    onMessage: (handler: (message: string) => void) => on(handler),
    messages$: asObservable(),
    close: () => complete(),
  };
};

export const createBufferedStream = <T>(bufferSize: number = 10) => {
  const buffer: T[] = [];
  const { emit, asObservable, complete } = createEventEmitter<T[]>();

  return {
    push: (item: T) => {
      buffer.push(item);
      if (buffer.length >= bufferSize) {
        emit([...buffer]);
        buffer.length = 0;
      }
    },
    flush: () => {
      if (buffer.length > 0) {
        emit([...buffer]);
        buffer.length = 0;
      }
    },
    batches$: asObservable(),
    complete: () => {
      if (buffer.length > 0) {
        emit([...buffer]);
      }
      complete();
    },
  };
};
