import httpx
import os
from typing import Optional

RESTCOUNTRIES = "https://restcountries.com/v3.1/all?fields=name,currencies"
EXCHANGE_API = os.getenv("EXCHANGE_API", "https://api.exchangerate-api.com/v4/latest/{base}")

async def detect_currency_for_country(country_name: str) -> Optional[str]:
    # naive match: call restcountries and find the country by common name or partial match
    async with httpx.AsyncClient() as client:
        r = await client.get(RESTCOUNTRIES, timeout=10.0)
        r.raise_for_status()
        data = r.json()
        for entry in data:
            name = entry.get('name', {}).get('common', '')
            if not name:
                continue
            if country_name.lower() in name.lower() or name.lower() in country_name.lower():
                currencies = entry.get('currencies') or {}
                # currencies is a dict like { 'USD': { ... } }
                if currencies:
                    return list(currencies.keys())[0]
    return None

async def get_rate(base: str, target: str) -> Optional[float]:
    if base == target:
        return 1.0
    url = EXCHANGE_API.format(base=base)
    async with httpx.AsyncClient() as client:
        r = await client.get(url, timeout=10.0)
        r.raise_for_status()
        data = r.json()
        rates = data.get('rates') or {}
        rate = rates.get(target)
        return rate

async def convert_amount(amount: float, from_currency: str, to_currency: str) -> Optional[float]:
    rate = await get_rate(from_currency, to_currency)
    if rate is None:
        return None
    return amount * rate
