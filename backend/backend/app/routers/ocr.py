from fastapi import APIRouter, File, UploadFile, HTTPException
import io
import re

try:
    import pytesseract
    from PIL import Image
    _OCR_AVAILABLE = True
except Exception:
    pytesseract = None
    Image = None
    _OCR_AVAILABLE = False

router = APIRouter()


def _find_amount(text: str):
    # naive: look for the largest monetary number
    amounts = re.findall(r"\d+[\.,]?\d{0,2}", text.replace(',', '.'))
    if not amounts:
        return None
    # pick the largest by numeric value
    nums = [float(a) for a in amounts]
    return max(nums)


def _find_date(text: str):
    # naive date patterns: YYYY-MM-DD or DD/MM/YYYY or DD.MM.YYYY
    m = re.search(r"(\d{4}-\d{2}-\d{2})", text)
    if m:
        return m.group(1)
    m = re.search(r"(\d{2}[\./]\d{2}[\./]\d{4})", text)
    if m:
        return m.group(1)
    return None


@router.post("/ocr")
async def upload_and_ocr(file: UploadFile = File(...)):
    if not _OCR_AVAILABLE:
        raise HTTPException(status_code=501, detail="OCR not available on this installation (pytesseract/Pillow missing)")
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Upload an image file")
    content = await file.read()
    try:
        img = Image.open(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to read image")
    text = pytesseract.image_to_string(img)
    amount = _find_amount(text)
    date = _find_date(text)
    return {"text": text, "amount": amount, "date": date}
