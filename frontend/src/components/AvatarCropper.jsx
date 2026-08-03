import { useEffect, useRef, useState } from "react";

const CONTAINER_SIZE = 220; // Vorschau-Kreis in Pixel
const OUTPUT_SIZE = 200; // Aufloesung des gespeicherten, komprimierten Bilds

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Modal zum Hochladen/Zuschneiden eines Profilbilds: per Drag verschieben,
// per Slider zoomen, Ergebnis wird auf ein kleines, rundes Bild komprimiert.
export default function AvatarCropper({ imageSrc, onConfirm, onCancel }) {
  const imgRef = useRef(null);
  const dragState = useRef(null);

  const [natural, setNatural] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function baseScaleFor(w, h) {
    return Math.max(CONTAINER_SIZE / w, CONTAINER_SIZE / h);
  }

  function displaySizeFor(w, h, z) {
    const base = baseScaleFor(w, h);
    return { w: w * base * z, h: h * base * z };
  }

  function handleImageLoad(e) {
    const w = e.target.naturalWidth;
    const h = e.target.naturalHeight;
    setNatural({ w, h });
    const { w: dw, h: dh } = displaySizeFor(w, h, 1);
    setOffset({ x: (CONTAINER_SIZE - dw) / 2, y: (CONTAINER_SIZE - dh) / 2 });
    setZoom(1);
  }

  function handleZoomChange(newZoom) {
    if (!natural) return;
    const { w: dw, h: dh } = displaySizeFor(natural.w, natural.h, newZoom);
    setZoom(newZoom);
    setOffset((prev) => ({
      x: clamp(prev.x, CONTAINER_SIZE - dw, 0),
      y: clamp(prev.y, CONTAINER_SIZE - dh, 0),
    }));
  }

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, offsetX: offset.x, offsetY: offset.y };
  }

  function handlePointerMove(e) {
    if (!dragState.current || !natural) return;
    const { w: dw, h: dh } = displaySizeFor(natural.w, natural.h, zoom);
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset({
      x: clamp(dragState.current.offsetX + dx, CONTAINER_SIZE - dw, 0),
      y: clamp(dragState.current.offsetY + dy, CONTAINER_SIZE - dh, 0),
    });
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  function handleConfirm() {
    if (!natural) return;
    const ratio = OUTPUT_SIZE / CONTAINER_SIZE;
    const { w: dw, h: dh } = displaySizeFor(natural.w, natural.h, zoom);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(imgRef.current, offset.x * ratio, offset.y * ratio, dw * ratio, dh * ratio);
    onConfirm(canvas.toDataURL("image/jpeg", 0.85));
  }

  return (
    <div className="cropper-overlay">
      <div className="cropper-box">
        <h4>Bildausschnitt waehlen</h4>
        <div
          className="cropper-viewport"
          style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            onLoad={handleImageLoad}
            draggable={false}
            alt=""
            style={
              natural
                ? {
                    width: displaySizeFor(natural.w, natural.h, zoom).w,
                    height: displaySizeFor(natural.w, natural.h, zoom).h,
                    left: offset.x,
                    top: offset.y,
                  }
                : { opacity: 0 }
            }
          />
        </div>
        <input
          type="range"
          min="1"
          max="3"
          step="0.05"
          value={zoom}
          onChange={(e) => handleZoomChange(Number(e.target.value))}
          className="cropper-zoom"
        />
        <div className="add-card-actions cropper-actions">
          <button type="button" onClick={handleConfirm}>
            Uebernehmen
          </button>
          <button type="button" onClick={onCancel}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
