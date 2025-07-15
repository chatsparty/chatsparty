import { FastifyReply } from 'fastify';
import { StreamEvent } from '../services/chat/chat.types';

export async function handleStreamingResponse(
  reply: FastifyReply,
  eventStream: AsyncGenerator<StreamEvent>
) {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  try {
    for await (const event of eventStream) {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (error) {
    console.error('Streaming error:', error);
    reply.raw.write(
      `data: ${JSON.stringify({
        type: 'error',
        data: { error: 'An unexpected error occurred during streaming.' },
        timestamp: Date.now(),
      })}\n\n`
    );
  } finally {
    reply.raw.end();
  }
}
