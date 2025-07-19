import { ConversationId } from '../../core/types';
import { ConversationEvent } from '../../domain/events';
import { Effect, fromPromise, pure, map } from '../../core/effects';

export interface EventStore {
  append(event: ConversationEvent): Effect<void>;
  getEvents(conversationId: ConversationId): Effect<ConversationEvent[]>;
  getEventsAfter(
    conversationId: ConversationId,
    timestamp: number
  ): Effect<ConversationEvent[]>;
}

export class InMemoryEventStore implements EventStore {
  private events: ConversationEvent[] = [];

  append(event: ConversationEvent): Effect<void> {
    return map(pure(undefined), () => {
      this.events.push(event);
      return undefined;
    });
  }

  getEvents(conversationId: ConversationId): Effect<ConversationEvent[]> {
    return pure(this.events.filter(e => e.conversationId === conversationId));
  }

  getEventsAfter(
    conversationId: ConversationId,
    timestamp: number
  ): Effect<ConversationEvent[]> {
    return pure(
      this.events.filter(
        e => e.conversationId === conversationId && e.timestamp > timestamp
      )
    );
  }
}

export class DatabaseEventStore implements EventStore {
  constructor(
    private readonly saveEvent: (event: ConversationEvent) => Promise<void>,
    private readonly loadEvents: (
      conversationId: ConversationId
    ) => Promise<ConversationEvent[]>,
    private readonly loadEventsAfter: (
      conversationId: ConversationId,
      timestamp: number
    ) => Promise<ConversationEvent[]>
  ) {}

  append(event: ConversationEvent): Effect<void> {
    return fromPromise(() => this.saveEvent(event));
  }

  getEvents(conversationId: ConversationId): Effect<ConversationEvent[]> {
    return fromPromise(() => this.loadEvents(conversationId));
  }

  getEventsAfter(
    conversationId: ConversationId,
    timestamp: number
  ): Effect<ConversationEvent[]> {
    return fromPromise(() => this.loadEventsAfter(conversationId, timestamp));
  }
}

export class CachedEventStore implements EventStore {
  private cache = new Map<ConversationId, ConversationEvent[]>();

  constructor(private readonly store: EventStore) {}

  append(event: ConversationEvent): Effect<void> {
    return map(this.store.append(event), () => {
      const cached = this.cache.get(event.conversationId) ?? [];
      cached.push(event);
      this.cache.set(event.conversationId, cached);
    });
  }

  getEvents(conversationId: ConversationId): Effect<ConversationEvent[]> {
    const cached = this.cache.get(conversationId);
    if (cached) {
      return pure(cached);
    }

    return map(
      this.store.getEvents(conversationId),
      (events: ConversationEvent[]) => {
        this.cache.set(conversationId, events);
        return events;
      }
    );
  }

  getEventsAfter(
    conversationId: ConversationId,
    timestamp: number
  ): Effect<ConversationEvent[]> {
    return this.store.getEventsAfter(conversationId, timestamp);
  }

  clearCache(conversationId?: ConversationId): void {
    if (conversationId) {
      this.cache.delete(conversationId);
    } else {
      this.cache.clear();
    }
  }
}
