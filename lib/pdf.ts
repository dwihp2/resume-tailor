import { extractText, getDocumentProxy } from "unpdf";

/**
 * PDF -> plain text. The only place in the codebase that knows about PDF
 * internals; everything downstream works on text (spec §Pipeline stage 1).
 */
export async function extractPdfText(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}
