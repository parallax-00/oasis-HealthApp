import React, { useState } from "react";
import WebcamCapture from "../components/WebcamCapture";
import VideoUploadForm from "../components/VideoUploadForm";
import VideoPlayerWithFeedback from "../components/VideoPlayerFeedback";
import axios from "axios";
const API = import.meta.env.VITE_API_BASE_URL;

const Home = () => {
  const [mode, setMode] = useState("upload");
  const [uploadedFilename, setUploadedFilename] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleUploadComplete = async (filename) => {
    setUploadedFilename(filename);
    setAnalysisData(null); // Clear previous analysis
    setIsAnalyzing(true); // Start loading spinner

    try {
      const res = await axios.post(
        `${API}/analyze`,
        { filename },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      setAnalysisData(res.data.feedback);
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setIsAnalyzing(false); // End loading
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-4">🧍‍♂️ Posture Detection App</h1>

      {/* Mode selector */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setMode("upload")}
          className={`px-6 py-2 rounded ${
            mode === "upload" ? "bg-blue-600" : "bg-blue-500"
          } text-white`}
        >
          Use Video
        </button>
        <button
          onClick={() => setMode("webcam")}
          className={`px-6 py-2 rounded ${
            mode === "webcam" ? "bg-green-600" : "bg-green-500"
          } text-white`}
        >
          Use Webcam
        </button>
      </div>

      {/* Upload Mode */}
      {mode === "upload" ? (
        <>
          <VideoUploadForm onUploadComplete={handleUploadComplete} />

          {isAnalyzing && (
            <div className="flex items-center gap-2 text-blue-700 font-medium mt-4">
              <svg
                className="animate-spin h-5 w-5 text-blue-700"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8v8z"
                  fill="currentColor"
                />
              </svg>
              Analyzing posture... Please wait.
            </div>
          )}

          {!isAnalyzing && uploadedFilename && analysisData && (
            <VideoPlayerWithFeedback
              videoSrc={`${import.meta.env.VITE_API_BASE_URL}/uploads/${uploadedFilename}`}
              analysisData={analysisData}
            />
          )}
        </>
      ) : (
        <WebcamCapture />
      )}
    </div>
  );
};

export default Home;
