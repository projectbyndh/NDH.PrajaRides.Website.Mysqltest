import { notFound } from "next/navigation";

// Any address no other page matches: show the site's own not-found page (with header and footer)
// instead of the plain default one.
export default function Missing() {
  notFound();
}
