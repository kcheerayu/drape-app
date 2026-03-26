import { NextRequest, NextResponse } from "next/server";
import { getJob, markJobSucceeded, markJobFailed } from "@/lib/jobs";
import { getFashnStatus } from "@/lib/fashn";
import type { TryOnStatusResponse, ApiError } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json<ApiError>(
        { error: "Job not found. It may have expired." },
        { status: 404 }
      );
    }

    if (job.status === "processing" && job.replicatePredictionId) {
      try {
        const prediction = await getFashnStatus(job.replicatePredictionId);

        if (prediction.status === "completed" && prediction.output) {
          const outputUrl = prediction.output[0];
          await markJobSucceeded(jobId, outputUrl);
          return NextResponse.json<TryOnStatusResponse>({
            jobId,
            status: "succeeded",
            outputUrl,
            error: null,
          });
        } else if (prediction.status === "failed") {
          const errorMsg = prediction.error ?? "Fashn model failed";
          await markJobFailed(jobId, errorMsg);
          return NextResponse.json<TryOnStatusResponse>({
            jobId,
            status: "failed",
            outputUrl: null,
            error: errorMsg,
          });
        }
      } catch (err) {
        console.error(`[fashn/${jobId}] Poll error:`, err);
      }
    }

    return NextResponse.json<TryOnStatusResponse>({
      jobId,
      status: job.status,
      outputUrl: job.outputUrl,
      error: job.error,
    });
  } catch (err) {
    console.error("[tryon/status] Error:", err);
    return NextResponse.json<ApiError>(
      { error: "Failed to fetch job status" },
      { status: 500 }
    );
  }
}