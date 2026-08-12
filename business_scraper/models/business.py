from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List
from datetime import datetime

class BusinessData(BaseModel):
    business_name: str
    business_category: str
    address: Optional[str] = None
    city: str
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone_number: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    opening_hours: Optional[str] = None
    open_now: Optional[bool] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    description: Optional[str] = None
    services: Optional[List[str]] = Field(default_factory=list)
    business_status: Optional[str] = None # e.g., "Operational", "Permanently Closed"
    source_url: str
    collected_timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
