"use client";

import { useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";

function noopSubscribe() {
  return () => {};
}

function useOrigin(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => ""
  );
}

export function QRLink({ code }: { code: string }) {
  const origin = useOrigin();
  const url = origin ? `${origin}/room/${code}` : "";
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable; nothing to fall back to.
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl bg-white p-3">
        {url && <QRCodeSVG value={url} size={160} />}
      </div>
      <button
        onClick={copyLink}
        className="rounded-xl border border-card-border px-4 py-2 text-sm text-muted hover:text-foreground"
      >
        {copied ? "Link copied!" : "Copy invite link"}
      </button>
    </div>
  );
}
