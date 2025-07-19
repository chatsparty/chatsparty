import {
  PrismaClient,
  ConversationEvent as PrismaConversationEvent,
} from '@prisma/client';
import { ConversationId } from '../../core/types';
import { ConversationEvent } from '../../domain/events';
import { Effect, fromPromise } from '../../core/effects';
import { EventStore } from './event.store';

const deserializeEvent = (
  prismaEvent: PrismaConversationEvent
): ConversationEvent => {
  const eventData = prismaEvent.eventData as any;
  return {
    ...eventData,
    timestamp: Number(prismaEvent.timestamp),
  } as ConversationEvent;
};

export const createPrismaEventStore = (prisma: PrismaClient): EventStore => ({
  append: (event: ConversationEvent): Effect<void> =>
    fromPromise(async () => {
      await prisma.conversationEvent.create({
        data: {
          eventId: event.eventId,
          conversationId: event.conversationId,
          eventType: event.type,
          eventData: event as any,
          timestamp: BigInt(event.timestamp),
          version: event.version || 1,
        },
      });
    }),

  getEvents: (conversationId: ConversationId): Effect<ConversationEvent[]> =>
    fromPromise(async () => {
      const events = await prisma.conversationEvent.findMany({
        where: { conversationId },
        orderBy: { timestamp: 'asc' },
      });

      return events.map(deserializeEvent);
    }),

  getEventsAfter: (
    conversationId: ConversationId,
    timestamp: number
  ): Effect<ConversationEvent[]> =>
    fromPromise(async () => {
      const events = await prisma.conversationEvent.findMany({
        where: {
          conversationId,
          timestamp: { gt: BigInt(timestamp) },
        },
        orderBy: { timestamp: 'asc' },
      });

      return events.map(deserializeEvent);
    }),
});
