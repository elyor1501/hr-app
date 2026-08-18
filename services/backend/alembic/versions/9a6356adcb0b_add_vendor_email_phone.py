"""add_vendor_email_phone

Revision ID: 9a6356adcb0b
Revises: 04862ee7408b
Create Date: 2026-08-18 13:36:56.298028

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a6356adcb0b'
down_revision: Union[str, Sequence[str], None] = '04862ee7408b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
def upgrade() -> None:
    op.add_column('candidates', sa.Column('vendor_email', sa.String(255), nullable=True))
    op.add_column('candidates', sa.Column('vendor_phone', sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column('candidates', 'vendor_email')
    op.drop_column('candidates', 'vendor_phone')