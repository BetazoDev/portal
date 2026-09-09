import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { envServidor } from "@/lib/env";

/**
 * AES-256-GCM para la API key del LLM.
 *
 * Postgres solo guarda ciphertext, iv, tag y los últimos cuatro caracteres.
 * El descifrado ocurre únicamente aquí, en el servidor, justo antes de llamar
 * al modelo. Si se pierde CRM_ENCRYPTION_KEY la llave es irrecuperable y hay
 * que capturarla de nuevo: respáldala fuera de la base.
 */

const ALGORITMO = "aes-256-gcm";

function llave() {
  const { CRM_ENCRYPTION_KEY } = envServidor();
  if (!CRM_ENCRYPTION_KEY) {
    throw new Error("Falta CRM_ENCRYPTION_KEY. Sin ella no se puede guardar la API key.");
  }

  const bytes = Buffer.from(CRM_ENCRYPTION_KEY, "base64");
  if (bytes.length !== 32) {
    throw new Error("CRM_ENCRYPTION_KEY debe ser de 32 bytes en base64.");
  }
  return bytes;
}

export function cifrar(texto: string) {
  const iv = randomBytes(12);
  const cifrador = createCipheriv(ALGORITMO, llave(), iv);
  const cifrado = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);

  return {
    ciphertext: cifrado.toString("base64"),
    iv: iv.toString("base64"),
    tag: cifrador.getAuthTag().toString("base64"),
    last4: texto.slice(-4),
  };
}

export function descifrar(ciphertext: string, iv: string, tag: string) {
  const descifrador = createDecipheriv(ALGORITMO, llave(), Buffer.from(iv, "base64"));
  descifrador.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    descifrador.update(Buffer.from(ciphertext, "base64")),
    descifrador.final(),
  ]).toString("utf8");
}
