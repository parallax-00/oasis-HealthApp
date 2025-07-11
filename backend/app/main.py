from fastapi import FastAPI, File, UploadFile, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.posture_analysis.analyzer import analyze_video
from fastapi.staticfiles import StaticFiles     
import os
from datetime import datetime
from pydantic import BaseModel
from app.routers import analyze_frame


app = FastAPI()
app.include_router(analyze_frame.router)

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",
    "https://oasis-health-app.vercel.app/",
], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "backend/app/uploads"
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload")
async def upload_video(video: UploadFile = File(...)):
    try:
        filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{video.filename}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        with open(filepath, "wb") as buffer:
            content = await video.read()
            buffer.write(content)

        return JSONResponse(content={"message": "Video uploaded successfully", "filename": filename}, status_code=200)
    except Exception as e:
        return JSONResponse(content={"message": f"Upload failed: {str(e)}"}, status_code=500)
class AnalyzeRequest(BaseModel):
    filename: str

@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    filename = request.filename
    video_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(video_path):

        raise HTTPException(status_code=404, detail="File not found")
    result = analyze_video(video_path)
    return {"feedback": result}