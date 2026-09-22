/** Thin client helpers. Every failure surfaces the server's message verbatim. */
async function unwrap<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; issues?: string[] };
  if (!response.ok) {
    const detail = payload.issues?.length ? `: ${payload.issues.join(", ")}` : "";
    throw new Error(`${payload.error ?? `Request failed (${response.status})`}${detail}`);
  }
  return payload;
}

export async function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  return unwrap<T>(
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function postForm<T = unknown>(url: string, form: FormData): Promise<T> {
  return unwrap<T>(await fetch(url, { method: "POST", body: form }));
}

export async function postEmpty<T = unknown>(url: string): Promise<T> {
  return unwrap<T>(await fetch(url, { method: "POST" }));
}

export async function patchJson<T = unknown>(url: string, body: unknown): Promise<T> {
  return unwrap<T>(
    await fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteJson<T = unknown>(url: string): Promise<T> {
  return unwrap<T>(await fetch(url, { method: "DELETE" }));
}
