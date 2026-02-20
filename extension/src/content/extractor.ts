import { FormField, PageContent } from "../lib/types";

function extractPageContent(): PageContent {
  const text = document.body.innerText.slice(0, 15000);

  const headings = Array.from(
    document.querySelectorAll("h1,h2,h3,h4,h5,h6"),
  ).map((h) => (h as HTMLElement).innerText.trim());

  const tables = Array.from(document.querySelectorAll("table")).map((table) =>
    Array.from(table.querySelectorAll("tr")).map((row) =>
      Array.from(row.querySelectorAll("td,th")).map(
        (cell) => (cell as HTMLElement).innerText.trim(),
      ),
    ),
  );

  const forms: FormField[] = Array.from(
    document.querySelectorAll("input,select,textarea"),
  )
    .filter((el) => (el as HTMLInputElement).type !== "hidden")
    .map((el) => {
      const input = el as HTMLInputElement;
      const label =
        document.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() ??
        input.closest("label")?.textContent?.trim() ??
        "";
      return {
        name: input.name || input.id || "",
        type: input.type || el.tagName.toLowerCase(),
        label,
        value: input.value ?? "",
        placeholder: input.placeholder ?? "",
      };
    })
    .slice(0, 30);

  const links = Array.from(document.querySelectorAll("a[href]"))
    .map((a) => ({
      text: (a as HTMLAnchorElement).innerText.trim(),
      href: (a as HTMLAnchorElement).href,
    }))
    .filter((l) => l.text && l.href)
    .slice(0, 50);

  return {
    url: location.href,
    title: document.title,
    text,
    headings,
    tables: tables.flat(),
    forms,
    links,
  };
}

// Expose globally so service worker can call via scripting.executeScript
(window as unknown as { __venkatExtract: () => PageContent }).__venkatExtract =
  extractPageContent;
