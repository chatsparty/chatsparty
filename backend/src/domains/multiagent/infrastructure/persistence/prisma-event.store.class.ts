import {
  PrismaClient,
  ConversationEvent as PrismaConversationEvent,
} from '@prisma/client';
import { ConversationId } from '../../core/types';
import { ConversationEvent } from '../../domain/events';
import { Effect, fromPromise } from '../../core/effects';
import { EventStore } from './event.store';

export class PrismaEventStore implements EventStore {
  constructor(private readonly prisma: PrismaClient) {}

  append(event: ConversationEvent): Effect<void> {
    return fromPromise(async () => {
      await this.prisma.conversationEvent.create({
        data: {
          eventId: event.eventId,
          conversationId: event.conversationId,
          eventType: event.type,
          eventData: event as any,
          timestamp: BigInt(event.timestamp),
          version: event.version || 1,
        },
      });
    });
  }

  getEvents(conversationId: ConversationId): Effect<ConversationEvent[]> {
    return fromPromise(async () => {
      const events = await this.prisma.conversationEvent.findMany({
        where: { conversationId },
        orderBy: { timestamp: 'asc' },
      });

      return events.map(event => this.deserializeEvent(event));
    });
  }

  getEventsAfter(
    conversationId: ConversationId,
    timestamp: number
  ): Effect<ConversationEvent[]> {
    return fromPromise(async () => {
      const events = await this.prisma.conversationEvent.findMany({
        where: {
          conversationId,
          timestamp: { gt: BigInt(timestamp) },
        },
        orderBy: { timestamp: 'asc' },
      });

      return events.map(event => this.deserializeEvent(event));
    });
  }

  private deserializeEvent(
    prismaEvent: PrismaConversationEvent
  ): ConversationEvent {
    const eventData = prismaEvent.eventData as any;
    return {
      ...eventData,
      timestamp: Number(prismaEvent.timestamp),
    } as ConversationEvent;
  }
}
