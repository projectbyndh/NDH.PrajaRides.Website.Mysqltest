import "server-only";
import { after } from "next/server";
import { revalidateTag, updateTag } from "next/cache";

/**
 * Refreshes everything tagged `tag` after an admin change. updateTag clears it now (the admin sees
 * the change on their next view); a second, blocking invalidation a few seconds later catches a page
 * that was already being rebuilt in the background with the old data when the change was saved,
 * which would otherwise be stored as fresh and shown until the next change.
 */
export function invalidate(tag: string): void {
  updateTag(tag);
  after(async () => {
    await new Promise((r) => setTimeout(r, 3000));
    revalidateTag(tag, { expire: 0 });
  });
}
