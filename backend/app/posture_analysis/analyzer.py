import cv2
import mediapipe as mp
import numpy as np

mp_pose = mp.solutions.pose

def calculate_angle(a, b, c):
    """Returns the angle (in degrees) between 3 points."""
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

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

    with mp_pose.Pose(static_image_mode=False) as pose:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(image_rgb)

            if not results.pose_landmarks:
                continue

            landmarks = results.pose_landmarks.landmark

            def get_point(idx):
                lm = landmarks[idx]
                return [lm.x, lm.y]

            # Key landmarks
            shoulder = get_point(mp_pose.PoseLandmark.LEFT_SHOULDER.value)
            hip = get_point(mp_pose.PoseLandmark.LEFT_HIP.value)
            knee = get_point(mp_pose.PoseLandmark.LEFT_KNEE.value)
            ankle = get_point(mp_pose.PoseLandmark.LEFT_ANKLE.value)
            ear = get_point(mp_pose.PoseLandmark.LEFT_EAR.value)

            # ✅ Back angle (shoulder–hip–knee)
            back_angle = calculate_angle(shoulder, hip, knee)

            # ✅ Knee over toe (knee x > ankle x — squatting posture)
            knee_ahead = knee[0] > ankle[0]

            # ✅ Neck bend (ear–shoulder–hip)
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
                    lm.name: [landmarks[lm.value].x, landmarks[lm.value].y]
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
        "violations": feedback
    }