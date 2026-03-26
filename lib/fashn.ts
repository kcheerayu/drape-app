const FASHN_API_URL = "https://api.fashn.ai/v1";
const FASHN_API_KEY = process.env.FASHN_API_KEY!;

export interface FashnInput {
  personImageUrl: string;
  garmentImageUrl: string;
  garmentCategory: "tops" | "bottoms" | "one-pieces";
}

export interface FashnPrediction {
  id: string;
  status: "starting" | "processing" | "completed" | "failed";
  output: string[] | null;
  error: string | null;
}

function mapCategory(category: string): "tops" | "bottoms" | "one-pieces" {
  if (category === "upper_body") return "tops";
  if (category === "lower_body") return "bottoms";
  return "one-pieces";
}

export async function submitFashnTryOn(
  input: FashnInput
): Promise<{ predictionId: string }> {
  const res = await fetch(`${FASHN_API_URL}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${FASHN_API_KEY}`,
    },
    body: JSON.stringify({
      model_image: input.personImageUrl,
      garment_image: input.garmentImageUrl,
      category: mapCategory(input.garmentCategory),
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? `Fashn API error: ${res.status}`);
  }

  const data = await res.json();
  return { predictionId: data.id };
}

export async function getFashnStatus(
  predictionId: string
): Promise<FashnPrediction> {
  const res = await fetch(`${FASHN_API_URL}/status/${predictionId}`, {
    headers: {
      "Authorization": `Bearer ${FASHN_API_KEY}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? `Fashn status error: ${res.status}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    status: data.status,
    output: data.output ? [data.output] : null,
    error: data.error ?? null,
  };
}