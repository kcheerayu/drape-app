import { NextRequest, NextResponse } from "next/server";
import { createJob, markJobProcessing, markJobFailed } from "@/lib/jobs";
import { submitFashnTryOn } from "@/lib/fashn";
import type { CreateTryOnRequest, CreateTryOnResponse, ApiError } from "@/types";

const VALID_CATEGORIES = ["upper_body", "lower_body", "dresses"] as const;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateTryOnRequest;
    const { personImageUrl, garmentImageUrl, garmentCategory } = body;

    if (!personImageUrl || !garmentImageUrl || !garmentCategory) {
      return NextResponse.json<ApiError>(
        { error: "personImageUrl, garmentImageUrl, and garmentCategory are required" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(garmentCategory as any)) {
      return NextResponse.json<ApiError>(
        { error: `garmentCategory must be one of: ${VALID_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const job = await createJob({
      personImageUrl,
      garmentImageUrl,
      garmentCategory,
    });

    (async () => {
      try {
        const { predictionId } = await submitFashnTryOn({
          personImageUrl,
          garmentImageUrl,
          garmentCategory: garmentCategory as any,
        });
        await markJobProcessing(job.id, predictionId);
        console.log(`[fashn] Job ${job.id} submitted as ${predictionId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Fashn submission failed";
        await markJobFailed(job.id, message);
        console.error("[fashn] Error:", err);
      }
    })();

    return NextResponse.json<CreateTryOnResponse>(
      { jobId: job.id, status: "pending" },
      { status: 202 }
    );
  } catch (err) {
    console.error("[tryon/create] Error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to create try-on job" },
      { status: 500 }
    );
  }
}