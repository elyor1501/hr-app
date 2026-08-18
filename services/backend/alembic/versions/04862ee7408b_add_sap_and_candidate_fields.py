from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '04862ee7408b'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('candidates', sa.Column('sap_email', sa.String(255), nullable=True))
    op.add_column('candidates', sa.Column('sap_cuser', sa.String(100), nullable=True))
    op.add_column('candidates', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('candidates', sa.Column('end_date', sa.Date(), nullable=True))
    op.add_column('candidates', sa.Column('special_note', sa.Text(), nullable=True))
    op.add_column('candidates', sa.Column('contract_based', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('candidates', sa.Column('contract_start_date', sa.String(20), nullable=True))
    op.add_column('candidates', sa.Column('contract_end_date', sa.String(20), nullable=True))
    op.execute("ALTER TYPE candidatestatus ADD VALUE IF NOT EXISTS 'selected'")
    op.execute("ALTER TYPE candidatestatus ADD VALUE IF NOT EXISTS 'rejected'")


def downgrade() -> None:
    op.drop_column('candidates', 'sap_email')
    op.drop_column('candidates', 'sap_cuser')
    op.drop_column('candidates', 'start_date')
    op.drop_column('candidates', 'end_date')
    op.drop_column('candidates', 'special_note')
    op.drop_column('candidates', 'contract_based')
    op.drop_column('candidates', 'contract_start_date')
    op.drop_column('candidates', 'contract_end_date')