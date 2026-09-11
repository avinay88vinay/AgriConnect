import "./AgriConnectLogo.css";
import { Leaf } from "lucide-react";

function AgriConnectLogo({ size = "medium" }) {
  return (
    <div className={`agri-logo agri-logo-${size}`}>
      <span className="agri-logo-mark">
        <Leaf size={size === "small" ? 18 : 22} strokeWidth={1.7} />
      </span>

      <span className="agri-logo-text">
        AgriConnect
      </span>
    </div>
  );
}

export default AgriConnectLogo;