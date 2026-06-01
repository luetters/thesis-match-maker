import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface AvatarCropModalProps {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

export function AvatarCropModal({
  open,
  imageSrc,
  onClose,
  onCropComplete,
}: AvatarCropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state when modal opens with new image
  useEffect(() => {
    if (open && imageSrc) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      setScale(1);
    }
  }, [open, imageSrc]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    const image = imgRef.current;
    if (!image || !completedCrop) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Ausgabegröße: 400×400 px für Profilbilder
    const outputSize = 400;
    canvas.width = outputSize;
    canvas.height = outputSize;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      outputSize,
      outputSize,
    );

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });
  }, [completedCrop]);

  const handleConfirm = useCallback(async () => {
    const blob = await getCroppedImg();
    if (blob) {
      onCropComplete(blob);
    }
  }, [getCroppedImg, onCropComplete]);

  const handleReset = useCallback(() => {
    setScale(1);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, 1));
    }
  }, []);

  if (!imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Profilfoto zuschneiden</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Crop-Bereich */}
          <div className="flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden min-h-[280px]">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              circularCrop
              minWidth={60}
              minHeight={60}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Zuschneiden"
                onLoad={onImageLoad}
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "center",
                  maxHeight: "320px",
                  maxWidth: "100%",
                  objectFit: "contain",
                }}
              />
            </ReactCrop>
          </div>

          {/* Zoom-Slider */}
          <div className="flex items-center gap-3 px-1">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Verkleinern"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <Slider
              min={50}
              max={300}
              step={5}
              value={[Math.round(scale * 100)]}
              onValueChange={([v]) => setScale(v / 100)}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(3, s + 0.1))}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Vergrößern"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 w-10 text-right">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-gray-500 hover:text-gray-700 transition-colors ml-1"
              aria-label="Zurücksetzen"
              title="Zurücksetzen"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Ziehen Sie den Rahmen, um den Ausschnitt anzupassen. Das Bild wird als Kreis angezeigt.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!completedCrop?.width || !completedCrop?.height}
            className="bg-primary text-primary-foreground"
          >
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
