import { Camera, LockKeyhole, Upload } from "lucide-react";

/** The studio before a photo is loaded: take one, upload one, use the sample or open a project. */
export function Intake({
  documentName,
  canCamera,
  dragging,
  busy,
  onChoose,
  onCamera,
  onSample,
  onOpenProject,
}: {
  documentName: string;
  canCamera: boolean;
  dragging: boolean;
  busy: boolean;
  onChoose(): void;
  onCamera(): void;
  onSample(): void;
  onOpenProject(): void;
}) {
  return (
    <section className={`intake${dragging ? " dragging" : ""}`} aria-label="Add your photo">
      <div className="label">Photo</div>
      <h2 className="serif">Add your photo</h2>
      <p className="intake-lede">
        For {documentName}. Take one now or upload one you already have.
      </p>
      <div className="intake-actions">
        {canCamera && (
          <button className="primary" data-camera-opener disabled={busy} onClick={onCamera}>
            <Camera size={18} aria-hidden="true" /> Take photo
          </button>
        )}
        <button className={canCamera ? "secondary" : "primary"} disabled={busy} onClick={onChoose}>
          <Upload size={18} aria-hidden="true" /> Upload a photo
        </button>
      </div>
      <p className="fine-print">
        JPG, PNG or WebP, up to 20 MB. You can also drop a photo here or paste one.
      </p>
      <p className="intake-extra">
        <button className="text-button" disabled={busy} onClick={onSample}>
          Try a sample
        </button>
        <span aria-hidden="true">·</span>
        <button className="text-button" disabled={busy} onClick={onOpenProject}>
          Open a project
        </button>
      </p>
      <p className="intake-privacy">
        <LockKeyhole size={14} aria-hidden="true" /> Your photo never leaves your device.
      </p>
      <p className="intake-tip">
        Ask someone to take it, or use a tripod and a timer. Selfies at arm&rsquo;s length distort
        faces, and the US passport rules do not accept them.
      </p>
    </section>
  );
}
