import { notFound } from "next/navigation";

// Server Component that triggers Next's not-found boundary. The flight wire
// for this case is shaped as an array-of-elements at the root rather than a
// single `<html>` element, which exercises the parser's
// `isElementListArray` branch in tree-build.ts. The TreePreview should
// display Next's "404: This page could not be found." page tree.

export default function ErrorPage() {
  notFound();
}
