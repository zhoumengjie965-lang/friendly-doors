import { useState, useEffect } from "react";
import { X, Info } from "lucide-react";

interface WelcomeToastProps {
  onClose: () => void;
}

export function WelcomeToast({ onClose }: WelcomeToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 延迟显示动画
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed z-[100] transition-all duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      }`}
      style={{ top: "12px", right: "180px" }}
    >
      <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg px-4 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Info className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-sm text-blue-700">
            欢迎！已为您开启个人模式，如需团队协作请点击右上角切换为"企业模式"
          </p>
          <button
            onClick={handleClose}
            className="shrink-0 w-5 h-5 rounded-md hover:bg-blue-100 flex items-center justify-center transition-colors ml-1"
          >
            <X className="w-3.5 h-3.5 text-blue-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
