// Page content model, shared by the public pages (reading), the admin editor (form) and the server
// (validation). A page is made of blocks; a block is a set of fields saved as JSON.

export type Field =
  | { key: string; label: string; type: "text" | "url"; max?: number; hint?: string }
  | { key: string; label: string; type: "textarea"; max?: number; rows?: number; hint?: string }
  | { key: string; label: string; type: "icon"; hint?: string }
  | { key: string; label: string; type: "image"; hint?: string }
  | { key: string; label: string; type: "toggle"; hint?: string }
  /** A list of short lines (one per row). */
  | { key: string; label: string; type: "lines"; max?: number; hint?: string }
  /** A list of items, each with its own fields: add, edit, remove and reorder in admin. */
  | { key: string; label: string; type: "list"; item: Field[]; itemLabel: string; max?: number; hint?: string };

export type BlockDef<D = Record<string, unknown>> = {
  key: string;
  page: string;
  title: string;
  description?: string;
  fields: Field[];
  defaults: D;
};

export const block = <D,>(def: BlockDef<D>): BlockDef<D> => def;

export type PageDef = { key: string; label: string; path: string };
