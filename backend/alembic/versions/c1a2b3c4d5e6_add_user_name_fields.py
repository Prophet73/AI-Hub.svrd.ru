"""add user name fields

Revision ID: c1a2b3c4d5e6
Revises: b89f8bdf9a22
Create Date: 2025-12-25 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3c4d5e6'
down_revision: Union[str, None] = 'b89f8bdf9a22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add first_name, last_name, middle_name columns to users table
    op.add_column('users', sa.Column('first_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('middle_name', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # Remove name columns
    op.drop_column('users', 'middle_name')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
