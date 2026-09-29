/**
 * Pure, network-free decision: does enrolling in a course create an
 * enrollment record directly, or does it require checkout first?
 *
 * This never talks to Supabase and never performs the enrollment or
 * checkout itself — that's the Route Handler's job
 * (app/api/courses/[slug]/enroll/route.ts). This function only decides
 * which path applies, based on price alone.
 */

export type EnrollAction = "enroll" | "checkout";

export function decideEnrollAction(price: number): EnrollAction {
  return price === 0 ? "enroll" : "checkout";
}
