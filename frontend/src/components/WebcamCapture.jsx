import React, { useRef, useEffect, useState } from "react";
import axios from "axios";

const INTERVAL_MS = 1000; // 1 second between frames

const WebcamCapture = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [analysisData, setAnalysisData] = useState(null);

  // Initialize webcam stream
  useEffect(() => {
    let isMounted = true;

    async function getWebcam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
          };
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setUploadStatus("❌ Could not access webcam");
      }
    }

    getWebcam();

    return () => {
      isMounted = false;
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Capture current frame and send to backend for analysis
  const captureAndAnalyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      setUploadStatus("📤 Analyzing frame...");

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) return;

      const formData = new FormData();
      formData.append("frame", blob, "frame.png");

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/analyze_frame`, // ✅ uses env variable
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setAnalysisData(response.data.feedback);
      setUploadStatus("✅ Analysis updated");
    } catch (error) {
      console.error("Frame analysis failed:", error);
      setUploadStatus("❌ Frame analysis failed. See console.");
    }
  };

  // Run frame capture + analysis continuously
  useEffect(() => {
    const interval = setInterval(() => {
      captureAndAnalyzeFrame();
    }, INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // Draw overlays when analysisData updates
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const video = videoRef.current;

    if (!canvas || !ctx || !video || !analysisData?.keypoints) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw keypoints (red dots)
    Object.entries(analysisData.keypoints).forEach(([, [xNorm, yNorm]]) => {
      ctx.beginPath();
      ctx.arc(xNorm * canvas.width, yNorm * canvas.height, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "red";
      ctx.fill();
    });

    // Draw skeleton lines
    const POSE_CONNECTIONS = [
      ["LEFT_SHOULDER", "RIGHT_SHOULDER"],
      ["LEFT_SHOULDER", "LEFT_ELBOW"],
      ["LEFT_ELBOW", "LEFT_WRIST"],
      ["LEFT_HIP", "LEFT_KNEE"],
      ["LEFT_KNEE", "LEFT_ANKLE"],
      ["RIGHT_SHOULDER", "RIGHT_ELBOW"],
      ["RIGHT_ELBOW", "RIGHT_WRIST"],
      ["RIGHT_HIP", "RIGHT_KNEE"],
      ["RIGHT_KNEE", "RIGHT_ANKLE"],
      ["LEFT_HIP", "RIGHT_HIP"],
    ];

    POSE_CONNECTIONS.forEach(([a, b]) => {
      const ptA = analysisData.keypoints[a];
      const ptB = analysisData.keypoints[b];
      if (ptA && ptB) {
        const [x1, y1] = [ptA[0] * canvas.width, ptA[1] * canvas.height];
        const [x2, y2] = [ptB[0] * canvas.width, ptB[1] * canvas.height];
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = "rgba(0,255,0,0.7)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw violation messages
    if (analysisData.violations?.length) {
      ctx.fillStyle = "yellow";
      ctx.font = "18px Arial";
      analysisData.violations.forEach((v, i) => {
        ctx.fillText(v, 10, 30 + i * 24);
      });
    }
  }, [analysisData]);

  return (
    <div>
      <div style={{ position: "relative" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", borderRadius: "8px" }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
            width: "100%",
            height: "100%",
          }}
        />
      </div>

      <p className="mt-2">{uploadStatus}</p>
    </div>
  );
};

export default WebcamCapture;
