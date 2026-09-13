import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TierBadge } from "@/components/rankd/tier-badge";
import type { components } from "@/lib/api/schema";

type TierOut = components["schemas"]["TierOut"];

/**
 * No next-tier progress fill: the backend exposes no threshold values
 * (tier_thresholds isn't returned by any endpoint - see /users/{id}/tier),
 * so a precise progress bar would either need a new endpoint or hardcoded
 * thresholds that could drift from scripts/seed.py. Shows the number and
 * badge confidently instead.
 */
export function TierSummary({ tier }: { tier: TierOut }) {
  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted uppercase tracking-wide">
          Your tier
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <TierBadge tier={tier.tier} subLevel={tier.sub_level} size="lg" />
        <p className="tabular-nums text-2xl font-semibold">{tier.bar_total.toFixed(1)}</p>
      </CardContent>
    </Card>
  );
}
