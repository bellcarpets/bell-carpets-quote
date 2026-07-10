/**
 * Footer — Premium document sign-off
 * Minimal, refined: just the essentials. No established year, no stats.
 * Feels like the closing page of a luxury architectural proposal.
 */

import { QUOTE_DATA } from "@/lib/quoteData";
import { LOGO_WHITE_PNG } from "@/lib/logo";

export default function Footer() {
  const { business } = QUOTE_DATA;

  return (
    <footer className="mt-24 pb-14">
      {/* Subtle divider */}
      <div className="h-px w-full mb-12 bg-white/[0.06]" />

      {/* Logo */}
      <div className="text-center mb-8">
        <img
          src={LOGO_WHITE_PNG}
          alt="Bell Carpets"
          className="h-7 mx-auto opacity-40"
        />
      </div>

      {/* Contact — single refined line on desktop, stacked on mobile */}
      <div className="text-center space-y-2">
        <p className="text-[13px] text-white/30 tracking-wide">
          {business.address}
        </p>
        <p className="text-[13px] text-white/30 tracking-wide">
          <a
            href={`tel:${business.phone.replace(/\s/g, "")}`}
            className="transition-colors hover:text-white/60"
          >
            {business.phone}
          </a>
          <span className="mx-3 text-white/10">|</span>
          <a
            href={`https://${business.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-white/60"
          >
            {business.website}
          </a>
        </p>
      </div>
    </footer>
  );
}
