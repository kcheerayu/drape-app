import Replicate from "replicate";
import type { GarmentCategory } from "@/types";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export interface TryOnInput {
  personImageUrl: string;
  garmentImageUrl: string;
  garmentCategory: GarmentCategory;
  garmentDescription?: string;
}

export interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string[] | null;
  error: string | null;
}

export async function submitTryOnPrediction(
  input: TryOnInput
): Promise<{ predictionId: string }> {
  const prediction = await replicate.run(
    "yisol/idm-vton:906425dbca90663ff5427624839572cc56ea7d380343d13e2a4c4b09d3f0c30f",
    {
      input: {
        human_img: input.personImageUrl,
        garm_img: input.garmentImageUrl,
        category: input.garmentCategory,
        garment_des: input.garmentDescription ?? "a clothing item",
        is_checked: true,
        is_checked_crop: false,
        denoise_steps: 30,
        seed: 42,
      },
    }
  ) as any;

  return { predictionId: "direct" };
}

export async function getPredictionStatus(
  predictionId: string
): Promise<ReplicatePrediction> {
  const prediction = await replicate.predictions.get(predictionId);
  return {
    id: prediction.id,
    status: prediction.status as ReplicatePrediction["status"],
    output: prediction.output as string[] | null,
    error: prediction.error as string | null,
  };
}

export function extractOutputUrl(prediction: ReplicatePrediction): string | null {
  if (prediction.status !== "succeeded" || !prediction.output) return null;
  const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  return typeof url === "string" ? url : null;
}