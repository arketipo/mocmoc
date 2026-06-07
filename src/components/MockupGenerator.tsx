import { useState } from "react";
import {
  Camera,
  Download,
  Frame,
  Loader2,
  Lock,
  Sparkles,
  Sun,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImageDropzone } from "@/components/ImageDropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fileToDataUrl } from "@/lib/image-utils";

const LIGHTING_OPTIONS = [
  { value: "soft-studio", label: "Estudio suave" },
  { value: "natural", label: "Luz natural" },
  { value: "dramatic", label: "Dramática / contraste" },
  { value: "warm", label: "Cálida dorada" },
  { value: "cool", label: "Fría / azulada" },
] as const;

const FORMAT_OPTIONS = [
  { value: "1:1", label: "1:1 cuadrado" },
  { value: "4:5", label: "4:5 vertical" },
  { value: "16:9", label: "16:9 horizontal" },
  { value: "9:16", label: "9:16 story" },
] as const;

const MODEL_OPTIONS = [
  { value: "nano-banana-2", label: "Nano Banana 2" },
  { value: "gpt-image-2", label: "GPT Image 2", disabled: true, badge: "Pro" },
];

const CAMERA_OPTIONS = [
  { value: "front", label: "Frontal" },
  { value: "three-quarter", label: "Ángulo 3/4" },
  { value: "top-down", label: "Cenital (top-down)" },
  { value: "macro", label: "Macro / detalle" },
  { value: "wide", label: "Gran angular" },
] as const;

/** Active select-style field tied to the API request. */
function SelectField({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  options,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 rounded-lg">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function MockupGenerator() {
  const [product, setProduct] = useState<{ preview: string; file: File } | null>(null);
  const [label, setLabel] = useState<{ preview: string; file: File } | null>(null);
  const [background, setBackground] = useState<{ preview: string; file: File } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [lighting, setLighting] = useState("");
  const [format, setFormat] = useState("");
  const [camera, setCamera] = useState("");
  const [model, setModel] = useState("nano-banana-2");
  const [seedOn, setSeedOn] = useState(false);
  const [seed, setSeed] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = !!product && !!label && !loading;

  function toggleSeed(on: boolean) {
    setSeedOn(on);
    if (on) {
      // Lock in a stable seed that persists until the toggle is turned off.
      setSeed((prev) => prev ?? Math.floor(Math.random() * 1_000_000));
    } else {
      setSeed(null);
    }
  }

  async function generate() {
    if (!product || !label) return;
    // When the seed is locked, reuse the previous render as a reference so the
    // model keeps the exact same composition/size and only changes the chosen
    // parameter (lighting, camera, etc.).
    const referenceImage = seedOn ? result : null;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const [productImage, labelImage, backgroundImage] = await Promise.all([
        fileToDataUrl(product.file),
        fileToDataUrl(label.file),
        background ? fileToDataUrl(background.file) : Promise.resolve(undefined),
      ]);

      const res = await fetch("/api/fuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productImage,
          labelImage,
          backgroundImage,
          prompt,
          lighting,
          format,
          camera,
          model,
          seed: seedOn ? seed : undefined,
          referenceImage: referenceImage ?? undefined,
        }),
      });
      const data = (await res.json()) as { image?: string; error?: string };
      if (!res.ok || !data.image) {
        throw new Error(data.error ?? "No se pudo generar el mockup.");
      }
      setResult(data.image);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Inputs */}
      <div className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="grid grid-cols-3 gap-3">
          <ImageDropzone
            label="Producto"
            hint="base"
            value={product?.preview ?? null}
            onChange={(preview, file) =>
              setProduct(preview && file ? { preview, file } : null)
            }
          />
          <ImageDropzone
            label="Etiqueta"
            hint="diseño"
            value={label?.preview ?? null}
            onChange={(preview, file) => setLabel(preview && file ? { preview, file } : null)}
          />
          <ImageDropzone
            label="Fondo"
            hint="opcional"
            value={background?.preview ?? null}
            onChange={(preview, file) =>
              setBackground(preview && file ? { preview, file } : null)
            }
          />
        </div>

        {/* Advanced controls — active */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/30 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ajustes avanzados
          </span>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Modelo de IA
              </span>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder="Elige modelo" />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((o) => (
                    <SelectItem
                      key={o.value}
                      value={o.value}
                      disabled={o.disabled}
                      className={o.disabled ? "opacity-50" : ""}
                    >
                      <span className="flex items-center gap-2">
                        {o.label}
                        {o.badge && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                            {o.badge}
                          </Badge>
                        )}
                        {o.disabled && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField
              icon={Sun}
              label="Iluminación"
              placeholder="Elige"
              value={lighting}
              onChange={setLighting}
              options={LIGHTING_OPTIONS}
            />
            <SelectField
              icon={Frame}
              label="Formato"
              placeholder="Elige"
              value={format}
              onChange={setFormat}
              options={FORMAT_OPTIONS}
            />
            <SelectField
              icon={Camera}
              label="Cámara"
              placeholder="Elige"
              value={camera}
              onChange={setCamera}
              options={CAMERA_OPTIONS}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground">Prompt descriptivo</span>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: etiqueta centrada, iluminación de estudio, fondo blanco minimalista…"
              className="min-h-20 resize-none rounded-xl"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">Seed</span>
              <span className="text-xs text-muted-foreground">
                {seedOn && seed != null
                  ? `Fijado (#${seed}) — mantiene la consistencia entre imágenes`
                  : "Mantiene la consistencia entre imágenes"}
              </span>
            </div>
            <Switch checked={seedOn} onCheckedChange={toggleSeed} aria-label="Seed" />
          </div>
        </div>

        <Button
          size="lg"
          disabled={!canGenerate}
          onClick={generate}
          className="h-12 rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground shadow-elegant transition-transform hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Fusionando…
            </>
          ) : (
            <>
              <Wand2 className="h-5 w-5" /> Generar mockup
            </>
          )}
        </Button>
        <p className="-mt-2 text-center text-xs text-muted-foreground">
          Arrastra el producto y la etiqueta para empezar.
        </p>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Output */}
      <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" /> Resultado
        </div>
        <div className="relative flex min-h-[20rem] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border bg-gradient-subtle">
          {loading && (
            <div className="absolute inset-0 animate-shimmer" aria-hidden />
          )}
          {result ? (
            <img src={result} alt="Mockup generado" className="h-full w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 px-8 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 text-primary/40" />
              <p className="text-sm">
                {loading
                  ? "Creando tu mockup con IA…"
                  : "Tu mockup aparecerá aquí."}
              </p>
            </div>
          )}
        </div>

        {result && (
          <a href={result} download="mockup-mokizador.png">
            <Button variant="outline" size="lg" className="h-11 w-full rounded-xl">
              <Download className="h-5 w-5" /> Descargar mockup
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}