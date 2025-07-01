from fastapi import APIRouter, HTTPException
import logging
from ..services.ai import get_ai_service

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/test-list-agents")
async def test_list_agents():
    """Test listing all agents"""
    try:
        ai_service = get_ai_service()
        agents = ai_service.list_agents(user_id=None)
        return {
            "agent_count": len(agents),
            "agents": agents
        }
    except Exception as e:
        logger.error(f"Test list agents error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-ai-stream/{conversation_id}")
async def test_ai_stream(conversation_id: str, agent_id1: str = None, agent_id2: str = None):
    """Test AI streaming functionality"""
    try:
        ai_service = get_ai_service()
        
        # Use provided agent IDs or test with dummy ones
        if agent_id1 and agent_id2:
            agent_ids = [agent_id1, agent_id2]
        else:
            # First, list available agents
            available_agents = ai_service.list_agents(user_id=None)
            if len(available_agents) >= 2:
                agent_ids = [available_agents[0]['id'], available_agents[1]['id']]
            else:
                agent_ids = ["agent1", "agent2"]
        
        initial_message = "Hello, test message"
        
        messages = []
        logger.info(f"Starting test stream for conversation {conversation_id}")
        
        async for message in ai_service.multi_agent_conversation_stream(
            conversation_id,
            agent_ids,
            initial_message,
            max_turns=5,
            user_id=None,
            file_attachments=None,
            project_id=None
        ):
            logger.info(f"Received message: {message}")
            messages.append(message)
            
        logger.info(f"Test completed. Total messages: {len(messages)}")
        return {
            "conversation_id": conversation_id,
            "message_count": len(messages),
            "messages": messages
        }
        
    except Exception as e:
        logger.error(f"Test AI stream error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))