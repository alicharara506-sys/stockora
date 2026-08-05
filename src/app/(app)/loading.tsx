import { SkeletonPage } from "@/components/ui/skeleton";

/** Shown while any app route's server component streams in. */
export default function Loading() {
  return <SkeletonPage />;
}
