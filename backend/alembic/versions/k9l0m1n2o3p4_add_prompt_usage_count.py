"""add prompt usage count

Revision ID: k9l0m1n2o3p4
Revises: j8k9l0m1n2o3
Create Date: 2025-12-29 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'k9l0m1n2o3p4'
down_revision: Union[str, None] = 'j8k9l0m1n2o3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('prompts', sa.Column('usage_count', sa.Integer(), nullable=True, server_default='0'))
    op.execute('UPDATE prompts SET usage_count = 0 WHERE usage_count IS NULL')
    op.alter_column('prompts', 'usage_count', nullable=False)


def downgrade() -> None:
    op.drop_column('prompts', 'usage_count')
