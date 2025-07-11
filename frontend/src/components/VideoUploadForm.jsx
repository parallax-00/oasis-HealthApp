import React, { useState } from "react";
import axios from "axios";

const MAX_FILE_SIZE_MB = 50;

const VideoUploadForm = ({ onUploadComplete }) => {
  const [videoFile, setVideoFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setUploadStatus("");

    if (!file) {
      setVideoFile(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("video/")) {
      setUploadStatus("❌ Please select a valid video file.");
      setVideoFile(null);
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setUploadStatus(`❌ File size exceeds ${MAX_FILE_SIZE_MB} MB limit.`);
      setVideoFile(null);
      return;
    }

    setVideoFile(file);
  };

  const handleUpload = async () => {
    if (!videoFile) {
      setUploadStatus("❗ Please select a video first.");
      return;
    }

    const formData = new FormData();
    formData.append("video", videoFile);

    try {
      setIsUploading(true);
      setUploadStatus("📤 Uploading...");
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const uploadedFilename = response.data.filename;
      setUploadStatus(`✅ Upload successful: ${uploadedFilename}`);

      if (onUploadComplete) {
        onUploadComplete(uploadedFilename);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus("❌ Upload failed. Check the console for details.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border p-4 rounded shadow-md w-full max-w-md">
      <h2 className="text-xl mb-4 font-semibold">📤 Upload a Video File</h2>
      <input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="mb-4 border border-black/20 bg-amber-400/20 block"
        disabled={isUploading}
      />
      <button
        onClick={handleUpload}
        disabled={isUploading}
        className={`px-4 py-2 rounded text-white ${
          isUploading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>
      {uploadStatus && (
        <p className="mt-4 text-gray-700 whitespace-pre-line">{uploadStatus}</p>
      )}
    </div>
  );
};

export default VideoUploadForm;
