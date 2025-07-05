"""
Rename columns for SQLModel compatibility

from yoyo import step

__depends__ = {'20250701_121501_add_indexes'}

steps = [
    step(
        "ALTER TABLE agents RENAME COLUMN model_config TO ai_config",
        "ALTER TABLE agents RENAME COLUMN ai_config TO model_config"
    ),
    step(
        "ALTER TABLE projects RENAME COLUMN vm_config TO vm_configuration", 
        "ALTER TABLE projects RENAME COLUMN vm_configuration TO vm_config"
    )
]
"""