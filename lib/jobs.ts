import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";
import type { TryOnJob, JobStatus, GarmentCategory } from "@/types";

const redis = Redis.fromEnv();

const JOB_TTL = Number(process.env.JOB_TTL_SECONDS ?? 86400);
const KEY = (id: string) => `job:${id}`;

export async function createJob(params: {
  personImageUrl: string;
  garmentImageUrl: string;
  garmentCategory: GarmentCategory;
}): Promise<TryOnJob> {
  const job: TryOnJob = {
    id: nanoid(12),
    status: "pending",
    personImageUrl: params.personImageUrl,
    garmentImageUrl: params.garmentImageUrl,
    garmentCategory: params.garmentCategory,
    replicatePredictionId: null,
    outputUrl: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await redis.set(KEY(job.id), job, { ex: JOB_TTL });
  return job;
}

export async function getJob(id: string): Promise<TryOnJob | null> {
  return redis.get<TryOnJob>(KEY(id));
}

export async function updateJob(
  id: string,
  updates: Partial<TryOnJob>
): Promise<TryOnJob | null> {
  const existing = await getJob(id);
  if (!existing) return null;

  const updated: TryOnJob = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await redis.set(KEY(id), updated, { ex: JOB_TTL });
  return updated;
}

export async function markJobProcessing(
  id: string,
  replicatePredictionId: string
): Promise<void> {
  await updateJob(id, { status: "processing", replicatePredictionId });
}

export async function markJobSucceeded(
  id: string,
  outputUrl: string
): Promise<void> {
  await updateJob(id, { status: "succeeded", outputUrl });
}

export async function markJobFailed(
  id: string,
  error: string
): Promise<void> {
  await updateJob(id, { status: "failed", error });
}