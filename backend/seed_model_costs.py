#!/usr/bin/env python3
"""
Seed the database with default model credit costs.
This replaces the previously hardcoded model costs.
"""

import uuid
from app.core.database import get_sync_db_session
from app.models.database import ModelCreditCost


def seed_model_costs():
    """Seed the database with default model credit costs"""
    default_costs = [
        {
            "provider": "chatsparty",
            "model_name": "gemini-2.5-flash",
            "cost_per_message": 1,
            "is_default_model": True,
            "is_active": True
        },
        {
            "provider": "openai",
            "model_name": "gpt-3.5-turbo",
            "cost_per_message": 1,
            "is_active": True
        },
        {
            "provider": "openai", 
            "model_name": "gpt-4",
            "cost_per_message": 5,
            "cost_per_1k_tokens": 3,
            "is_active": True
        },
        {
            "provider": "anthropic",
            "model_name": "claude-3-sonnet", 
            "cost_per_message": 3,
            "is_active": True
        },
        {
            "provider": "ollama",
            "model_name": "*",
            "cost_per_message": 0,  # Free for local models
            "is_active": True
        }
    ]
    
    db = next(get_sync_db_session())
    try:
        for cost_data in default_costs:
            # Check if this cost entry already exists
            existing = db.query(ModelCreditCost).filter(
                ModelCreditCost.provider == cost_data["provider"],
                ModelCreditCost.model_name == cost_data["model_name"]
            ).first()
            
            if not existing:
                model_cost = ModelCreditCost(
                    id=str(uuid.uuid4()),
                    **cost_data
                )
                db.add(model_cost)
                print(f"Added cost for {cost_data['provider']}:{cost_data['model_name']}")
            else:
                print(f"Cost for {cost_data['provider']}:{cost_data['model_name']} already exists")
        
        db.commit()
        print("✅ Model costs seeded successfully")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding model costs: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_model_costs()