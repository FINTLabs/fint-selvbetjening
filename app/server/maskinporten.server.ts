import { generateKeyPairSync } from "node:crypto";

import { MASKINPORTEN_URL } from "../../mocks/config";
import type { User } from "~/server/auth.server";
import type { ComponentRecord, IntegrationInput } from "~/types/integrations";

export type MaskinportenPayload = {
  integration_type: "maskinporten";
  client_name: string;
  token_endpoint_auth_method: "private_key_jwt";
  grant_types: string[];
  scopes: string[];
};

export type MaskinportenClient = MaskinportenPayload & {
  client_id: string;
  client_orgno: string;
};

export type MaskinportenPublicJwk = {
  kty: "RSA";
  e: string;
  n: string;
  kid: string;
  alg: "RS256";
  use: "sig";
};

export function createMaskinportenPayload(
  input: IntegrationInput,
  components: ComponentRecord[],
  _user: User,
): MaskinportenPayload {
  const byName = new Map(
    components.map((component) => [component.name, component]),
  );
  const scopes = input.components.flatMap((name) => {
    const component = byName.get(name);
    if (!component) {
      return [];
    }
    return [`fint:${component.category}:${component.name}:${input.type}`];
  });

  return {
    integration_type: "maskinporten",
    client_name: input.name,
    token_endpoint_auth_method: "private_key_jwt",
    grant_types: ["urn:ietf:params:oauth:grant-type:jwt-bearer"],
    scopes,
  };
}

export async function registerMaskinportenClient(
  payload: MaskinportenPayload,
): Promise<MaskinportenClient> {
  const created = await postJson<{
    client_id: string;
    client_orgno: string;
  }>(`${MASKINPORTEN_URL}/clients`, payload);

  return {
    ...payload,
    client_id: created.client_id,
    client_orgno: created.client_orgno,
  };
}

export async function registerMaskinportenJwks(
  clientId: string,
  publicJwk: MaskinportenPublicJwk,
): Promise<unknown> {
  return postJson(`${MASKINPORTEN_URL}/clients/${clientId}/jwks`, {
    keys: [publicJwk],
  });
}

export function generateMaskinportenKeyPair(
  clientId: string,
  clientName: string,
): { publicJwk: MaskinportenPublicJwk; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = publicKey.export({ format: "jwk" });
  const kid = `${slug(clientName)}_${clientId.slice(0, 8)}`;

  return {
    publicJwk: {
      kty: "RSA",
      e: jwk.e ?? "",
      n: jwk.n ?? "",
      kid,
      alg: "RS256",
      use: "sig",
    },
    privateKeyPem: privateKey
      .export({ type: "pkcs8", format: "pem" })
      .toString(),
  };
}

export function parseMaskinportenPublicJwk(
  raw: string,
  clientId: string,
  clientName: string,
): { ok: true; jwk: MaskinportenPublicJwk } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Nøkkelen må være gyldig JSON." };
  }

  const candidate = extractJwk(parsed);
  if (!isRecord(candidate)) {
    return {
      ok: false,
      error: "Lim inn en RSA JWK eller et JWKS med keys.",
    };
  }

  if (candidate.kty !== "RSA") {
    return { ok: false, error: "Nøkkelen må være av typen RSA (kty)." };
  }
  if (typeof candidate.n !== "string" || candidate.n.length === 0) {
    return { ok: false, error: "JWK mangler modulus (n)." };
  }
  if (typeof candidate.e !== "string" || candidate.e.length === 0) {
    return { ok: false, error: "JWK mangler eksponent (e)." };
  }

  return {
    ok: true,
    jwk: {
      kty: "RSA",
      e: candidate.e,
      n: candidate.n,
      kid:
        typeof candidate.kid === "string" && candidate.kid
          ? candidate.kid
          : `${slug(clientName)}_${clientId.slice(0, 8)}`,
      alg: "RS256",
      use: "sig",
    },
  };
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  await ensureDevMocks();

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const body = parseBody(text);

  console.log(`[maskinporten] POST ${url}`);
  console.log(`[maskinporten] request\n${JSON.stringify(payload, null, 2)}`);
  console.log(
    `[maskinporten] response ${response.status}\n${JSON.stringify(body, null, 2)}`,
  );

  if (!response.ok) {
    throw new Error(`Maskinporten svarte ${response.status}`);
  }

  return body as T;
}

function parseBody(text: string): unknown {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function ensureDevMocks() {
  if (process.env.VITEST || import.meta.env.PROD) {
    return;
  }

  const { ensureMockServer } = await import("../../mocks/node");
  ensureMockServer();
}

function extractJwk(value: unknown): unknown {
  if (isRecord(value) && Array.isArray(value.keys) && value.keys[0]) {
    return value.keys[0];
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 32) || "integrasjon"
  );
}
