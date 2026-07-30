/**
 * Footer — Bell Carpets business details with logo
 * Clean white background, dark text
 */

import { MapPin, Phone, Globe } from "lucide-react";
import { QUOTE_DATA } from "@/lib/quoteData";
import { LOGO_PNG } from "@/lib/logo";

export default function Footer() {
  const { business } = QUOTE_DATA;

  return (
    <footer className="mt-16 pb-10">
      {/* Divider */}
      <div className="h-px w-full mb-8 bg-zinc-200" />

      {/* Logo */}
      <div className="text-center mb-6">
        <img
          src={LOGO_PNG}
          alt="Bell Carpets"
          className="h-8 mx-auto mb-1.5 opacity-60"
        />
      </div>

      {/* Contact details */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-zinc-300" />
          <p className="text-sm text-zinc-400">
            {business.address}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-zinc-300" />
          <a
            href={`tel:${business.phone.replace(/\s/g, "")}`}
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-700"
          >
            {business.phone}
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-zinc-400" />
          <a
            href={`https://${business.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 underline underline-offset-2 decoration-zinc-300 transition-colors hover:text-zinc-800 hover:decoration-zinc-500"
          >
            {business.website}
          </a>
        </div>
      </div>

      {/* Established */}
      <p className="text-center text-xs tracking-[0.25em] mt-6 text-zinc-300">
        EST. {business.established}
      </p>
    </footer>
  );
}
