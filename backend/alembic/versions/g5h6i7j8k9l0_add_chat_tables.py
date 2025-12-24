"""add chat tables

Revision ID: g5h6i7j8k9l0
Revises: f4g5h6i7j8k9
Create Date: 2025-12-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'g5h6i7j8k9l0'
down_revision: Union[str, None] = 'f4g5h6i7j8k9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Chat settings (singleton table)
    op.create_table(
        'chat_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('model_name', sa.String(100), server_default='gemini-2.5-flash-preview', nullable=False),
        sa.Column('system_prompt', sa.Text(), server_default='Ты корпоративный AI-ассистент SeverinGPT. Отвечай на русском языке, будь полезным и профессиональным.', nullable=False),
        sa.Column('daily_message_limit', sa.Integer(), server_default='100', nullable=False),
        sa.Column('max_tokens', sa.Integer(), server_default='8192', nullable=False),
        sa.Column('is_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Chat usage tracking (per user per day)
    op.create_table(
        'chat_usage',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('usage_date', sa.Date(), nullable=False),
        sa.Column('message_count', sa.Integer(), server_default='0', nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_chat_usage_user_id', 'chat_usage', ['user_id'])
    op.create_index('ix_chat_usage_date', 'chat_usage', ['usage_date'])
    op.create_index('ix_chat_usage_user_date', 'chat_usage', ['user_id', 'usage_date'], unique=True)

    # Chat messages (history)
    op.create_table(
        'chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_chat_messages_user_id', 'chat_messages', ['user_id'])
    op.create_index('ix_chat_messages_session_id', 'chat_messages', ['session_id'])

    # Insert default settings
    op.execute("""
        INSERT INTO chat_settings (id, model_name, system_prompt, daily_message_limit, max_tokens, is_enabled)
        VALUES (1, 'gemini-2.5-flash-preview', 'Ты корпоративный AI-ассистент SeverinGPT. Отвечай на русском языке, будь полезным и профессиональным.', 100, 8192, true)
    """)


def downgrade() -> None:
    op.drop_index('ix_chat_messages_session_id', table_name='chat_messages')
    op.drop_index('ix_chat_messages_user_id', table_name='chat_messages')
    op.drop_table('chat_messages')
    op.drop_index('ix_chat_usage_user_date', table_name='chat_usage')
    op.drop_index('ix_chat_usage_date', table_name='chat_usage')
    op.drop_index('ix_chat_usage_user_id', table_name='chat_usage')
    op.drop_table('chat_usage')
    op.drop_table('chat_settings')
