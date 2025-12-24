"""add allowed_departments to applications

Revision ID: h6i7j8k9l0m1
Revises: g5h6i7j8k9l0
Create Date: 2025-12-26 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'h6i7j8k9l0m1'
down_revision: Union[str, None] = 'g5h6i7j8k9l0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add allowed_departments column to applications
    # Empty array = available to all, ["IT", "Finance"] = only these departments
    op.add_column(
        'applications',
        sa.Column('allowed_departments', postgresql.JSON(), server_default='[]', nullable=False)
    )


def downgrade() -> None:
    op.drop_column('applications', 'allowed_departments')
