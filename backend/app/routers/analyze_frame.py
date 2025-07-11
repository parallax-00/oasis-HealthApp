from fastapi import APIRouter, UploadFile, File, HTTPException
import cv2
import numpy as np
import mediapipe as mp

router = APIRouter()
mp_pose = mp.solutions.pose

def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    ba = a - b
    bc = c - b
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return np.degrees(angle)

@router.post("/analyze_frame", summary="Analyze posture in a single frame", description="Uploads a single image frame and returns detected posture violations and keypoints.")
async def analyze_frame(frame: UploadFile = File(...)):
    if frame.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    contents = await frame.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Failed to decode image. Make sure it's a valid JPEG or PNG.")

    with mp_pose.Pose(static_image_mode=True) as pose:
        image_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = pose.process(image_rgb)

        if not results.pose_landmarks:
            return {"feedback": {"violations": [], "keypoints": {}}}

        landmarks = results.pose_landmarks.landmark

        def get_point(idx):
            lm = landmarks[idx]
            return [lm.x, lm.y]

        shoulder = get_point(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
        hip = get_point(mp_pose.PoseLandmark.LEFT_HIP.value)
        knee = get_point(mp_pose.PoseLandmark.LEFT_KNEE.value)
        ankle = get_point(mp_pose.PoseLandmark.LEFT_ANKLE.value)
        ear = get_point(mp_pose.PoseLandmark.LEFT_EAR.value)

        back_angle = calculate_angle(shoulder, hip, knee)
        knee_ahead = knee[0] > ankle[0]
        neck_angle = calculate_angle(ear, shoulder, hip)

        violations = []
        if back_angle < 150:
            violations.append(f"Back angle {int(back_angle)}° < 150°")
        if knee_ahead:
            violations.append("Knee is ahead of ankle")
        if neck_angle > 30:
            violations.append(f"Neck bent {int(neck_angle)}° > 30°")

        keypoints = {
            lm.name: [round(landmarks[lm.value].x, 4), round(landmarks[lm.value].y, 4)]
            for lm in mp_pose.PoseLandmark
        }

        return {
            "feedback": {
                "violations": violations,
                "keypoints": keypoints
            }
        }