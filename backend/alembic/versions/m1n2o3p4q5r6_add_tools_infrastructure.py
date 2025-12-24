"""add tools infrastructure

Revision ID: m1n2o3p4q5r6
Revises: l0m1n2o3p4q5
Create Date: 2025-12-29 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'm1n2o3p4q5r6'
down_revision: Union[str, None] = 'l0m1n2o3p4q5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create tool_servers table
    op.create_table(
        'tool_servers',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('base_url', sa.String(500), nullable=False),
        sa.Column('api_key', sa.String(255), nullable=False),
        sa.Column('health_check_endpoint', sa.String(255), default='/health'),
        sa.Column('timeout_seconds', sa.Integer(), default=30),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_healthy', sa.Boolean(), default=False),
        sa.Column('last_health_check', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create tools table
    op.create_table(
        'tools',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(50), default='Wrench'),
        sa.Column('color', sa.String(20), default='#6366F1'),
        sa.Column('server_id', UUID(as_uuid=True), sa.ForeignKey('tool_servers.id'), nullable=True),
        sa.Column('endpoint', sa.String(255), nullable=True),
        sa.Column('http_method', sa.String(10), default='POST'),
        sa.Column('request_schema', sa.JSON(), nullable=True),
        sa.Column('response_type', sa.String(50), default='json'),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_public', sa.Boolean(), default=True),
        sa.Column('allowed_departments', sa.JSON(), default=list),
        sa.Column('usage_count', sa.Integer(), default=0),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sort_order', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create tool_executions table
    op.create_table(
        'tool_executions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tool_id', UUID(as_uuid=True), sa.ForeignKey('tools.id'), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('input_data', sa.JSON(), nullable=True),
        sa.Column('output_data', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
    )

    # Create indexes
    op.create_index('ix_tool_executions_tool_id', 'tool_executions', ['tool_id'])
    op.create_index('ix_tool_executions_user_id', 'tool_executions', ['user_id'])
    op.create_index('ix_tool_executions_started_at', 'tool_executions', ['started_at'])


def downgrade() -> None:
    op.drop_index('ix_tool_executions_started_at')
    op.drop_index('ix_tool_executions_user_id')
    op.drop_index('ix_tool_executions_tool_id')
    op.drop_table('tool_executions')
    op.drop_table('tools')
    op.drop_table('tool_servers')
