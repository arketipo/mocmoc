import { useState } from "react";
import { Download, Loader2, Sparkles, Wand2 } from "lucide-react";
import { ImageDropzone } from "@/components/ImageDropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fileToDataUrl } from "@/lib/image-utils";

export function MockupGenerator() {
  const [product, setProduct] = useState<{ preview: string; file: File } | null>(null);
  const [label, setLabel] = useState<{ preview: string; file: File } | null>(null);
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
      const [productImage, labelImage] = await Promise.all([
        fileToDataUrl(product.file),
        fileToDataUrl(label.file),
      ]);

      const res = await fetch("/api/fuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productImage, labelImage, prompt }),
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
        <div className="grid gap-5 sm:grid-cols-2">
          <ImageDropzone
            label="Producto"
            hint="la base"
            value={product?.preview ?? null}
            onChange={(preview, file) =>
              setProduct(preview && file ? { preview, file } : null)
            }
          />
          <ImageDropzone
            label="Etiqueta"
            hint="el diseño"
            value={label?.preview ?? null}
            onChange={(preview, file) => setLabel(preview && file ? { preview, file } : null)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="prompt" className="text-sm font-semibold text-foreground">
            Instrucciones <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: etiqueta centrada, iluminación de estudio, fondo blanco minimalista"
            className="min-h-24 resize-none rounded-xl"
            maxLength={600}
          />
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