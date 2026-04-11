/**
 * Bobby QR Code Secure Pairing System v1.0
 *
 * Flow: Fabrication → QR généré → Parent scanne → Backend valide → Jouet activé
 *
 * Sécurité:
 *   • Token signé HMAC-SHA256 (clé secrète backend)
 *   • Expiration 90 jours si non activé
 *   • One-shot: une seule activation possible par device
 *   • device_secret AES-256 généré à l'activation (sync chiffrée)
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type DeviceStatus =
  | "manufactured"   // QR créé, jouet pas encore vendu
  | "activated"      // Parent a scanné + activé
  | "suspended"      // Suspendu par parent ou admin
  | "transferred"    // Transféré à un autre compte parent
  | "deactivated";   // Désactivé définitivement

export type DeviceRegion = "EU" | "US" | "CA" | "AU" | "GB" | "OTHER";
export type DeviceModel = "bobby-v1" | "bobby-v2" | "bobby-mini" | "bobby-pro";

export interface DeviceQRPayload {
  device_id: string;          // "BOB-2026-XXXXXXXXXX" (unique)
  activation_token: string;   // JWT signé HMAC-SHA256
  version: number;            // Version du format QR (pour évolution)
  manufactured_at: string;    // ISO 8601
  region: DeviceRegion;
  model: DeviceModel;
}

export interface DeviceRecord {
  device_id: string;
  token_hash: string;         // SHA-256 du token (pour vérification sans stocker token brut)
  status: DeviceStatus;
  manufactured_at: string;
  expires_at: string;         // manufactured_at + 90 jours
  region: DeviceRegion;
  model: DeviceModel;
  linked_parent_id: string | null;
  linked_child_id: string | null;
  activated_at: string | null;
  device_secret_hash: string | null; // Hash du secret donné au jouet
  last_seen: string | null;
  firmware_version: string;
  transfer_count: number;
}

export interface ActivationRequest {
  device_id: string;
  activation_token: string;
  parent_user_id: string;
  child_name: string;
  child_age: number;
}

export interface ActivationResult {
  success: boolean;
  device_id: string;
  child_id: string;
  device_secret: string;      // AES-256 key (32 bytes hex) — donné au jouet via BLE/WiFi
  parent_dashboard_url: string;
  error?: ActivationError;
}

export type ActivationError =
  | "DEVICE_NOT_FOUND"
  | "TOKEN_INVALID"
  | "TOKEN_EXPIRED"
  | "DEVICE_ALREADY_ACTIVATED"
  | "DEVICE_SUSPENDED"
  | "PARENT_NOT_AUTHENTICATED"
  | "RATE_LIMIT_EXCEEDED";

export interface DeviceStatusResponse {
  device_id: string;
  status: DeviceStatus;
  last_seen: string | null;
  battery_level: number | null; // 0–100
  firmware_version: string;
  is_online: boolean;
  child_id: string | null;
  parent_id: string | null;
}

export interface TransferRequest {
  device_id: string;
  from_parent_id: string;
  to_email: string;           // Email du nouveau parent
  message?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QR PAYLOAD ENCODER / DECODER (Client-side)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Encode le payload QR en string scannable.
 * Format : "BOBBY:v1:<base64url(JSON)>"
 * Le prefix BOBBY: permet au scanner de l'app de filtrer les QR Bobby uniquement.
 */
export function encodeQRPayload(payload: DeviceQRPayload): string {
  const json = JSON.stringify(payload);
  const b64 = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `BOBBY:v${payload.version}:${b64}`;
}

/**
 * Décode un QR scanné par l'app parent.
 * Returns null si le format est invalide (QR non-Bobby).
 */
export function decodeQRPayload(qrString: string): DeviceQRPayload | null {
  try {
    if (!qrString.startsWith("BOBBY:")) return null;
    const parts = qrString.split(":");
    if (parts.length < 3) return null;

    const b64 = parts[2]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(parts[2].length + ((4 - (parts[2].length % 4)) % 4), "=");

    const json = atob(b64);
    const payload = JSON.parse(json) as DeviceQRPayload;

    // Basic validation
    if (!payload.device_id || !payload.activation_token || !payload.version) return null;
    if (!payload.device_id.startsWith("BOB-")) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Valide localement (client-side) si le QR semble correct avant l'envoi au backend.
 * NE PAS utiliser pour décisions de sécurité — seulement pour UX.
 */
export function validateQRClientSide(payload: DeviceQRPayload): {
  valid: boolean;
  reason?: string;
} {
  if (!payload.device_id.match(/^BOB-\d{4}-[A-Z0-9]{10,}$/)) {
    return { valid: false, reason: "Format device_id invalide" };
  }

  const manufacturedAt = new Date(payload.manufactured_at);
  if (isNaN(manufacturedAt.getTime())) {
    return { valid: false, reason: "Date de fabrication invalide" };
  }

  const expiresAt = new Date(manufacturedAt.getTime() + 90 * 24 * 60 * 60 * 1000);
  if (Date.now() > expiresAt.getTime()) {
    return { valid: false, reason: "QR expiré (> 90 jours depuis fabrication)" };
  }

  if (!payload.activation_token || payload.activation_token.length < 50) {
    return { valid: false, reason: "Token d'activation manquant ou invalide" };
  }

  return { valid: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API CLIENT — FRONTEND (App parent)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const API_BASE = import.meta.env?.VITE_API_URL ?? "https://api.bobbytoy.ai";

/**
 * Activate a device after QR scan.
 * Called from the app after parent scans QR and fills child info.
 */
export async function activateDevice(
  request: ActivationRequest,
  authToken: string
): Promise<ActivationResult> {
  const res = await fetch(`${API_BASE}/api/devices/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      success: false,
      device_id: request.device_id,
      child_id: "",
      device_secret: "",
      parent_dashboard_url: "",
      error: (err.error as ActivationError) ?? "TOKEN_INVALID",
    };
  }

  return res.json() as Promise<ActivationResult>;
}

/**
 * Check device pairing status (polling during BLE/WiFi provisioning).
 */
export async function getDeviceStatus(
  deviceId: string,
  authToken: string
): Promise<DeviceStatusResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/devices/${deviceId}/status`, {
      headers: { "Authorization": `Bearer ${authToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Deactivate a device (parent removes it from account).
 */
export async function deactivateDevice(
  deviceId: string,
  authToken: string,
  deleteData = false
): Promise<{ success: boolean; data_deleted: boolean }> {
  const res = await fetch(`${API_BASE}/api/devices/${deviceId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify({ delete_child_data: deleteData }),
  });
  return res.json();
}

/**
 * Initiate device transfer to another parent (e.g. gift, resell).
 */
export async function initiateTransfer(
  request: TransferRequest,
  authToken: string
): Promise<{ success: boolean; transfer_id: string; expires_at: string }> {
  const res = await fetch(`${API_BASE}/api/devices/${request.device_id}/transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify(request),
  });
  return res.json();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BACKEND LOGIC (Edge Function / Server-side)
// This section defines the server-side validation logic.
// Deploy as Supabase Edge Function or Express route.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Server-side: validate activation token.
 * Uses Web Crypto API (available in Deno/Edge runtimes).
 *
 * The token format is: base64url(JSON_header.JSON_payload).HMAC_signature
 * where JSON_payload = { device_id, manufactured_at, exp }
 */
export async function validateActivationToken(
  deviceId: string,
  token: string,
  secretKey: string // BOBBY_QR_SECRET env var
): Promise<{
  valid: boolean;
  expired: boolean;
  deviceId: string;
  manufacturedAt: Date;
}> {
  try {
    // Split token: header.payload.signature (simplified JWT-like)
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, expired: false, deviceId: "", manufacturedAt: new Date() };

    const [headerB64, payloadB64, sigB64] = parts;
    const message = `${headerB64}.${payloadB64}`;

    // Re-compute expected signature
    const enc = new TextEncoder();
    const keyData = enc.encode(secretKey);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
    );

    const expectedSig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
    const expectedSigB64 = btoa(String.fromCharCode(...new Uint8Array(expectedSig)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

    if (expectedSigB64 !== sigB64) {
      return { valid: false, expired: false, deviceId: "", manufacturedAt: new Date() };
    }

    // Decode payload
    const payloadJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson) as {
      device_id: string;
      manufactured_at: string;
      exp: number; // Unix timestamp
    };

    if (payload.device_id !== deviceId) {
      return { valid: false, expired: false, deviceId: payload.device_id, manufacturedAt: new Date() };
    }

    const expired = Date.now() > payload.exp * 1000;
    const manufacturedAt = new Date(payload.manufactured_at);

    return {
      valid: true,
      expired,
      deviceId: payload.device_id,
      manufacturedAt,
    };
  } catch {
    return { valid: false, expired: false, deviceId: "", manufacturedAt: new Date() };
  }
}

/**
 * Server-side: generate a new device QR payload at manufacturing time.
 * Call this once per device before shipping.
 */
export async function generateDeviceQR(params: {
  deviceId: string;
  region: DeviceRegion;
  model: DeviceModel;
  secretKey: string;
}): Promise<DeviceQRPayload> {
  const { deviceId, region, model, secretKey } = params;
  const manufacturedAt = new Date().toISOString();

  // Token expires in 90 days
  const exp = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

  const header = btoa(JSON.stringify({ alg: "HS256", typ: "QRT" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const payloadData = btoa(JSON.stringify({ device_id: deviceId, manufactured_at: manufacturedAt, exp }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const message = `${header}.${payloadData}`;
  const enc = new TextEncoder();
  const keyData = enc.encode(secretKey);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const activation_token = `${message}.${sigB64}`;

  return {
    device_id: deviceId,
    activation_token,
    version: 1,
    manufactured_at: manufacturedAt,
    region,
    model,
  };
}

/**
 * Server-side: generate a cryptographically secure device_secret.
 * This 256-bit key is used to authenticate all device→backend sync calls.
 */
export async function generateDeviceSecret(): Promise<string> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = await crypto.subtle.exportKey("raw", key);
  return Array.from(new Uint8Array(raw)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a unique device ID.
 * Format: BOB-{YEAR}-{10 random uppercase alphanum chars}
 */
export function generateDeviceId(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map(b => chars[b % chars.length])
    .join("");
  return `BOB-${year}-${random}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REACT HOOK — useQRActivation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useCallback } from "react";

export type ActivationStep =
  | "idle"
  | "scanning"
  | "validating_qr"
  | "entering_child_info"
  | "activating"
  | "provisioning_device"
  | "success"
  | "error";

export interface UseQRActivationState {
  step: ActivationStep;
  deviceId: string | null;
  scannedPayload: DeviceQRPayload | null;
  error: ActivationError | string | null;
  activationResult: ActivationResult | null;
  deviceStatus: DeviceStatusResponse | null;
}

export interface UseQRActivationActions {
  onQRScanned: (qrString: string) => void;
  activateWithChildInfo: (childName: string, childAge: number, authToken: string) => Promise<void>;
  pollDeviceStatus: (authToken: string) => Promise<void>;
  reset: () => void;
}

const initialState: UseQRActivationState = {
  step: "idle",
  deviceId: null,
  scannedPayload: null,
  error: null,
  activationResult: null,
  deviceStatus: null,
};

export function useQRActivation(): UseQRActivationState & UseQRActivationActions {
  const [state, setState] = useState<UseQRActivationState>(initialState);

  const onQRScanned = useCallback((qrString: string) => {
    setState(s => ({ ...s, step: "validating_qr", error: null }));

    const payload = decodeQRPayload(qrString);
    if (!payload) {
      setState(s => ({ ...s, step: "error", error: "QR Bobby invalide. Vérifiez que vous scannez le bon QR code." }));
      return;
    }

    const { valid, reason } = validateQRClientSide(payload);
    if (!valid) {
      setState(s => ({ ...s, step: "error", error: reason ?? "QR invalide" }));
      return;
    }

    setState(s => ({
      ...s,
      step: "entering_child_info",
      scannedPayload: payload,
      deviceId: payload.device_id,
    }));
  }, []);

  const activateWithChildInfo = useCallback(async (
    childName: string,
    childAge: number,
    authToken: string
  ) => {
    if (!state.scannedPayload || !state.deviceId) return;

    setState(s => ({ ...s, step: "activating", error: null }));

    const result = await activateDevice(
      {
        device_id: state.deviceId,
        activation_token: state.scannedPayload.activation_token,
        parent_user_id: "", // Will be inferred from authToken server-side
        child_name: childName,
        child_age: childAge,
      },
      authToken
    );

    if (!result.success) {
      setState(s => ({ ...s, step: "error", error: result.error ?? "Activation échouée" }));
      return;
    }

    setState(s => ({
      ...s,
      step: "provisioning_device",
      activationResult: result,
    }));

    // Note: actual BLE/WiFi provisioning is handled by native mobile code
    // This hook just tracks the flow state
  }, [state.scannedPayload, state.deviceId]);

  const pollDeviceStatus = useCallback(async (authToken: string) => {
    if (!state.deviceId) return;
    const status = await getDeviceStatus(state.deviceId, authToken);
    if (status) {
      setState(s => ({
        ...s,
        deviceStatus: status,
        step: status.status === "activated" && status.is_online ? "success" : s.step,
      }));
    }
  }, [state.deviceId]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    onQRScanned,
    activateWithChildInfo,
    pollDeviceStatus,
    reset,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ERROR MESSAGES (French UX)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ACTIVATION_ERROR_MESSAGES: Record<ActivationError, string> = {
  DEVICE_NOT_FOUND: "Ce jouet Bobby n'est pas reconnu. Vérifiez le QR code.",
  TOKEN_INVALID: "Le QR code semble endommagé ou falsifié. Contactez le support.",
  TOKEN_EXPIRED: "Ce QR code a expiré (valable 90 jours). Contactez le support Bobby.",
  DEVICE_ALREADY_ACTIVATED: "Ce jouet est déjà associé à un compte. Contactez le support si c'est votre jouet.",
  DEVICE_SUSPENDED: "Ce jouet a été suspendu. Contactez le support Bobby.",
  PARENT_NOT_AUTHENTICATED: "Veuillez vous connecter à votre compte Bobby avant d'activer.",
  RATE_LIMIT_EXCEEDED: "Trop de tentatives. Attendez quelques minutes avant de réessayer.",
};

/**
 * Get a friendly French error message for display in the app.
 */
export function getActivationErrorMessage(error: ActivationError | string | null): string {
  if (!error) return "";
  return ACTIVATION_ERROR_MESSAGES[error as ActivationError]
    ?? "Une erreur s'est produite. Veuillez réessayer.";
}
