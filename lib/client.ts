/** Thin client helpers. Every failure surfaces the server's message verbatim. */
async function unwrap(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as { error?: string; issues?: string[] };
  if (!response.ok) {
    const detail = payload.issues?.length ? `: ${payload.issues.join(", ")}` : "";
    throw new Error(`${payload.error ?? `Request failed (${response.status})`}${detail}`);
  }
  return payload;
}

export async function postJson(url: string, body: unknown) {
  return unwrap(
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function postForm(url: string, form: FormData) {
  return unwrap(await fetch(url, { method: "POST", body: form }));
}

export async function postEmpty(url: string) {
  return unwrap(await fetch(url, { method: "POST" }));
}

export async function patchJson(url: string, body: unknown) {
  return unwrap(
    await fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteJson(url: string) {
  return unwrap(await fetch(url, { method: "DELETE" }));
}
