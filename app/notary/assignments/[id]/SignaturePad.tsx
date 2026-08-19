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
  const signatureDataRef = useRef(defaultValue ?? "");
  const lastCanvasSizeRef = useRef({ width: 0, height: 0 });

  const [signatureData, setSignatureData] = useState(defaultValue ?? "");
  const [hasSignature, setHasSignature] = useState(Boolean(defaultValue));

  function configureContext(
    canvas: HTMLCanvasElement,
    ratio: number,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#0f172a";

    return ctx;
  }

  function resizeCanvas() {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;

    if (!canvas || !wrapper) return;

    const canvasRect = canvas.getBoundingClientRect();
    const width = Math.floor(canvasRect.width);
    const height = 220;

    // When the journal modal is hidden, the canvas can report a width of 0.
    // Do not initialize it until the modal is actually visible.
    if (width <= 0) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    const targetPixelWidth = Math.floor(width * ratio);
    const targetPixelHeight = Math.floor(height * ratio);

    const previousSize = lastCanvasSizeRef.current;

    if (
      canvas.width === targetPixelWidth &&
      canvas.height === targetPixelHeight &&
      previousSize.width === width &&
      previousSize.height === height
    ) {
      return;
    }

    canvas.width = targetPixelWidth;
    canvas.height = targetPixelHeight;
    canvas.style.width = "100%";
    canvas.style.height = `${height}px`;

    lastCanvasSizeRef.current = {
      width,
      height,
    };

    const ctx = configureContext(canvas, ratio);
    if (!ctx) return;

    const savedSignature = signatureDataRef.current;

    if (savedSignature?.startsWith("data:image/")) {
      const img = new Image();

      img.onload = () => {
        const currentCanvas = canvasRef.current;
        if (!currentCanvas) return;

        const currentRatio = Math.max(window.devicePixelRatio || 1, 1);
        const currentCtx = configureContext(currentCanvas, currentRatio);
        if (!currentCtx) return;

        const currentRect = currentCanvas.getBoundingClientRect();
        currentCtx.clearRect(0, 0, currentRect.width, height);
        currentCtx.drawImage(img, 0, 0, currentRect.width, height);
      };

      img.src = savedSignature;
    }
  }

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let animationFrame = 0;

    const scheduleResize = () => {
      window.cancelAnimationFrame(animationFrame);

      animationFrame = window.requestAnimationFrame(() => {
        resizeCanvas();
      });
    };

    // This is the important fix for a canvas inside a hidden modal.
    // It fires again when the modal becomes visible and receives a real width.
    const resizeObserver = new ResizeObserver(() => {
      scheduleResize();
    });

    resizeObserver.observe(wrapper);

    window.addEventListener("resize", scheduleResize);
    scheduleResize();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleResize);
    };
  }, []);

  useEffect(() => {
    signatureDataRef.current = signatureData;
  }, [signatureData]);

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
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return;

    const dataUrl = canvas.toDataURL("image/png");

    signatureDataRef.current = dataUrl;
    setSignatureData(dataUrl);
    setHasSignature(true);
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();

    const canvas = canvasRef.current;
    const point = getPoint(event);

    if (!canvas || !point || canvas.width <= 0 || canvas.height <= 0) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers can throw if pointer capture is unavailable.
    }

    isDrawingRef.current = true;
    lastPointRef.current = point;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);

    // Draw a tiny dot so a simple tap is still recorded.
    ctx.lineTo(point.x + 0.01, point.y + 0.01);
    ctx.stroke();
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

    if (canvas) {
      try {
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Ignore browsers that do not support pointer capture cleanly.
      }
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

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    signatureDataRef.current = "";
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
            width: "100%",
            height: "220px",
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          onLostPointerCapture={stopDrawing}
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
