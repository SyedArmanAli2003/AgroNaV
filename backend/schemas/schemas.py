# What it does: Defines Pydantic models for API request/response validation
# Input: Raw data from database or API requests
# Output: Validated, typed Python objects
# Called by: All routers for request/response serialization

from pydantic import BaseModel
from typing import Optional, List


class Outlet(BaseModel):
    """Database outlet record."""
    id: int
    name: str
    type: str
    owner_name: str
    district: str
    lat: float
    lng: float
    last_visit_date: str
    stock_days_remaining: int
    has_pest_alert: int
    sales_spike: int
    crop_stage: Optional[str] = None


class ScoredOutlet(Outlet):
    """Outlet with computed priority score, label, and reasons."""
    score: int
    label: str                  # "HIGH" | "MEDIUM" | "LOW"
    reasons: List[str]          # max 3 plain English strings


class NBACard(BaseModel):
    """Next Best Action recommendation card."""
    product: str
    pitch: str
    tip: str
    promotion: str
    why: str


class OutcomeLog(BaseModel):
    """Visit outcome submitted by field rep."""
    outlet_id: int
    rep_id: int = 1
    result: str                 # "sale" | "order" | "none"
    order_value: int = 0
    rejection_reason: Optional[str] = None
    notes: Optional[str] = ""
    retailer_id: Optional[str] = None
    retailer_name: Optional[str] = None
    product_discussed: Optional[str] = None
    visit_type: Optional[str] = "standard"


class Alert(BaseModel):
    """Anomaly or rule-based alert."""
    id: int
    outlet_id: Optional[int] = None
    type: str
    message: str
    severity: str               # "high" | "medium" | "info"
    created_at: str
    dismissed: int = 0


class WeeklyStat(BaseModel):
    """Weekly performance statistics row."""
    week_label: str
    visits: int
    accepted: int
    acceptance_rate: float
