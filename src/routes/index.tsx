import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Upload, Wand2, Image as ImageIcon } from "lucide-react";
import { MockupGenerator } from "@/components/MockupGenerator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mokizador — Generador de mockups con IA" },
      {
        name: "description",
        content:
          "Sube la foto de tu producto y tu etiqueta, y la IA las fusiona en un mockup fotorrealista listo para descargar.",
      },
      { property: "og:title", content: "Mokizador — Generador de mockups con IA" },
      {
        property: "og:description",
        content: "Fusiona producto y etiqueta en un mockup fotorrealista en segundos.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-gradient-subtle">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <header className="mb-12 flex flex-col items-center gap-5 text-center animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Mockups con IA · Nano Banana
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            <span className="text-gradient-primary">Mokizador</span>
          </h1>
          <p className="max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            Sube la foto de tu producto y tu etiqueta. La IA las fusiona en un mockup
            fotorrealista, listo para descargar.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-primary" /> Sube 2 fotos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wand2 className="h-3.5 w-3.5 text-primary" /> La IA fusiona
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-primary" /> Descarga el mockup
            </span>
          </div>
        </header>

        <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <MockupGenerator />
        </div>

        <footer className="mt-14 text-center text-xs text-muted-foreground">
          Hecho con Mokizador · Tus imágenes se procesan solo para generar tu mockup.
        </footer>
      </div>
    </main>
  );
}
