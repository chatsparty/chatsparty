#!/usr/bin/env python3
import asyncio
import socketio

# Create a Socket.IO client
sio = socketio.AsyncClient()

@sio.on('connect')
async def on_connect():
    print('Connected to server')

@sio.on('disconnect')
async def on_disconnect():
    print('Disconnected from server')

@sio.on('conversation_started')
async def on_conversation_started(data):
    print('Conversation started:', data)

@sio.on('agent_typing')
async def on_agent_typing(data):
    print('Agent typing:', data)

@sio.on('agent_message')
async def on_agent_message(data):
    print('Agent message:', data)

@sio.on('conversation_complete')
async def on_conversation_complete(data):
    print('Conversation complete:', data)

@sio.on('conversation_error')
async def on_conversation_error(data):
    print('Conversation error:', data)

async def main():
    try:
        # Connect to the server
        await sio.connect('http://localhost:8000', 
                          socketio_path='/socket.io/',
                          auth={'token': 'test_token'})
        
        print('Connected, testing multi-agent conversation...')
        
        # Test starting a conversation
        await sio.emit('start_multi_agent_conversation', {
            'conversation_id': 'test_conv_123',
            'agent_ids': ['agent1', 'agent2'],
            'initial_message': 'Hello, let\'s have a test conversation!',
            'max_turns': 3,
            'token': 'test_token'
        })
        
        # Wait for conversation to complete
        await asyncio.sleep(10)
        
    except Exception as e:
        print(f'Error: {e}')
    finally:
        await sio.disconnect()

if __name__ == '__main__':
    asyncio.run(main())