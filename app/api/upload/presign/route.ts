import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUploadUrl } from "@/lib/storage";
import type { PresignRequest, PresignResponse, ApiError } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PresignRequest;
    const { filename, contentType } = body;

    if (!filename || !contentType) {
      return NextResponse.json<ApiError>(
        { error: "filename and contentType are required" },
        { status: 400 }
      );
    }

    const result = await generatePresignedUploadUrl(filename, contentType);

    return NextResponse.json<PresignResponse>({
      uploadUrl: result.uploadUrl,
      publicUrl: result.publicUrl,
    });
  } catch (err) {
    console.error("[presign] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate upload URL";
    return NextResponse.json<ApiError>(
      { error: message },
      { status: 500 }
    );
  }
}