interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress = 0 }) => {
  return (
    <div className="mt-3 w-full">
      {/* Progress Label (Optional) */}
      <div className="mb-2 flex justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-500">
          Uploading...
        </span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-500">
          {Math.round(progress || 0)}%
        </span>
      </div>

      {/* Progress Track */}
      <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-200">
        {/* Progress Fill */}
        <div
          className="h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-300 ease-out"
          style={{ width: `${progress || 0}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
