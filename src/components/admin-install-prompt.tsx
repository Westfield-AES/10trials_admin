"use client";

import { Download, Share2, X } from "lucide-react";
import { useState } from "react";
import { useAdminPwaInstall } from "@/components/providers";

export function AdminInstallPrompt() {
  const { canPrompt, ios, installed, promptInstall } = useAdminPwaInstall();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (installed || (!canPrompt && !ios)) return null;

  async function install() {
    if (!canPrompt) {
      setShowIosHelp((visible) => !visible);
      return;
    }
    await promptInstall();
  }

  return (
    <div className="relative">
      <button
        className="button-secondary min-h-9 px-2.5 sm:px-3"
        type="button"
        onClick={install}
        aria-expanded={ios ? showIosHelp : undefined}
      >
        <Download size={16} />
        <span className="hidden sm:inline">Install app</span>
      </button>
      {ios && showIosHelp && (
        <div className="panel absolute right-0 mt-2 w-72 p-4 text-sm shadow-xl" role="status">
          <button
            type="button"
            className="absolute right-2 top-2 rounded-lg p-1.5 text-[#607282] hover:bg-[#f4f8fa]"
            aria-label="Close install instructions"
            onClick={() => setShowIosHelp(false)}
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-2 font-black text-[#032e4d]">
            <Share2 size={17} className="text-[#e85b00]" /> Install on this device
          </div>
          <p className="mt-2 pr-4 leading-5 text-[#607282]">
            Open the browser Share menu, then choose <strong>Add to Home Screen</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
