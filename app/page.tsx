"use client";

import Image from "next/image";
import {
  ArrowDownToLine,
  Check,
  ChevronRight,
  CircleDashed,
  ImagePlus,
  Layers3,
  LockKeyhole,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type GenerationResult = {
  imageDataUrl?: string;
  summary: string;
  assetType: string;
  width?: number;
  height?: number;
  filename?: string;
};

const stages = [
  "Reading the reference",
  "Reconstructing the asset",
  "Cleaning edges and color",
  "Preparing final output",
];

const examplePrompts = [
  "Extract the central medallion as one reusable motif.",
  "Rebuild only the red floral elements with clean edges.",
  "Create a seamless repeat while preserving the original palette.",
];

export default function Home() {
  const [prompt, setPrompt] = useState(
    "Extract the primary motif as a clean, production-ready textile asset.",
  );
  const [accessCode, setAccessCode] = useState("");
  const [assetType, setAssetType] = useState("motif");
  const [aspectRatio, setAspectRatio] = useState("square");
  const [transparent, setTransparent] = useState(true);
  const [exactColor, setExactColor] = useState(true);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [workerOnline, setWorkerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((response) => response.json())
      .then((data: unknown) => {
        const health = data as { connected?: boolean };
        if (active) setWorkerOnline(Boolean(health.connected));
      })
      .catch(() => {
        if (active) setWorkerOnline(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status !== "running") return;
    const timer = window.setInterval(() => {
      setStage((current) => Math.min(current + 1, stages.length - 1));
    }, 3800);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const progress = useMemo(() => {
    if (status === "done") return 100;
    if (status === "running") return 18 + stage * 23;
    return 0;
  }, [stage, status]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Keep the reference image under 8 MB.");
      return;
    }
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setReferenceFile(file);
    setPreview(URL.createObjectURL(file));
    setError("");
    setResult(null);
    setStatus("idle");
  }

  function clearReference() {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setReferenceFile(null);
    setPreview(null);
    setResult(null);
    setStatus("idle");
  }

  async function fileToDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read the image."));
      reader.readAsDataURL(file);
    });
  }

  async function generate() {
    if (!referenceFile) {
      setError("Add a reference image before generating.");
      return;
    }
    if (!accessCode.trim()) {
      setError("Enter your private studio access code.");
      return;
    }
    if (prompt.trim().length < 12) {
      setError("Describe the asset you want in a little more detail.");
      return;
    }

    setError("");
    setResult(null);
    setStatus("running");
    setStage(0);

    try {
      const imageDataUrl = await fileToDataUrl(referenceFile);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-access-code": accessCode.trim(),
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          assetType,
          aspectRatio,
          transparent,
          exactColor,
          imageDataUrl,
          filename: referenceFile.name,
        }),
      });
      const data = (await response.json()) as GenerationResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "Generation failed.");
      setResult(data);
      setStage(stages.length - 1);
      setStatus("done");
      setWorkerOnline(true);
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    }
  }

  return (
    <main className="studio-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><Layers3 /></span>
          <div>
            <p className="brand-name">Emerald Atelier</p>
            <p className="brand-subtitle">Textile asset studio</p>
          </div>
        </div>
        <div className="status-cluster">
          <span className={`connection-dot ${workerOnline ? "online" : ""}`} />
          <span>{workerOnline === null ? "Checking agent" : workerOnline ? "Railway agent ready" : "Agent setup required"}</span>
        </div>
      </header>

      <section className="workspace">
        <aside className="control-panel glass-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">New generation</p>
              <h1>Create a production-ready asset</h1>
            </div>
            <span className="step-pill">01</span>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="reference-upload">Reference image</label>
            {preview ? (
              <div className="upload-preview">
                <Image src={preview} alt="Uploaded textile reference" fill unoptimized sizes="340px" />
                <button className="remove-upload" type="button" onClick={clearReference} aria-label="Remove reference image"><X /></button>
                <div className="upload-caption">
                  <span>{referenceFile?.name}</span>
                  <span>{referenceFile ? `${(referenceFile.size / 1024 / 1024).toFixed(1)} MB` : ""}</span>
                </div>
              </div>
            ) : (
              <label className="upload-zone" htmlFor="reference-upload">
                <span className="upload-icon"><ImagePlus /></span>
                <strong>Drop your textile image</strong>
                <span>PNG, JPG or WebP · up to 8 MB</span>
              </label>
            )}
            <input id="reference-upload" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="asset-prompt">What should the agent create?</label>
            <Textarea id="asset-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} className="prompt-area" maxLength={4000} />
            <div className="prompt-suggestions" aria-label="Prompt suggestions">
              {examplePrompts.map((example) => (
                <button type="button" key={example} onClick={() => setPrompt(example)}>{example.split(" ").slice(0, 4).join(" ")}…</button>
              ))}
            </div>
          </div>

          <div className="dual-fields">
            <div className="field-group">
              <label className="field-label">Asset type</label>
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger className="premium-select" aria-label="Asset type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="motif">Single motif</SelectItem>
                  <SelectItem value="motif-sheet">Motif sheet</SelectItem>
                  <SelectItem value="seamless-repeat">Seamless repeat</SelectItem>
                  <SelectItem value="background">Background only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="field-group">
              <label className="field-label">Canvas</label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger className="premium-select" aria-label="Canvas ratio"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">1:1 square</SelectItem>
                  <SelectItem value="portrait">4:5 portrait</SelectItem>
                  <SelectItem value="vertical">9:16 vertical</SelectItem>
                  <SelectItem value="landscape">4:3 landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="preference-card">
            <label>
              <span><strong>Transparent background</strong><small>Isolate the reusable asset</small></span>
              <Switch checked={transparent} onCheckedChange={setTransparent} />
            </label>
            <label>
              <span><strong>Strict color fidelity</strong><small>Match the source palette</small></span>
              <Switch checked={exactColor} onCheckedChange={setExactColor} />
            </label>
          </div>

          <div className="access-row">
            <LockKeyhole />
            <input type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="Private studio access code" aria-label="Private studio access code" autoComplete="current-password" />
          </div>

          {error ? <p className="error-message" role="alert">{error}</p> : null}

          <Button className="generate-button" size="lg" onClick={generate} disabled={status === "running"}>
            {status === "running" ? <CircleDashed className="spin" /> : <WandSparkles />}
            {status === "running" ? "Crafting asset" : "Generate asset"}
            {status !== "running" ? <ChevronRight /> : null}
          </Button>
          <p className="privacy-note"><LockKeyhole /> Your prompt and expert rules stay server-side.</p>
        </aside>

        <section className="canvas-panel glass-panel">
          <div className="canvas-toolbar">
            <div>
              <p className="eyebrow">Output canvas</p>
              <h2>{status === "done" ? "Asset complete" : "Your result will appear here"}</h2>
            </div>
            <div className="quality-badges"><span>300 DPI workflow</span><span>PNG</span></div>
          </div>

          <div className={`canvas-stage ${status}`}>
            {status === "idle" || status === "error" ? (
              <div className="empty-canvas">
                <div className="motif-ghost motif-a" />
                <div className="motif-ghost motif-b" />
                <div className="motif-ghost motif-c" />
                <span className="empty-icon"><Sparkles /></span>
                <h3>From reference to reusable asset</h3>
                <p>Add an image, describe the extraction, and let the agent handle reconstruction, cleanup and output preparation.</p>
              </div>
            ) : null}

            {status === "running" ? (
              <div className="processing-state">
                <div className="scan-preview">
                  {preview ? <Image src={preview} alt="Reference being processed" fill unoptimized sizes="600px" /> : null}
                  <span className="scan-line" />
                  <div className="scan-overlay" />
                </div>
                <div className="processing-copy">
                  <span className="processing-orbit"><WandSparkles /></span>
                  <p className="eyebrow">Codex agent</p>
                  <h3>{stages[stage]}</h3>
                  <Progress value={progress} className="agent-progress" />
                  <div className="stage-list">
                    {stages.map((item, index) => (
                      <span key={item} className={index <= stage ? "active" : ""}>
                        {index < stage ? <Check /> : <span>{index + 1}</span>}{item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {status === "done" && result ? (
              <div className="result-state">
                <div className="result-image checkerboard">
                  {result.imageDataUrl ? (
                    <Image src={result.imageDataUrl} alt="Generated textile asset" fill unoptimized sizes="700px" />
                  ) : (
                    <div className="result-fallback"><Sparkles /><span>The agent completed the brief without returning an image file.</span></div>
                  )}
                </div>
                <div className="result-meta">
                  <div><span className="success-icon"><Check /></span><div><strong>{result.filename || "textile-asset.png"}</strong><small>{result.summary}</small></div></div>
                  {result.imageDataUrl ? (
                    <a className="download-button" href={result.imageDataUrl} download={result.filename || "textile-asset.png"}><ArrowDownToLine /> Download</a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <footer className="canvas-footer">
            <span><span className="mini-dot" /> Agent-enhanced brief</span>
            <span>Reference-aware · Color-controlled · Reusable output</span>
          </footer>
        </section>
      </section>
    </main>
  );
}
