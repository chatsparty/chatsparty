from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List
import json
import asyncio

from ..models.chat import (
    ChatResponse, AgentCreateRequest, AgentResponse, 
    AgentChatRequest, MultiAgentConversationRequest, ConversationMessage
)
from ..services.ai import get_ai_service, AIServiceFacade
from ..services.ai.infrastructure.unified_model_service import get_unified_model_service
from ..services.connection_service import connection_service

router = APIRouter(prefix="/chat", tags=["chat"])



@router.post("/agents", response_model=AgentResponse)
async def create_agent(
    agent_request: AgentCreateRequest,
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    """Create an agent using connection_id"""
    try:
        model_config = connection_service.get_connection_model_config(agent_request.connection_id)
        if not model_config:
            raise HTTPException(status_code=404, detail=f"Connection {agent_request.connection_id} not found")
        
        chat_style_dict = None
        if agent_request.chat_style:
            chat_style_dict = agent_request.chat_style.model_dump()
        
        model_config_dict = model_config.model_dump()
        
        agent = ai_service.create_agent(
            agent_request.agent_id,
            agent_request.name,
            agent_request.prompt,
            agent_request.characteristics,
            model_config_dict,
            chat_style_dict,
            agent_request.connection_id
        )
        return AgentResponse(
            agent_id=agent.agent_id,
            name=agent.name,
            prompt=agent.prompt,
            characteristics=agent.characteristics,
            connection_id=agent_request.connection_id,
            chat_style=agent_request.chat_style
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create agent: {str(e)}")


@router.get("/agents", response_model=List[AgentResponse])
async def list_agents(ai_service: AIServiceFacade = Depends(get_ai_service)):
    try:
        agents_data = ai_service.list_agents()
        return [AgentResponse(**agent) for agent in agents_data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list agents: {str(e)}")


@router.put("/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    agent_request: AgentCreateRequest,
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    """Update an existing agent"""
    try:
        model_config = connection_service.get_connection_model_config(agent_request.connection_id)
        if not model_config:
            raise HTTPException(status_code=404, detail=f"Connection {agent_request.connection_id} not found")
        
        chat_style_dict = None
        if agent_request.chat_style:
            chat_style_dict = agent_request.chat_style.model_dump()
        
        model_config_dict = model_config.model_dump()
        
        agent = ai_service.update_agent(
            agent_id,
            agent_request.name,
            agent_request.prompt,
            agent_request.characteristics,
            model_config_dict,
            chat_style_dict,
            agent_request.connection_id
        )
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
        
        return AgentResponse(
            agent_id=agent.agent_id,
            name=agent.name,
            prompt=agent.prompt,
            characteristics=agent.characteristics,
            connection_id=agent_request.connection_id,
            chat_style=agent_request.chat_style
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update agent: {str(e)}")


@router.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: str,
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    try:
        success = ai_service.delete_agent(agent_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
        return {"message": f"Agent {agent_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete agent: {str(e)}")


@router.post("/agents/chat", response_model=ChatResponse)
async def chat_with_agent(
    chat_request: AgentChatRequest,
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    try:
        response = await ai_service.agent_chat(
            chat_request.agent_id,
            chat_request.message,
            chat_request.conversation_id
        )
        return ChatResponse(response=response, type="agent_response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent chat error: {str(e)}")


@router.post("/agents/conversation", response_model=List[ConversationMessage])
async def start_multi_agent_conversation(
    conversation_request: MultiAgentConversationRequest,
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    try:
        conversation_log = await ai_service.multi_agent_conversation(
            conversation_request.conversation_id,
            conversation_request.agent_ids,
            conversation_request.initial_message,
            conversation_request.max_turns
        )
        return [ConversationMessage(**msg) for msg in conversation_log]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Multi-agent conversation error: {str(e)}")


@router.post("/agents/conversation/stream")
async def stream_multi_agent_conversation(
    conversation_request: MultiAgentConversationRequest,
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    """Stream a multi-agent conversation in real-time using Server-Sent Events"""
    
    async def generate_conversation():
        try:
            async for message in ai_service.multi_agent_conversation_stream(
                conversation_request.conversation_id,
                conversation_request.agent_ids,
                conversation_request.initial_message,
                conversation_request.max_turns
            ):
                data = json.dumps(message)
                yield f"data: {data}\n\n"
                
                await asyncio.sleep(0.1)
                
        except Exception as e:
            error_message = {"error": f"Stream error: {str(e)}"}
            yield f"data: {json.dumps(error_message)}\n\n"
        
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"
    
    return StreamingResponse(
        generate_conversation(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )


@router.get("/conversations", response_model=List[Dict[str, Any]])
async def list_conversations(ai_service: AIServiceFacade = Depends(get_ai_service)):
    """Get all conversations from database"""
    try:
        conversations = ai_service.get_all_conversations()
        return conversations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list conversations: {str(e)}")

@router.get("/conversations/{conversation_id}", response_model=List[Dict[str, Any]])
async def get_conversation_history(
    conversation_id: str,
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    try:
        history = ai_service.get_conversation_history(conversation_id)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get conversation history: {str(e)}")


@router.get("/models")
async def list_available_models():
    try:
        import ollama
        client = ollama.Client()
        models = client.list()
        if "models" in models:
            return {"models": [model.get("name", model.get("model", "")) for model in models["models"]]}
        else:
            return {"models": [], "error": "No models found in response"}
    except Exception as e:
        return {"models": [], "error": str(e)}


@router.get("/providers")
async def get_available_providers():
    """Get all available AI providers and their models"""
    try:
        unified_service = get_unified_model_service()
        providers = unified_service.get_available_providers()
        return {"providers": providers}
    except Exception as e:
        return {"providers": {}, "error": str(e)}


@router.get("/providers/{provider}/models")
async def get_provider_models(provider: str):
    """Get available models for a specific provider"""
    try:
        unified_service = get_unified_model_service()
        models = unified_service.get_models_for_provider(provider)
        return {"provider": provider, "models": models}
    except Exception as e:
        return {"provider": provider, "models": [], "error": str(e)}