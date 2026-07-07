export type SosType = "body" | "trapped" | "share_location";
export type BindStatus = "pending" | "bound";
export type SosStatus = "active" | "resolved";

export interface EmergencyContact {
  _id: string;
  name: string;
  bindStatus: BindStatus;
  lineUserId: string | null;
  bindCodeExpiresAt: string | null;
  createdAt: string;
}

export interface CreateEmergencyContactResult {
  contact: EmergencyContact;
  bindUrl: string;
  bindCode: string;
}

export interface CreateSosSessionInput {
  type: SosType;
  lat: number;
  lng: number;
  address?: string;
}

export interface CreateSosSessionResult {
  sessionId: string;
  shareToken: string;
  notifiedCount: number;
}

export interface ResolveSosSessionResult {
  sessionId: string;
  status: "resolved";
}

export interface SosPublicSession {
  type: SosType;
  status: SosStatus;
  lat: number;
  lng: number;
  address: string | null;
  updatedAt: string;
}
