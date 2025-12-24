"""add token tracking to chat messages

Revision ID: l0m1n2o3p4q5
Revises: k9l0m1n2o3p4
Create Date: 2025-12-29 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'l0m1n2o3p4q5'
down_revision: Union[str, None] = 'k9l0m1n2o3p4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('chat_messages', sa.Column('model_name', sa.String(100), nullable=True))
    op.add_column('chat_messages', sa.Column('input_tokens', sa.Integer(), nullable=True))
    op.add_column('chat_messages', sa.Column('output_tokens', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('chat_messages', 'output_tokens')
    op.drop_column('chat_messages', 'input_tokens')
    op.drop_column('chat_messages', 'model_name')
