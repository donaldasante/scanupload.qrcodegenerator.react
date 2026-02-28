import React, { use, useEffect, useState } from "react";
import { MdQrCodeScanner } from "react-icons/md";

interface LogoProps {
  logoBackgroundCss?: string;
  logoCss?: string;
  size?: "small" | "medium" | "large" | "xlarge";
  isConnected?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  logoBackgroundCss = "bg-gradient-to-br rounded-xl flex items-center justify-center flex-col",
  logoCss = "text-white",
  size = "small",
  isConnected = false,
}) => {
  const [logoSize, setLogoSize] = useState<string>("w-2 h-2");
  const [containerSize, setContainerSize] = useState<string>("w-4 h-4");
  const [logoState, setLogoState] = useState<string>(
    isConnected ? "from-green-200 to-green-600" : "from-red-600 to-red-800",
  );
  useEffect(() => {
    switch (size) {
      case "small":
        setContainerSize("w-2 h-2");
        setLogoSize("w-1 h-1");
        // Adjust QR code size or styles for small
        break;
      case "medium":
        setContainerSize("w-6 h-6");
        setLogoSize("w-4 h-4");
        // Adjust QR code size or styles for medium
        break;
      case "large":
        setContainerSize("w-8 h-8");
        setLogoSize("w-6 h-6");
        // Adjust QR code size or styles for large
        break;
      case "xlarge":
        setContainerSize("w-10 h-10");
        setLogoSize("w-8 h-8");
        // Adjust QR code size or styles for large
        break;
      default:
    }

    return () => {
      // Cleanup if necessary
    };
  }, [size]);

  useEffect(() => {
    setLogoState(
      isConnected
        ? "bg-gradient-to-r from-green-200 to-green-500"
        : " bg-gradient-to-r from-red-600 to-red-800",
    );
  }, [isConnected]);
  return (
    <div className="flex items-center space-x-2">
      <MdQrCodeScanner
        className={`${logoSize} ${logoCss} ${logoState} rounded-2xl p-1`}
      />
    </div>
  );
};

export default Logo;
