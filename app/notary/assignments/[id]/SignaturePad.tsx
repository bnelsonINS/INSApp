"use client";

import { useEffect, useRef, useState } from "react";

type SignaturePadProps = {
  name: string;
  inputName: string;
  defaultValue?: string | null;
  signedPeopleName?: string;
  signedPeopleValue?: string;
};

export default function SignaturePad({
  name,
  inputName,
  defaultValue = "",
  signedPeopleName,
  signedPeopleValue,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [signatureData, setSignatureData] = useState(defaultValue ?? "");
  const [hasSignature, setHasSignature] = useState(Boolean(defaultValue));

  function setupCanvas() {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(220 * ratio);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = "220px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#0f172a";

    if (signatureData) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, 220);
      img.src = signatureData;
    }
  }

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);

    return () => window.removeEventListener("resize", setupCanvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function saveCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    setSignatureData(dataUrl);
    setHasSignature(true);
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();

    const canvas = canvasRef.current;
    const point = getPoint(event);
    if (!canvas || !point) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.setPointerCapture(event.pointerId);

    isDrawingRef.current = true;
    lastPointRef.current = point;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;

    event.preventDefault();

    const point = getPoint(event);
    const lastPoint = lastPointRef.current;
    const canvas = canvasRef.current;

    if (!canvas || !point || !lastPoint) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;

    event.preventDefault();

    const canvas = canvasRef.current;

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    isDrawingRef.current = false;
    lastPointRef.current = null;
    saveCanvas();
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    setSignatureData("");
    setHasSignature(false);
    lastPointRef.current = null;
    isDrawingRef.current = false;
  }

  return (
    <div>
      <input type="hidden" name={inputName} value={signatureData} />

      {signedPeopleName && signedPeopleValue ? (
        <input
          type="hidden"
          name={signedPeopleName}
          value={hasSignature ? signedPeopleValue : ""}
        />
      ) : null}

      <label className="block text-sm font-bold text-slate-700">{name}</label>

      <div
        ref={wrapperRef}
        className="mt-2 rounded-2xl border border-slate-300 bg-white p-3 shadow-inner"
      >
        <canvas
          ref={canvasRef}
          className="block w-full cursor-crosshair rounded-xl border border-dashed border-slate-300 bg-white"
          style={{
            height: "220px",
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p
          className={`text-sm font-bold ${
            hasSignature ? "text-emerald-700" : "text-slate-500"
          }`}
        >
          {hasSignature
            ? "Signature captured."
            : "Use finger, stylus, or mouse to sign."}
        </p>

        <button
          type="button"
          onClick={clearSignature}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}