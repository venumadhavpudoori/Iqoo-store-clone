"""
routes/upload.py – FastAPI endpoint for uploading post images to AWS S3.
"""

from fastapi import APIRouter, Depends, File, UploadFile
from services.s3_service import upload_image_to_s3
from utils.dependencies import get_current_user

router = APIRouter(prefix="/upload", tags=["Media Upload"])


@router.post("/image", status_code=201)
async def upload_post_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload an image file to AWS S3 and return its public URL."""
    content = await file.read()
    url = upload_image_to_s3(
        file_bytes=content,
        content_type=file.content_type or "",
        folder=f"posts/user_{current_user['id']}",
    )
    return {"url": url}
