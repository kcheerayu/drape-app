"use client";

import { useState } from "react";
import type { GarmentCategory } from "@/types";

const CATEGORIES = [
  { value: "upper_body", label: "Top" },
  { value: "lower_body", label: "Bottom" },
  { value: "dresses", label: "Dress" },
] as const;

export default function Home() {
  const [personImage, setPersonImage] = useState<File | null>(null);
  const [personImagePreview, setPersonImagePreview] = useState<string | null>(null);
  const [garmentUrl, setGarmentUrl] = useState("");
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
  const [garmentError, setGarmentError] = useState<string | null>(null);
  const [garmentCategory, setGarmentCategory] = useState<GarmentCategory>("upper_body");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [debugMsg, setDebugMsg] = useState<string | null>(null);

  const canGenerate = !!(personImage && garmentPreview && !isGenerating);

  function handlePersonImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPersonImage(file);
    setPersonImagePreview(URL.createObjectURL(file));
    setResultUrl(null);
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setPersonImage(file);
    setPersonImagePreview(URL.createObjectURL(file));
    setResultUrl(null);
    setError(null);
  }

  function handleLoadGarment() {
    setGarmentError(null);
    if (!garmentUrl.trim()) { setGarmentError("Please paste an image URL."); return; }
    if (!garmentUrl.startsWith("http")) { setGarmentError("URL must start with http."); return; }
    setGarmentPreview(garmentUrl.trim());
    setResultUrl(null);
    setError(null);
  }

  async function handleGenerate() {
    if (!personImage || !garmentPreview) return;
    setIsGenerating(true);
    setError(null);
    setResultUrl(null);
    setElapsed(0);
    setDebugMsg(null);

    try {
      // Step 1: Get presigned URL
      setDebugMsg("Getting upload URL...");
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: personImage.name, contentType: personImage.type }),
      });
      if (!presignRes.ok) throw new Error(`Presign failed: ${presignRes.status}`);
      const { uploadUrl, publicUrl } = await presignRes.json();

      // Step 2: Upload to R2
      setDebugMsg("Uploading photo...");
      const uploadResult = await fetch(uploadUrl, {
        method: "PUT",
        body: personImage,
        headers: { "Content-Type": personImage.type },
      });
      if (!uploadResult.ok) throw new Error(`Upload failed: ${uploadResult.status}`);

      // Step 3: Create try-on job
      setDebugMsg("Starting AI generation...");
      const jobRes = await fetch("/api/tryon/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personImageUrl: publicUrl,
          garmentImageUrl: garmentPreview,
          garmentCategory,
        }),
      });
      if (!jobRes.ok) throw new Error(`Job creation failed: ${jobRes.status}`);
      const { jobId: newJobId } = await jobRes.json();

      // Step 4: Poll for result
      setDebugMsg("Waiting for result...");
      let seconds = 0;
      const interval = setInterval(async () => {
        seconds += 3;
        setElapsed(seconds);
        const statusRes = await fetch(`/api/tryon/${newJobId}`);
        const status = await statusRes.json();
        if (status.status === "succeeded" && status.outputUrl) {
          clearInterval(interval);
          setResultUrl(status.outputUrl);
          setIsGenerating(false);
          setDebugMsg(null);
        } else if (status.status === "failed") {
          clearInterval(interval);
          setError(status.error ?? "Generation failed. Please try again.");
          setIsGenerating(false);
          setDebugMsg(null);
        }
      }, 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setIsGenerating(false);
      setDebugMsg(null);
    }
  }
  return (
    <main style={{ background: "var(--cream-pale)", minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--border)", background: "rgba(250,248,244,0.92)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "Cormorant Garamond, serif", color: "var(--cream)", fontSize: 17, fontStyle: "italic" }}>D</span>
            </div>
            <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, letterSpacing: "0.1em" }}>DRAPE</span>
          </div>
          <span style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--ink-muted)", textTransform: "uppercase", opacity: 0.6 }}>Virtual Try-On · Beta</span>
        </div>
      </header>

      <div style={{ textAlign: "center", padding: "72px 32px 56px" }}>
        <p style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 20 }}>AI-Powered Fashion</p>
        <h1 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 64, fontWeight: 300, lineHeight: 1.1, marginBottom: 20 }}>
          See it on you,<br /><em>before you buy.</em>
        </h1>
        <p style={{ color: "var(--ink-muted)", fontSize: 16, fontWeight: 300, maxWidth: 480, margin: "0 auto" }}>
          Upload your photo, paste any clothing image link, and see yourself wearing it in seconds.
        </p>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 32px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 40 }}>

          {/* Column 1: Your Photo */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, color: "var(--cream)", fontWeight: 500 }}>1</span>
              </div>
              <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-muted)" }}>Your Photo</p>
            </div>
            <label className="upload-zone" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 4, padding: 24, textAlign: "center", background: "var(--cream-warm)", minHeight: 320, cursor: "pointer" }} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
              <input type="file" accept="image/*" onChange={handlePersonImageChange} style={{ display: "none" }} />
              {personImagePreview ? (
                <img src={personImagePreview} alt="Your photo" style={{ width: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 2 }} />
              ) : (
                <div style={{ opacity: 0.5 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>↑</div>
                  <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 6 }}>Click or drag photo here</p>
                  <p style={{ fontSize: 11, color: "var(--ink-muted)" }}>Full body works best</p>
                </div>
              )}
            </label>
            {personImagePreview && (
              <button onClick={() => { setPersonImage(null); setPersonImagePreview(null); }} style={{ marginTop: 8, fontSize: 11, color: "var(--ink-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0, opacity: 0.6 }}>Remove photo</button>
            )}
          </div>

          {/* Column 2: Garment */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 11, color: "var(--cream)", fontWeight: 500 }}>2</span>
              </div>
              <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-muted)" }}>Garment Image</p>
            </div>
            <div style={{ background: "var(--cream-warm)", borderRadius: 4, padding: 20, minHeight: 320, display: "flex", flexDirection: "column", border: "1px solid var(--border)" }}>
              {garmentPreview ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <img src={garmentPreview} alt="Garment" onError={() => { setGarmentError("Could not load image. Try saving and re-uploading."); setGarmentPreview(null); }} style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 2, marginBottom: 12 }} />
                  <p style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 8 }}>✓ Image loaded</p>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                    {CATEGORIES.map(cat => (
                      <button key={cat.value} onClick={() => setGarmentCategory(cat.value as GarmentCategory)} style={{ padding: "4px 12px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", border: "1px solid var(--border-strong)", background: garmentCategory === cat.value ? "var(--ink)" : "transparent", color: garmentCategory === cat.value ? "var(--cream)" : "var(--ink)", cursor: "pointer", borderRadius: 2 }}>{cat.label}</button>
                    ))}
                  </div>
                  <button onClick={() => { setGarmentPreview(null); setGarmentUrl(""); }} style={{ fontSize: 11, color: "var(--ink-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0, opacity: 0.6 }}>Change image</button>
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <p style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 12, lineHeight: 1.6 }}>Find any clothing item online, right-click the image → <strong>"Copy Image Address"</strong> → paste below.</p>
                  <p style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 16, opacity: 0.6 }}>✓ Works with: ASOS, Unsplash<br />✗ May not work with: Zara, H&M, Nike</p>
                  <input type="text" value={garmentUrl} onChange={(e) => setGarmentUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLoadGarment()} placeholder="https://..." style={{ width: "100%", padding: "10px 12px", fontSize: 12, border: "1px solid var(--border-strong)", background: "var(--cream-pale)", borderRadius: 2, outline: "none", fontFamily: "DM Sans, sans-serif", marginBottom: 8, boxSizing: "border-box" }} />
                  {garmentError && <p style={{ fontSize: 11, color: "#C1440E", marginBottom: 8 }}>{garmentError}</p>}
                  <button onClick={handleLoadGarment} style={{ width: "100%", padding: "10px", background: "var(--ink)", color: "var(--cream)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", border: "none", borderRadius: 2, cursor: "pointer" }}>Load Image</button>
                  <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                    {CATEGORIES.map(cat => (
                      <button key={cat.value} onClick={() => setGarmentCategory(cat.value as GarmentCategory)} style={{ flex: 1, padding: "6px 4px", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", border: "1px solid var(--border-strong)", background: garmentCategory === cat.value ? "var(--accent)" : "transparent", color: garmentCategory === cat.value ? "var(--cream)" : "var(--ink)", cursor: "pointer", borderRadius: 2 }}>{cat.label}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Column 3: Result */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: resultUrl ? "var(--accent)" : "var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                <span style={{ fontSize: 11, color: "var(--cream)", fontWeight: 500 }}>3</span>
              </div>
              <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-muted)" }}>Your Result</p>
            </div>
            <div style={{ border: "1.5px dashed var(--border-strong)", borderRadius: 4, padding: 24, textAlign: "center", background: resultUrl ? "var(--cream-warm)" : "transparent", minHeight: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transition: "all 0.4s" }}>
              {isGenerating ? (
                <div style={{ width: "100%" }}>
                  <div style={{ fontSize: 28, marginBottom: 16 }}>✦</div>
                  <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 6 }}>{debugMsg ?? "Generating..."}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-muted)", opacity: 0.5, marginBottom: 16 }}>{elapsed}s elapsed</p>
                  <div className="progress-bar" style={{ borderRadius: 1 }} />
                </div>
              ) : resultUrl ? (
                <div style={{ width: "100%" }}>
                  <img src={resultUrl} alt="Try-on result" style={{ width: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 2, marginBottom: 12 }} />
                  <a href={resultUrl} download="drape-result.jpg" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "10px 28px", background: "var(--ink)", color: "var(--cream)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none", borderRadius: 2, marginBottom: 8 }}>Download</a>
                  <br />
                  <button onClick={() => { setResultUrl(null); setError(null); }} style={{ fontSize: 11, color: "var(--ink-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0, opacity: 0.6, marginTop: 4 }}>Try again</button>
                </div>
              ) : error ? (
                <div>
                  <p style={{ fontSize: 13, color: "#C1440E", marginBottom: 12 }}>{error}</p>
                  <button onClick={() => setError(null)} style={{ fontSize: 11, color: "var(--ink-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Try again</button>
                </div>
              ) : (
                <div style={{ opacity: 0.35 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✦</div>
                  <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>Your result will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Generate button */}
        <div style={{ textAlign: "center" }}>
          <button onClick={handleGenerate} disabled={!canGenerate} style={{ padding: "18px 64px", background: canGenerate ? "var(--ink)" : "var(--border-strong)", color: "var(--cream)", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", border: "none", borderRadius: 2, cursor: canGenerate ? "pointer" : "not-allowed", transition: "all 0.25s", fontFamily: "DM Sans, sans-serif" }}>
            {isGenerating ? `Generating... ${elapsed}s` : "Generate Try-On"}
          </button>
          {!canGenerate && !isGenerating && (
            <p style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 12, opacity: 0.5 }}>
              {!personImage && !garmentPreview ? "Upload your photo and add a garment to continue" :
               !personImage ? "Upload your photo to continue" :
               "Add a garment image to continue"}
            </p>
          )}
        </div>

        {/* Tips */}
        <div style={{ marginTop: 64, padding: 32, background: "var(--cream-warm)", borderRadius: 4, border: "1px solid var(--border)" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: 20, textAlign: "center" }}>Tips for best results</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Your photo</p>
              <p style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.7 }}>Stand straight, face forward, full body visible, plain background, good lighting.</p>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Garment image</p>
              <p style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.7 }}>Use clean product photos on white background. Avoid lifestyle shots with models.</p>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Getting image links</p>
              <p style={{ fontSize: 12, color: "var(--ink-muted)", lineHeight: 1.7 }}>Right-click any product image → "Copy Image Address". Works best with ASOS.</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}