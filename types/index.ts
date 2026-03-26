export type GarmentCategory = "upper_body" | "lower_body" | "dresses";

export interface GarmentItem {
  id: string;
  name: string;
  brand: string;
  category: GarmentCategory;
  imageUrl: string;
  tryonImageUrl: string;
  price?: string;
  tags?: string[];
}

export type JobStatus = "pending" | "processing" | "succeeded" | "failed";

export interface TryOnJob {
  id: string;
  status: JobStatus;
  personImageUrl: string;
  garmentImageUrl: string;
  garmentCategory: GarmentCategory;
  replicatePredictionId: string | null;
  outputUrl: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PresignRequest {
  filename: string;
  contentType: string;
}

export interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
}

export interface CreateTryOnRequest {
  personImageUrl: string;
  garmentImageUrl: string;
  garmentCategory: GarmentCategory;
}

export interface CreateTryOnResponse {
  jobId: string;
  status: JobStatus;
}

export interface TryOnStatusResponse {
  jobId: string;
  status: JobStatus;
  outputUrl: string | null;
  error: string | null;
}

export interface ApiError {
  error: string;
  details?: string;
}