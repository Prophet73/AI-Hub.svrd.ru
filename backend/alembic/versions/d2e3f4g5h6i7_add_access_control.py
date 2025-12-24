"""add access control tables

Revision ID: d2e3f4g5h6i7
Revises: c1a2b3c4d5e6
Create Date: 2025-12-25 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd2e3f4g5h6i7'
down_revision: Union[str, None] = 'c1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_public column to applications
    op.add_column('applications', sa.Column('is_public', sa.Boolean(), nullable=True, server_default='false'))

    # Create user_groups table
    op.create_table(
        'user_groups',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=7), nullable=True, server_default='#6366f1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Create user_group_members table (many-to-many)
    op.create_table(
        'user_group_members',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('group_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('added_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('added_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['group_id'], ['user_groups.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'group_id')
    )

    # Create application_access table
    op.create_table(
        'application_access',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('group_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('application_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('granted_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['group_id'], ['user_groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['granted_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            '(user_id IS NOT NULL AND group_id IS NULL) OR (user_id IS NULL AND group_id IS NOT NULL)',
            name='check_user_or_group'
        ),
        sa.UniqueConstraint('user_id', 'application_id', name='unique_user_app_access'),
        sa.UniqueConstraint('group_id', 'application_id', name='unique_group_app_access'),
    )

    # Create indexes
    op.create_index('ix_application_access_user_id', 'application_access', ['user_id'])
    op.create_index('ix_application_access_group_id', 'application_access', ['group_id'])
    op.create_index('ix_application_access_application_id', 'application_access', ['application_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_application_access_application_id', table_name='application_access')
    op.drop_index('ix_application_access_group_id', table_name='application_access')
    op.drop_index('ix_application_access_user_id', table_name='application_access')

    # Drop tables
    op.drop_table('application_access')
    op.drop_table('user_group_members')
    op.drop_table('user_groups')

    # Remove is_public column
    op.drop_column('applications', 'is_public')
