"use client";

import { useEffect, useRef, useState } from "react";

type SignaturePadProps = {
  inputName: string;
  signedPeopleName: string;
  signedPeopleValue: string;
};

type Point = {
  x: number;
  y: number;
};

export default function SignaturePad({
  inputName,
  signedPeopleName,
  signedPeopleValue,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [hasSignature, setHasSignature] = useState(false);

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const existingSignature = signatureDataUrl;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);

    const context = canvas.getContext("2d");
    if (!context) return;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.strokeStyle = "#0f172a";

    if (existingSignature) {
      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, rect.width, rect.height);
      };
      image.src = existingSignature;
    }
  }

  useEffect(() => {
    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("orientationchange", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("orientationchange", resizeCanvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function updateSignatureValue() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    setSignatureDataUrl(dataUrl);
    setHasSignature(true);
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);

    drawingRef.current = true;
    lastPointRef.current = getPoint(event);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;

    const canvas = canvasRef.current;
    const previousPoint = lastPointRef.current;
    if (!canvas || !previousPoint) return;

    event.preventDefault();

    const context = canvas.getContext("2d");
    if (!context) return;

    const nextPoint = getPoint(event);

    context.beginPath();
    context.moveTo(previousPoint.x, previousPoint.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.stroke();

    lastPointRef.current = nextPoint;
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;

    event.preventDefault();

    drawingRef.current = false;
    lastPointRef.current = null;
    updateSignatureValue();
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);

    setSignatureDataUrl("");
    setHasSignature(false);
  }

  return (
    <div>
      <label className="block text-sm font-bold text-slate-700">
        Signature Pad
      </label>

      <div className="mt-2 rounded-2xl border border-slate-300 bg-white p-3 shadow-inner">
        <canvas
          ref={canvasRef}
          className="h-56 w-full touch-none rounded-xl border border-dashed border-slate-300 bg-white"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onPointerLeave={stopDrawing}
        />
      </div>

      <input type="hidden" name={inputName} value={signatureDataUrl} />

      {hasSignature && (
        <input
          type="hidden"
          name={signedPeopleName}
          value={signedPeopleValue}
        />
      )}

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`text-sm font-semibold ${
            hasSignature ? "text-emerald-700" : "text-slate-500"
          }`}
        >
          {hasSignature
            ? "Signature captured."
            : "Use your finger, stylus, or mouse to sign inside the box."}
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
