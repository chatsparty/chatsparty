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

router = APIRouter(prefix="/chat", tags=["chat"])



@router.post("/agents", response_model=AgentResponse)
async def create_agent(
    agent_request: AgentCreateRequest,
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    try:
        chat_style_dict = None
        if agent_request.chat_style:
            chat_style_dict = agent_request.chat_style.model_dump()
        
        model_config_dict = None
        if agent_request.model_configuration:
            model_config_dict = agent_request.model_configuration.model_dump()
        
        agent = ai_service.create_agent(
            agent_request.agent_id,
            agent_request.name,
            agent_request.prompt,
            agent_request.characteristics,
            model_config_dict,
            chat_style_dict
        )
        return AgentResponse(
            agent_id=agent.agent_id,
            name=agent.name,
            prompt=agent.prompt,
            characteristics=agent.characteristics,
            model_configuration=agent_request.model_configuration,
            chat_style=agent_request.chat_style
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create agent: {str(e)}")


@router.get("/agents", response_model=List[AgentResponse])
async def list_agents(ai_service: AIServiceFacade = Depends(get_ai_service)):
    try:
        agents_data = ai_service.list_agents()
        return [AgentResponse(**agent) for agent in agents_data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list agents: {str(e)}")


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
                # Format as Server-Sent Events
                data = json.dumps(message)
                yield f"data: {data}\n\n"
                
                # Small delay to ensure proper streaming
                await asyncio.sleep(0.1)
                
        except Exception as e:
            error_message = {"error": f"Stream error: {str(e)}"}
            yield f"data: {json.dumps(error_message)}\n\n"
        
        # Send completion event
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
        return {"models": [model["name"] for model in models["models"]]}
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