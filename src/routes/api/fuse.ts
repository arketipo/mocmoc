import { createFileRoute } from "@tanstack/react-router";

interface FuseBody {
  productImage: string; // data URL
  labelImage: string; // data URL
  backgroundImage?: string; // optional data URL
  prompt?: string;
  lighting?: string;
  format?: string;
  camera?: string;
  seed?: number;
  referenceImage?: string; // previous render, used to lock consistency
}

function isDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/") && value.length < 15_000_000;
}

const LIGHTING_MAP: Record<string, string> = {
  "soft-studio": "soft, even studio lighting with gentle shadows",
  natural: "natural daylight with soft realistic shadows",
  dramatic: "dramatic high-contrast lighting with strong directional shadows",
  warm: "warm golden-hour lighting",
  cool: "cool, bluish lighting",
};

const FORMAT_MAP: Record<string, string> = {
  "1:1": "a square 1:1 composition",
  "4:5": "a vertical 4:5 portrait composition",
  "16:9": "a wide 16:9 horizontal composition",
  "9:16": "a tall 9:16 vertical story composition",
};

const CAMERA_MAP: Record<string, string> = {
  front: "a straight-on frontal camera angle",
  "three-quarter": "a three-quarter (45°) camera angle",
  "top-down": "a top-down (overhead) camera angle",
  macro: "a close-up macro shot emphasizing label detail",
  wide: "a wide-angle shot showing the full product",
};

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

        const hasBackground = isDataUrl(body.backgroundImage);
        const hasReference = isDataUrl(body.referenceImage);
        const userPrompt = (body.prompt ?? "").toString().slice(0, 600).trim();
        const lighting = LIGHTING_MAP[body.lighting ?? ""] ?? "";
        const format = FORMAT_MAP[body.format ?? ""] ?? "";
        const camera = CAMERA_MAP[body.camera ?? ""] ?? "";
        const seed =
          typeof body.seed === "number" && Number.isFinite(body.seed)
            ? Math.floor(body.seed)
            : undefined;

        // Order images so positions match the textual instruction below.
        const imageOrder = hasReference ? "reference" : "fresh";

        const instruction = [
          "You are a professional product mockup generator.",
          imageOrder === "reference"
            ? "The FIRST image is the PREVIOUS final render you must stay consistent with."
            : "",
          imageOrder === "reference"
            ? hasBackground
              ? "The SECOND image is a product, the THIRD image is a label/design artwork, the FOURTH image is a background scene."
              : "The SECOND image is a product. The THIRD image is a label/design artwork."
            : hasBackground
              ? "The FIRST image is a product, the SECOND image is a label/design artwork, the THIRD image is a background scene."
              : "The FIRST image is a product. The SECOND image is a label/design artwork.",
          "Apply the label realistically onto the product surface, following its curvature,",
          "perspective, lighting and shadows so it looks like a real photograph of the finished product.",
          hasBackground
            ? "Place the finished product into the provided background scene, matching its lighting and perspective."
            : "Keep the product shape and background clean and photorealistic.",
          imageOrder === "reference"
            ? [
                "CRITICAL: Reproduce the PREVIOUS render exactly. Keep the identical composition,",
                "framing, image size and aspect ratio, camera angle, product position and scale,",
                "background and label placement.",
                // Only the explicitly chosen parameters below may differ from the previous render.
                lighting ? `ONLY change the lighting to: ${lighting}.` : "",
                camera ? `ONLY change the camera to: ${camera}.` : "",
                format ? `ONLY change the format/aspect ratio to: ${format}.` : "",
                "Do not change anything else.",
              ]
                .filter(Boolean)
                .join(" ")
            : [
                format ? `Render ${format}.` : "",
                camera ? `Use ${camera}.` : "",
                lighting ? `Use ${lighting}.` : "",
                seed !== undefined
                  ? `Keep a consistent look and composition across renders (consistency seed ${seed}).`
                  : "",
              ]
                .filter(Boolean)
                .join(" "),
          "Output only the final image.",
          userPrompt ? `Additional creative direction: ${userPrompt}` : "",
        ]
          .filter(Boolean)
          .join(" ");

        const content: Array<Record<string, unknown>> = [
          { type: "text", text: instruction },
        ];
        if (hasReference) {
          content.push({ type: "image_url", image_url: { url: body.referenceImage } });
        }
        content.push({ type: "image_url", image_url: { url: body.productImage } });
        content.push({ type: "image_url", image_url: { url: body.labelImage } });
        if (hasBackground) {
          content.push({ type: "image_url", image_url: { url: body.backgroundImage } });
        }

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
              messages: [{ role: "user", content }],
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