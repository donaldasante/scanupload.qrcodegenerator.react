import React from "react";

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress = 0 }) => (
  <div className="sqg-progress-wrap">
    <div className="sqg-progress-labels">
      <span className="sqg-progress-label">Uploading...</span>
      <span className="sqg-progress-label">{Math.round(progress || 0)}%</span>
    </div>
    <div className="sqg-progress-track">
      <div
        className="sqg-progress-fill"
        style={{ width: `${progress || 0}%` }}
      />
    </div>
  </div>
);

export default ProgressBar;
