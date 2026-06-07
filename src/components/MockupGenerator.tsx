import { useState } from "react";
import {
  Camera,
  ChevronDown,
  Download,
  Frame,
  Loader2,
  Lock,
  Sparkles,
  Sun,
  Wand2,
} from "lucide-react";
import { ImageDropzone } from "@/components/ImageDropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { fileToDataUrl } from "@/lib/image-utils";

/** Disabled, "coming soon" select-style placeholder. */
function SoonField({
  icon: Icon,
  label,
  placeholder,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </span>
      <div
        aria-disabled
        className="flex h-9 cursor-not-allowed items-center justify-between rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground opacity-70"
      >
        <span className="truncate">{placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>
    </div>
  );
}

export function MockupGenerator() {
  const [product, setProduct] = useState<{ preview: string; file: File } | null>(null);
  const [label, setLabel] = useState<{ preview: string; file: File } | null>(null);
  const [background, setBackground] = useState<{ preview: string; file: File } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = !!product && !!label && !loading;

  async function generate() {
    if (!product || !label) return;
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
        body: JSON.stringify({ productImage, labelImage, backgroundImage }),
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

        {/* Prepared controls — not active yet */}
        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ajustes avanzados
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
              <Lock className="h-3 w-3" /> Próximamente
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SoonField icon={Sun} label="Iluminación" placeholder="Estudio suave" />
            <SoonField icon={Frame} label="Formato" placeholder="1:1 cuadrado" />
            <SoonField icon={Camera} label="Cámara" placeholder="Ángulo / focal" />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground">Prompt descriptivo</span>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled
              placeholder="Ej: etiqueta centrada, iluminación de estudio, fondo blanco minimalista…"
              className="min-h-20 cursor-not-allowed resize-none rounded-xl bg-muted/50 opacity-70"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">Seed</span>
              <span className="text-xs text-muted-foreground">
                Mantiene la consistencia entre imágenes
              </span>
            </div>
            <Switch disabled aria-label="Seed (próximamente)" />
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