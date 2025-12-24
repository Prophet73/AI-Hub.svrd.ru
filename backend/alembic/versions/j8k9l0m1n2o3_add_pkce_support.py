"""add_pkce_support

Revision ID: j8k9l0m1n2o3
Revises: i7j8k9l0m1n2
Create Date: 2025-01-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'j8k9l0m1n2o3'
down_revision: Union[str, None] = 'i7j8k9l0m1n2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add PKCE columns to oauth_codes table
    op.add_column('oauth_codes', sa.Column('code_challenge', sa.String(128), nullable=True))
    op.add_column('oauth_codes', sa.Column('code_challenge_method', sa.String(10), nullable=True))


def downgrade() -> None:
    op.drop_column('oauth_codes', 'code_challenge_method')
    op.drop_column('oauth_codes', 'code_challenge')
