"""add prompts table

Revision ID: f4g5h6i7j8k9
Revises: e3f4g5h6i7j8
Create Date: 2025-12-25 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f4g5h6i7j8k9'
down_revision: Union[str, None] = 'e3f4g5h6i7j8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'prompts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.String(1000), nullable=True),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('prompt_text', sa.Text(), nullable=False),
        sa.Column('icon', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_prompts_category', 'prompts', ['category'])
    op.create_index('ix_prompts_is_active', 'prompts', ['is_active'])


def downgrade() -> None:
    op.drop_index('ix_prompts_is_active', table_name='prompts')
    op.drop_index('ix_prompts_category', table_name='prompts')
    op.drop_table('prompts')
