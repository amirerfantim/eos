"""habit goals + completion count

Adds per-habit goal (target/period/unit) and a per-day completion count so a
habit can require being done N times per day or week instead of just once.

Existing rows backfill to the classic binary behaviour: target=1, period='day',
count=1 — so nothing changes for habits created before this migration.

Revision ID: a1b2c3d4e5f6
Revises: e55806bb200a
Create Date: 2026-07-08 10:00:00.000000+00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'e55806bb200a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default backfills existing rows; the app model default takes over
    # for new rows, so the DB-level default is dropped afterwards.
    op.add_column(
        'habit',
        sa.Column('target', sa.Integer(), nullable=False, server_default='1'),
    )
    op.add_column(
        'habit',
        sa.Column(
            'period',
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
            server_default='day',
        ),
    )
    op.add_column(
        'habit',
        sa.Column('unit', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )
    op.add_column(
        'completion',
        sa.Column('count', sa.Integer(), nullable=False, server_default='1'),
    )
    op.alter_column('habit', 'target', server_default=None)
    op.alter_column('habit', 'period', server_default=None)
    op.alter_column('completion', 'count', server_default=None)


def downgrade() -> None:
    op.drop_column('completion', 'count')
    op.drop_column('habit', 'unit')
    op.drop_column('habit', 'period')
    op.drop_column('habit', 'target')
