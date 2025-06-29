"""
Example of how to integrate credit system into existing chat services
"""

from typing import Optional

from ...models.chat import AgentChatRequest
from ...models.database import User
from ...models.credit import CreditConsumptionReason, CreditConsumptionRequest
from ..ai.application.chat_service import ChatService
from ..ai.infrastructure.connection_repository import ConnectionRepository
from .application.credit_service import CreditService, InsufficientCreditsError


class CreditAwareChatService(ChatService):
    """Extended chat service with credit consumption"""
    
    def __init__(
        self,
        agent_service,
        model_provider,
        conversation_repo,
        connection_repo: ConnectionRepository,
        credit_service: CreditService
    ):
        super().__init__(agent_service, model_provider, conversation_repo)
        self.connection_repo = connection_repo
        self.credit_service = credit_service
    
    async def agent_chat(
        self,
        agent_id: str,
        message: str,
        conversation_id: str,
        user_id: str,
        voice_enabled: bool = False,
        file_attachments: Optional[list] = None,
        metadata: Optional[dict] = None
    ):
        """Enhanced agent chat with credit consumption"""
        
        # Get agent and connection details
        agent = await self.agent_service.get_agent(agent_id)
        connection = await self.connection_repo.get_by_id(agent.connection_id)
        
        # Calculate credit cost based on model
        model_cost = await self.credit_service.get_model_cost(
            connection.provider,
            connection.model_name
        )
        
        # Check if this is a default connection that requires credits
        if connection.is_default:
            # Check credits before processing
            has_credits = await self.credit_service.check_credits(
                user_id,
                model_cost.cost_per_message
            )
            
            if not has_credits:
                balance = await self.credit_service.get_balance(user_id)
                raise InsufficientCreditsError(
                    required=model_cost.cost_per_message,
                    available=balance.balance
                )
        
        # Process the chat (original logic)
        response = await super().agent_chat(
            agent_id=agent_id,
            message=message,
            conversation_id=conversation_id,
            user_id=user_id,
            voice_enabled=voice_enabled,
            file_attachments=file_attachments,
            metadata=metadata
        )
        
        # Consume credits after successful response (only for default connections)
        if connection.is_default:
            consumption_request = CreditConsumptionRequest(
                amount=model_cost.cost_per_message,
                reason=CreditConsumptionReason.CHAT_MESSAGE,
                description=f"Chat with {agent.name} using {connection.model_name}",
                metadata={
                    "agent_id": agent_id,
                    "conversation_id": conversation_id,
                    "model": connection.model_name,
                    "provider": connection.provider
                }
            )
            
            await self.credit_service.consume_credits(user_id, consumption_request)
        
        return response
    
    async def start_multi_agent_conversation(
        self,
        conversation_id: str,
        agent_ids: list,
        initial_message: str,
        max_turns: int,
        user_id: str
    ):
        """Enhanced multi-agent conversation with credit pre-check"""
        
        # Calculate estimated cost
        estimated_cost = await self.credit_service.calculate_conversation_cost(
            agent_count=len(agent_ids),
            max_turns=max_turns
        )
        
        # Check credits
        has_credits = await self.credit_service.check_credits(user_id, estimated_cost)
        
        if not has_credits:
            balance = await self.credit_service.get_balance(user_id)
            raise InsufficientCreditsError(
                required=estimated_cost,
                available=balance.balance
            )
        
        # Reserve credits (deduct estimated amount)
        await self.credit_service.consume_credits(
            user_id,
            CreditConsumptionRequest(
                amount=estimated_cost,
                reason=CreditConsumptionReason.MULTI_AGENT_CONVERSATION,
                description=f"Multi-agent conversation with {len(agent_ids)} agents",
                metadata={
                    "conversation_id": conversation_id,
                    "agent_count": len(agent_ids),
                    "max_turns": max_turns,
                    "type": "reservation"
                }
            )
        )
        
        try:
            # Run the conversation
            result = await super().start_multi_agent_conversation(
                conversation_id=conversation_id,
                agent_ids=agent_ids,
                initial_message=initial_message,
                max_turns=max_turns,
                user_id=user_id
            )
            
            # Calculate actual cost based on messages exchanged
            actual_messages = len(result.get("messages", []))
            actual_cost = actual_messages  # 1 credit per message
            
            # Refund difference if we overcharged
            if actual_cost < estimated_cost:
                refund_amount = estimated_cost - actual_cost
                await self.credit_service.add_credits(
                    user_id,
                    refund_amount,
                    "conversation_refund",
                    f"Refund for conversation {conversation_id}"
                )
            
            return result
            
        except Exception as e:
            # Refund full amount on error
            await self.credit_service.add_credits(
                user_id,
                estimated_cost,
                "error_refund",
                f"Full refund due to error in conversation {conversation_id}"
            )
            raise e


# Example of using credit middleware in routes
from fastapi import APIRouter, Depends
from ...middleware.credit_middleware import require_credits


def get_chat_service() -> CreditAwareChatService:
    """Dependency to get credit-aware chat service"""
    # This would be properly implemented with dependency injection
    raise NotImplementedError("Chat service dependency not yet implemented")


router = APIRouter()

@router.post("/chat/agents/chat")
async def agent_chat_endpoint(
    request: AgentChatRequest,
    current_user: User = Depends(
        require_credits(
            credits=1,
            reason=CreditConsumptionReason.CHAT_MESSAGE
        )
    ),
    chat_service: CreditAwareChatService = Depends(get_chat_service)
):
    """Chat endpoint with automatic credit checking"""
    return await chat_service.agent_chat(
        agent_id=request.agent_id,
        message=request.message,
        conversation_id=request.conversation_id,
        user_id=current_user.id
    )