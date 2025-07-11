import cv2
import mediapipe as mp
import numpy as np

mp_pose = mp.solutions.pose

def calculate_angle(a, b, c):
    a, b, c = map(np.array, (a, b, c))
    ba = a - b
    bc = c - b
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return np.degrees(angle)

def analyze_video(video_path: str):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "Could not open video"}

    feedback = []
    frame_idx = 0
    skip_frames = 1  # set to 5 or more to skip frames for speed

    with mp_pose.Pose(static_image_mode=False) as pose:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            if frame_idx % skip_frames != 0:
                continue

            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(image_rgb)

            if not results.pose_landmarks:
                continue

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

            if violations:
                keypoints = {
                    lm.name: [round(landmarks[lm.value].x, 4), round(landmarks[lm.value].y, 4)]
                    for lm in mp_pose.PoseLandmark
                }
                feedback.append({
                    "frame": frame_idx,
                    "violations": violations,
                    "keypoints": keypoints
                })

    cap.release()

    return {
        "total_frames": frame_idx,
        "frames_with_violations": len(feedback),
        "violations": feedback
    }