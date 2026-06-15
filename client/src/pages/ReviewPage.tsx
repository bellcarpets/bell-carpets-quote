/**
 * Customer-facing Review Thank-You Page
 * Accessible at /review/:slug — no login required
 * Shows: personalised thank-you, prominent Google review CTA
 * Design: matches the dark premium aesthetic of the invoice and quote pages
 */

import { trpc } from "@/lib/trpc";
import { Loader2, Star, ExternalLink } from "lucide-react";
import { LOGO_WHITE_PNG } from "@/lib/logo";

// Bell Carpets Google Maps review link
const GOOGLE_REVIEW_URL =
  "https://g.page/r/CZY0dqcUN2CvEBE/review";

export default function ReviewPage({ slug }: { slug: string }) {
  const { data, isLoading } = trpc.invoice.getForReview.useQuery(
    { quoteSlug: slug },
    { refetchOnWindowFocus: false }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#B8965A] animate-spin" />
      </div>
    );
  }

  const firstName = data?.clientName
    ? (data.clientName.split(" ")[0] || data.clientName)
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <div className="bg-black border-b border-[#B8965A]/30 px-6 py-6 text-center">
        <img src={LOGO_WHITE_PNG} alt="Bell Carpets" className="h-10 mx-auto mb-2" />
        <p className="text-[10px] tracking-[3px] text-white/40 uppercase">
          Residential &nbsp;|&nbsp; Commercial &nbsp;|&nbsp; Projects
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center space-y-8">

          {/* Stars */}
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className="w-7 h-7 fill-[#B8965A] text-[#B8965A]"
              />
            ))}
          </div>

          {/* Personalised heading */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {firstName ? (
                <>Thank you, {firstName}.</>
              ) : (
                <>Thank you.</>
              )}
            </h1>
            <p className="text-white/55 text-base leading-relaxed max-w-sm mx-auto">
              It's been a genuine pleasure working on your home. We hope you love
              your new floors every single day — that's what drives us.
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-white/20 text-xs tracking-widest uppercase">One small favour</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Review ask */}
          <div className="space-y-4">
            <p className="text-white/60 text-sm leading-relaxed">
              If you're happy with the result, a quick Google review makes a real
              difference for a family business like ours. It takes less than a
              minute and means the world to the team.
            </p>

            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 w-full py-4 px-6 rounded-xl bg-[#B8965A] hover:bg-[#C9A96B] text-black font-bold text-base transition-all duration-200 shadow-lg shadow-[#B8965A]/20 hover:shadow-[#B8965A]/30 hover:scale-[1.02] active:scale-[0.99]"
            >
              <Star className="w-5 h-5 fill-black text-black" />
              Leave Us a Review
              <ExternalLink className="w-4 h-4 opacity-60" />
            </a>

            <p className="text-white/25 text-xs">
              Opens Google Reviews in a new tab
            </p>
          </div>

          {/* Sign-off */}
          <div className="pt-2 space-y-1">
            <p className="text-white/40 text-sm">
              — Leon &amp; the Bell Carpets team
            </p>
            <p className="text-white/20 text-xs">
              Gold Coast · Est. 1987
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 px-4">
        <p className="text-white/20 text-xs">
          Bell Carpets &nbsp;·&nbsp; 07 5571 1177 &nbsp;·&nbsp; hello@bellcarpets.com.au
        </p>
      </div>
    </div>
  );
}
