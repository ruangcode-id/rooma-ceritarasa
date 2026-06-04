/** Substitusi variabel `{{key}}` dalam template WA/email. */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];
    if (value === null || value === undefined) return "";
    return String(value);
  });
}
