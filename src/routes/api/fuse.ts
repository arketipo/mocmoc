import { createFileRoute } from "@tanstack/react-router";

interface FuseBody {
  productImage: string; // data URL
  labelImage: string; // data URL
  prompt?: string;
}

function isDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/") && value.length < 15_000_000;
}

export const Route = createFileRoute("/api/fuse")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return Response.json({ error: "Falta la configuración de IA." }, { status: 500 });
        }

        let body: FuseBody;
        try {
          body = (await request.json()) as FuseBody;
        } catch {
          return Response.json({ error: "Solicitud inválida." }, { status: 400 });
        }

        if (!isDataUrl(body.productImage) || !isDataUrl(body.labelImage)) {
          return Response.json(
            { error: "Sube una foto del producto y una de la etiqueta." },
            { status: 400 },
          );
        }

        const userPrompt = (body.prompt ?? "").toString().slice(0, 600).trim();

        const instruction = [
          "You are a professional product mockup generator.",
          "The FIRST image is a product. The SECOND image is a label/design artwork.",
          "Apply the label realistically onto the product surface, following its curvature,",
          "perspective, lighting and shadows so it looks like a real photograph of the finished product.",
          "Keep the product shape and background clean and photorealistic. Output only the final image.",
          userPrompt ? `Additional creative direction: ${userPrompt}` : "",
        ]
          .filter(Boolean)
          .join(" ");

        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image-preview",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: instruction },
                    { type: "image_url", image_url: { url: body.productImage } },
                    { type: "image_url", image_url: { url: body.labelImage } },
                  ],
                },
              ],
              modalities: ["image", "text"],
            }),
          });
        } catch {
          return Response.json({ error: "No se pudo contactar al servicio de IA." }, { status: 502 });
        }

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          if (upstream.status === 429) {
            return Response.json(
              { error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo." },
              { status: 429 },
            );
          }
          if (upstream.status === 402) {
            return Response.json(
              { error: "Se agotaron los créditos de IA. Añade créditos para continuar." },
              { status: 402 },
            );
          }
          return Response.json(
            { error: "No se pudo generar el mockup.", detail: text.slice(0, 300) },
            { status: 502 },
          );
        }

        const json = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;
        const b64 = extractImage(json);

        if (!b64) {
          return Response.json(
            { error: "La IA no devolvió una imagen. Prueba con otras fotos o un prompt distinto." },
            { status: 502 },
          );
        }

        return Response.json({ image: `data:image/png;base64,${b64}` });
      },
    },
  },
});

/** Extract a base64 PNG from the various shapes the gateway can return. */
function extractImage(json: Record<string, unknown> | null): string | null {
  if (!json) return null;

  // OpenAI images shape: { data: [{ b64_json }] }
  const data = json.data as Array<{ b64_json?: string }> | undefined;
  if (Array.isArray(data) && data[0]?.b64_json) return stripPrefix(data[0].b64_json);

  // OpenRouter chat shape: { choices: [{ message: { images: [{ image_url: { url } }] } }] }
  const choices = json.choices as
    | Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>
    | undefined;
  const url = choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (typeof url === "string") return stripPrefix(url);

  return null;
}

function stripPrefix(value: string): string {
  const idx = value.indexOf("base64,");
  return idx >= 0 ? value.slice(idx + "base64,".length) : value;
}