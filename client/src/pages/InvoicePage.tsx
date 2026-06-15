/**
 * Customer-facing Invoice / Balance Page
 * Accessible at /invoice/:slug — no login required
 * Shows: balance owing, banking details, PDF download link
 */

import { trpc } from "@/lib/trpc";
import { Loader2, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { LOGO_WHITE_PNG } from "@/lib/logo";

function fmt(n: number) {
  return "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0 });
}

export default function InvoicePage({ slug }: { slug: string }) {
  const { data, isLoading, error } = trpc.invoice.getForCustomer.useQuery(
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

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-white text-xl font-semibold mb-2">Invoice Not Found</h1>
          <p className="text-white/50 text-sm">
            This invoice link may have expired or is invalid. Please contact Bell Carpets on 07 5571 1177.
          </p>
        </div>
      </div>
    );
  }

  // Always calculate balance from actual amounts — never trust paymentStatus alone.
  // paymentStatus can be stale (e.g. set during testing), but the real numbers don't lie.
  const discountAmount = data.discountAmount ?? 0;
  const calculatedBalance = Math.max(0, data.totalAmount - discountAmount - data.depositPaid);
  const isPaidInFull = calculatedBalance === 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="bg-black border-b border-[#B8965A]/30 px-6 py-6 text-center">
        <img src={LOGO_WHITE_PNG} alt="Bell Carpets" className="h-10 mx-auto mb-2" />
        <p className="text-[10px] tracking-[3px] text-white/40 uppercase">
          Residential &nbsp;|&nbsp; Commercial &nbsp;|&nbsp; Projects
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {/* Invoice header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tax Invoice</h1>
          {data.invoiceNumber && (
            <p className="text-[#B8965A] text-sm font-semibold mt-1">
              {data.invoiceNumber} &nbsp;·&nbsp; Ref: {data.quoteNumber}
            </p>
          )}
          {data.propertyAddress && (
            <p className="text-white/50 text-sm mt-1">{data.propertyAddress}</p>
          )}
        </div>

        {/* Paid in full banner */}
        {isPaidInFull && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-emerald-300 font-semibold text-sm">Payment Complete</p>
              <p className="text-emerald-400/60 text-xs">Thank you — this invoice is fully paid.</p>
            </div>
          </div>
        )}

        {/* Payment summary */}
        <div className="bg-white/[0.04] border border-white/8 rounded-xl overflow-hidden">
          <div className="px-5 py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-sm">Total Amount (inc GST)</span>
              <span className="text-white font-semibold">{fmt(data.totalAmount)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-sm">Discount / Credit</span>
                <span className="text-orange-400 font-semibold">− {fmt(discountAmount)}</span>
              </div>
            )}
            {data.depositPaid > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-sm">Deposit Paid</span>
                <span className="text-emerald-400 font-semibold">− {fmt(data.depositPaid)}</span>
              </div>
            )}
            <div className="border-t border-white/8 pt-3 flex justify-between items-center">
              <span className="text-white font-semibold">
                {isPaidInFull ? "Balance Owing" : "Balance Due"}
              </span>
              <span
                className={
                  isPaidInFull
                    ? "text-emerald-400 text-xl font-bold"
                    : "text-[#B8965A] text-xl font-bold"
                }
              >
                {fmt(calculatedBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Banking details — only show if balance is outstanding */}
        {calculatedBalance > 0 && (
          <div className="bg-[#B8965A]/8 border border-[#B8965A]/20 rounded-xl px-5 py-4">
            <p className="text-[#B8965A] text-xs font-semibold tracking-widest uppercase mb-3">
              Banking Details
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Account Name</span>
                <span className="text-white font-semibold">Bell Spec Pty Ltd</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">BSB</span>
                <span className="text-white font-semibold">124 022</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Account Number</span>
                <span className="text-white font-semibold">22496442</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Reference</span>
                <span className="text-[#B8965A] font-semibold">
                  {data.invoiceNumber ?? data.quoteNumber}
                </span>
              </div>
            </div>
            <p className="text-white/30 text-xs mt-3">
              Payment due on completion. Please use the reference above.
            </p>
          </div>
        )}

        {/* PDF download */}
        {data.pdfUrl && (
          <a
            href={data.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Invoice PDF
          </a>
        )}

        {/* Footer */}
        <div className="text-center pt-4 border-t border-white/5">
          <p className="text-white/25 text-xs">
            Bell Carpets &nbsp;·&nbsp; 07 5571 1177 &nbsp;·&nbsp; hello@bellcarpets.com.au
          </p>
          <p className="text-white/15 text-xs mt-1">
            BELL SPEC PTY LTD &nbsp;·&nbsp; ABN 74 613 299 773 &nbsp;·&nbsp; Unit 1, 41 Olympic Circuit, Southport QLD 4215
          </p>
        </div>
      </div>
    </div>
  );
}
