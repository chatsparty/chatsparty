import asyncio
import json
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from ..models.chat import (
    AgentChatRequest,
    AgentCreateRequest,
    AgentResponse,
    ChatResponse,
    ConversationMessage,
    ConversationShareRequest,
    ConversationShareResponse,
    MultiAgentConversationRequest,
)
from ..models.database import User
from ..services.ai import AIServiceFacade, get_ai_service
from ..services.ai.infrastructure.unified_model_service import get_initialized_unified_model_service
from ..services.connection_service import connection_service
from ..services.websocket_service import websocket_service
from .auth import get_current_user_dependency

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/agents", response_model=AgentResponse)
async def create_agent(
    agent_request: AgentCreateRequest,
    current_user: User = Depends(get_current_user_dependency),
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    """Create an agent using connection_id"""
    try:
        model_config = connection_service.get_connection_model_config(
            agent_request.connection_id, current_user.id)
        if not model_config:
            raise HTTPException(
                status_code=404, detail=f"Connection {agent_request.connection_id} not found")

        chat_style_dict = None
        if agent_request.chat_style:
            chat_style_dict = agent_request.chat_style.model_dump()

        model_config_dict = model_config.model_dump()

        voice_config_dict = None
        if agent_request.voice_config:
            voice_config_dict = agent_request.voice_config.model_dump()

        agent = ai_service.create_agent(
            agent_request.name,
            agent_request.prompt,
            agent_request.characteristics,
            current_user.id,
            model_config_dict,
            chat_style_dict,
            agent_request.connection_id,
            voice_config_dict,
            agent_request.mcp_tools,
            agent_request.mcp_tool_config
        )
        return AgentResponse(
            agent_id=agent.agent_id,
            name=agent.name,
            prompt=agent.prompt,
            characteristics=agent.characteristics,
            connection_id=agent_request.connection_id,
            chat_style=agent_request.chat_style,
            voice_config=agent_request.voice_config,
            mcp_server_id=agent_request.mcp_server_id,
            selected_mcp_tools=agent_request.mcp_tools,
            mcp_tool_config=agent_request.mcp_tool_config
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create agent: {str(e)}")


@router.get("/agents", response_model=List[AgentResponse])
async def list_agents(
    current_user: User = Depends(get_current_user_dependency),
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    try:
        agents_data = ai_service.list_agents(current_user.id)
        return [AgentResponse(**agent) for agent in agents_data]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list agents: {str(e)}")


@router.put("/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    agent_request: AgentCreateRequest,
    current_user: User = Depends(get_current_user_dependency),
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    """Update an existing agent"""
    try:
        model_config = connection_service.get_connection_model_config(
            agent_request.connection_id, current_user.id)
        if not model_config:
            raise HTTPException(
                status_code=404, detail=f"Connection {agent_request.connection_id} not found")

        chat_style_dict = None
        if agent_request.chat_style:
            chat_style_dict = agent_request.chat_style.model_dump()

        model_config_dict = model_config.model_dump()

        voice_config_dict = None
        if agent_request.voice_config:
            voice_config_dict = agent_request.voice_config.model_dump()

        agent = ai_service.update_agent(
            agent_id,
            agent_request.name,
            agent_request.prompt,
            agent_request.characteristics,
            model_config_dict,
            chat_style_dict,
            agent_request.connection_id,
            voice_config_dict,
            agent_request.mcp_tools,
            agent_request.mcp_tool_config
        )

        if not agent:
            raise HTTPException(
                status_code=404, detail=f"Agent {agent_id} not found")

        return AgentResponse(
            agent_id=agent.agent_id,
            name=agent.name,
            prompt=agent.prompt,
            characteristics=agent.characteristics,
            connection_id=agent_request.connection_id,
            chat_style=agent_request.chat_style,
            voice_config=agent_request.voice_config,
            mcp_server_id=agent_request.mcp_server_id,
            selected_mcp_tools=agent_request.mcp_tools,
            mcp_tool_config=agent_request.mcp_tool_config
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update agent: {str(e)}")


@router.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user_dependency),
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    try:
        success = ai_service.delete_agent(agent_id, current_user.id)
        if not success:
            raise HTTPException(
                status_code=404, detail=f"Agent {agent_id} not found")
        return {"message": f"Agent {agent_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete agent: {str(e)}")


@router.post("/agents/chat", response_model=ChatResponse)
async def chat_with_agent(
    chat_request: AgentChatRequest,
    current_user: User = Depends(get_current_user_dependency),
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    try:
        response = await ai_service.agent_chat(
            chat_request.agent_id,
            chat_request.message,
            chat_request.conversation_id,
            current_user.id
        )
        return ChatResponse(response=response, type="agent_response")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Agent chat error: {str(e)}")


@router.post("/agents/conversation", response_model=List[ConversationMessage])
async def start_multi_agent_conversation(
    conversation_request: MultiAgentConversationRequest,
    current_user: User = Depends(get_current_user_dependency),
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    try:
        file_attachments = None
        if conversation_request.file_attachments:
            file_attachments = [
                {
                    "filename": attachment.filename,
                    "content": attachment.content,
                    "file_type": attachment.file_type
                }
                for attachment in conversation_request.file_attachments
            ]

        conversation_log = await ai_service.multi_agent_conversation(
            conversation_request.conversation_id,
            conversation_request.agent_ids,
            conversation_request.initial_message,
            conversation_request.max_turns,
            current_user.id,
            file_attachments,
            conversation_request.project_id
        )
        return [ConversationMessage(**msg) for msg in conversation_log]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Multi-agent conversation error: {str(e)}")


@router.post("/agents/conversation/stream")
async def stream_multi_agent_conversation(
    conversation_request: MultiAgentConversationRequest,
    current_user: User = Depends(get_current_user_dependency),
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    """Stream a multi-agent conversation in real-time using Server-Sent Events"""

    async def generate_conversation():
        try:
            file_attachments = None
            if conversation_request.file_attachments:
                file_attachments = [
                    {
                        "filename": attachment.filename,
                        "content": attachment.content,
                        "file_type": attachment.file_type
                    }
                    for attachment in conversation_request.file_attachments
                ]

            async for message in ai_service.multi_agent_conversation_stream(
                conversation_request.conversation_id,
                conversation_request.agent_ids,
                conversation_request.initial_message,
                conversation_request.max_turns,
                current_user.id,
                file_attachments,
                conversation_request.project_id
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
async def list_conversations(
    current_user: User = Depends(get_current_user_dependency),
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    """Get all conversations from database"""
    try:
        conversations = ai_service.get_all_conversations(current_user.id)
        return conversations
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list conversations: {str(e)}")


@router.get("/conversations/{conversation_id}", response_model=Dict[str, Any])
async def get_conversation_by_id(
    conversation_id: str,
    current_user: User = Depends(get_current_user_dependency),
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    try:
        conversation = ai_service.get_conversation_by_id(
            conversation_id, current_user.id)
        if not conversation:
            raise HTTPException(
                status_code=404, detail="Conversation not found")
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get conversation: {str(e)}")


@router.put("/conversations/{conversation_id}/share", response_model=ConversationShareResponse)
async def update_conversation_sharing(
    conversation_id: str,
    share_request: ConversationShareRequest,
    current_user: User = Depends(get_current_user_dependency),
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    """Update the sharing status of a conversation"""
    try:
        conversation = ai_service.get_conversation_by_id(
            conversation_id, current_user.id)
        if not conversation:
            raise HTTPException(
                status_code=404, detail="Conversation not found")

        if conversation.get("user_id") != current_user.id:
            raise HTTPException(
                status_code=403, detail="You can only share your own conversations")

        success = ai_service.update_conversation_sharing(
            conversation_id,
            share_request.is_shared,
            current_user.id
        )

        if not success:
            raise HTTPException(
                status_code=404, detail="Failed to update conversation sharing")

        share_url = None
        if share_request.is_shared:
            share_url = f"/shared/conversation/{conversation_id}"

        return ConversationShareResponse(
            conversation_id=conversation_id,
            is_shared=share_request.is_shared,
            share_url=share_url
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update conversation sharing: {str(e)}")


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user_dependency),
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    """Delete a conversation and all its messages"""
    try:
        conversation = ai_service.get_conversation_by_id(
            conversation_id, current_user.id)
        if not conversation:
            raise HTTPException(
                status_code=404, detail="Conversation not found")

        if conversation.get("user_id") != current_user.id:
            raise HTTPException(
                status_code=403, detail="You can only delete your own conversations")

        success = ai_service.delete_conversation(
            conversation_id, current_user.id)

        if not success:
            raise HTTPException(
                status_code=404, detail="Failed to delete conversation")

        return {"message": f"Conversation {conversation_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete conversation: {str(e)}")


@router.get("/shared/conversations/{conversation_id}", response_model=Dict[str, Any])
async def get_shared_conversation(
    conversation_id: str,
    ai_service: AIServiceFacade = Depends(get_ai_service)
):
    """Get a shared conversation (public access, no authentication required)"""
    try:
        conversation = ai_service.get_conversation_by_id(
            conversation_id, user_id=None)
        if not conversation:
            raise HTTPException(
                status_code=404, detail="Conversation not found")

        if not conversation.get("is_shared", False):
            raise HTTPException(
                status_code=404, detail="Conversation not found")

        shared_conversation = {
            "id": conversation["id"],
            "participants": conversation["participants"],
            "messages": conversation["messages"],
            "created_at": conversation["created_at"],
            "updated_at": conversation["updated_at"],
            "isActive": False
        }

        return shared_conversation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get shared conversation: {str(e)}")


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
        unified_service = await get_initialized_unified_model_service()
        providers = unified_service.get_available_providers()
        return {"providers": providers}
    except Exception as e:
        return {"providers": {}, "error": str(e)}


@router.get("/providers/{provider}/models")
async def get_provider_models(provider: str):
    """Get available models for a specific provider"""
    try:
        unified_service = await get_initialized_unified_model_service()
        models = unified_service.get_models_for_provider(provider)
        return {"provider": provider, "models": models}
    except Exception as e:
        return {"provider": provider, "models": [], "error": str(e)}
