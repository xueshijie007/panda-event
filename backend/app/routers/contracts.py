from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ContractOrderOut, OpenContractRequest, StatsOut, UserOut
from app.services.contract_service import get_stats, list_history_orders, list_open_orders, open_contract, reset_account
from app.services.settlement_service import settle_due_orders

router = APIRouter()


def current_user_id(x_user_id: Annotated[int, Header(alias="X-User-Id")]) -> int:
    return x_user_id


@router.post("/open", response_model=ContractOrderOut)
def create_contract(
    payload: OpenContractRequest,
    user_id: int = Depends(current_user_id),
    db: Session = Depends(get_db),
):
    return open_contract(db, user_id, payload)


@router.get("/open", response_model=list[ContractOrderOut])
def get_open_contracts(user_id: int = Depends(current_user_id), db: Session = Depends(get_db)):
    return list_open_orders(db, user_id)


@router.get("/history", response_model=list[ContractOrderOut])
def get_contract_history(user_id: int = Depends(current_user_id), db: Session = Depends(get_db)):
    return list_history_orders(db, user_id)


@router.get("/stats", response_model=StatsOut)
def get_contract_stats(user_id: int = Depends(current_user_id), db: Session = Depends(get_db)):
    return get_stats(db, user_id)


@router.post("/reset", response_model=UserOut)
def reset_simulator_account(user_id: int = Depends(current_user_id), db: Session = Depends(get_db)):
    return reset_account(db, user_id)


@router.post("/settle/manual")
def settle_manual(db: Session = Depends(get_db)) -> dict[str, int]:
    settled = settle_due_orders(db)
    return {"settled": settled}
