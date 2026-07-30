/**
 * Footer — Bell Carpets business details with logo
 * Dark luxury premium design
 */

import { MapPin, Phone, Globe } from "lucide-react";
import { QUOTE_DATA } from "@/lib/quoteData";
import { LOGO_WHITE_PNG } from "@/lib/logo";

export default function Footer() {
  const { business } = QUOTE_DATA;

  return (
    <footer className="mt-16 pb-10">
      {/* Divider */}
      <div className="h-px w-full mb-8 bg-white/10" />

      {/* Logo + tagline */}
      <div className="text-center mb-6">
        <img
          src={LOGO_WHITE_PNG}
          alt="Bell Carpets"
          className="h-8 mx-auto mb-1.5 opacity-50"
        />
        <p className="text-[9px] tracking-[0.3em] text-white/20 uppercase font-light">
          {business.tagline}
        </p>
      </div>

      {/* Contact details */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-white/25" />
          <p className="text-sm text-white/35">
            {business.address}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-white/25" />
          <a
            href={`tel:${business.phone.replace(/\s/g, "")}`}
            className="text-sm text-white/35 transition-colors hover:text-white"
          >
            {business.phone}
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-white/40" />
          <a
            href={`https://${business.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/60 underline underline-offset-2 decoration-white/25 transition-colors hover:text-white hover:decoration-white/60"
          >
            {business.website}
          </a>
        </div>
      </div>

      {/* Established */}
      <p className="text-center text-xs tracking-[0.25em] mt-6 text-white/15">
        EST. {business.established}
      </p>
    </footer>
  );
}
