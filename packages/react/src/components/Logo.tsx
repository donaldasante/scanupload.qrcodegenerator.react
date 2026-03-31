import React from "react";
import { MdQrCodeScanner } from "react-icons/md";

interface LogoProps {
  isConnected?: boolean;
}

const Logo: React.FC<LogoProps> = ({ isConnected = false }) => (
  <MdQrCodeScanner
    className={isConnected ? "sqg-logo sqg-logo--connected" : "sqg-logo sqg-logo--disconnected"}
  />
);

export default Logo;
