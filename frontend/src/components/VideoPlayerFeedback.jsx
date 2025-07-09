// Simple pose skeleton connections for drawing lines between keypoints
const POSE_CONNECTIONS = [
  ["LEFT_SHOULDER", "RIGHT_SHOULDER"],
  ["LEFT_SHOULDER", "LEFT_ELBOW"],
  ["LEFT_ELBOW", "LEFT_WRIST"],
  ["RIGHT_SHOULDER", "RIGHT_ELBOW"],
  ["RIGHT_ELBOW", "RIGHT_WRIST"],
  ["LEFT_SHOULDER", "LEFT_HIP"],
  ["RIGHT_SHOULDER", "RIGHT_HIP"],
  ["LEFT_HIP", "RIGHT_HIP"],
  ["LEFT_HIP", "LEFT_KNEE"],
  ["LEFT_KNEE", "LEFT_ANKLE"],
  ["RIGHT_HIP", "RIGHT_KNEE"],
  ["RIGHT_KNEE", "RIGHT_ANKLE"],
];
import React, { useEffect, useRef, useState } from "react";

const VideoPlayerWithFeedback = ({ videoSrc, analysisData }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [currentViolations, setCurrentViolations] = useState([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const fps = 30;

  useEffect(() => {
    const resizeCanvas = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    };

    const videoElement = videoRef.current;
    videoElement?.addEventListener("loadedmetadata", resizeCanvas);
    return () => {
      videoElement?.removeEventListener("loadedmetadata", resizeCanvas);
    };
  }, []);

  // Build a quick lookup map for frame → violations
  const violationsMap = {};
  if (analysisData?.violations) {
    for (const item of analysisData.violations) {
      violationsMap[item.frame] = item.violations;
    }
  }

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    const currentTime = video.currentTime;
    const frame = Math.floor(currentTime * fps);
    setCurrentFrame(frame);
    setCurrentViolations(violationsMap[frame] || []);
  };

  // 🖌️ Draw keypoints on canvas synced with currentFrame
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx || !analysisData?.violations) return;

    const video = videoRef.current;
    const match = analysisData.violations.find((v) => v.frame === currentFrame);
    if (!match || !match.keypoints) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const keypoints = match.keypoints;

    // Match canvas size to video
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    // Clear before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw keypoint dots
    Object.values(keypoints).forEach(([xNorm, yNorm]) => {
      const x = xNorm * canvas.width;
      const y = yNorm * canvas.height;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
    });

    // Draw skeleton lines between connected keypoints
    POSE_CONNECTIONS.forEach(([a, b]) => {
      const pointA = keypoints[a];
      const pointB = keypoints[b];
      if (pointA && pointB) {
        const [x1, y1] = [pointA[0] * canvas.width, pointA[1] * canvas.height];
        const [x2, y2] = [pointB[0] * canvas.width, pointB[1] * canvas.height];

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [currentFrame, analysisData]);

  return (
    <div className="space-y-4 relative w-full">
      <div className="relative w-full">
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          onTimeUpdate={handleTimeUpdate}
          className="w-full rounded shadow"
          onLoadedMetadata={() => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (video && canvas) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none"
        />
      </div>

      {currentViolations.length > 0 && (
        <div className="bg-red-100 p-4 rounded shadow text-red-800">
          <h2 className="font-bold mb-2">⚠️ Posture Violations</h2>
          <ul className="list-disc list-inside">
            {currentViolations.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VideoPlayerWithFeedback;
