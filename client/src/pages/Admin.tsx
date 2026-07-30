import { LOGO_WHITE_PNG, LOGO_PNG } from "@/lib/logo";
const LOGO_BLACK_PNG = LOGO_PNG;
/**
 * Admin Panel — Bell Carpets Multi-Quote Manager
 * Password-protected, mobile-first, dark theme
 *
 * Views:
 * 1. Password Gate
 * 2. Quotes Dashboard (list all quotes, create/duplicate)
 * 3. Quote Editor (edit a specific quote)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Lock,
  Save,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Copy,
  ExternalLink,
  FileText,
  CheckCircle2,
  Clock,
  Search,
  LayoutDashboard,
  Home,
  Users,
  BookUser,
  UserPlus,
  Building2,
  Phone,
  Mail,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  CircleDot,
  Banknote,
  Calendar,
  CircleCheckBig,
  DollarSign,
  Send,
  X,
  BookOpen,
  GripVertical,
  Pencil,
  Check,
  Link2,
  AlertTriangle,
  CopyPlus,
  Settings,
  RefreshCw,
  Unplug,
  Plug,
  CloudUpload,
  Eye,
  Bell,
  BellOff,
  ClipboardCopy,
  MessageSquare,
  Archive,
  RotateCcw,
  Layers,
  Package,
  XCircle,
  Star,
} from "lucide-react";
import type {
  QuoteConfigData,
  TierConfig,
  AddonConfig,
  ScopeItemConfig,
  HomeownerProductConfig,
} from "../../../shared/quoteConfigTypes";
import { formatAESTDate, formatAESTDateTime, nowAEST } from "../../../shared/aestUtils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


// ─── Password Gate ────────────────────────────────────────────────────

function PasswordGate({
  onAuthenticated,
}: {
  onAuthenticated: (pw: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const verify = trpc.admin.verifyPassword.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await verify.mutateAsync({ password });
      if (result.valid) {
        onAuthenticated(password);
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Connection error — please try again");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm"
      >
        <div className="text-center mb-6">
          <img
            src={LOGO_BLACK_PNG}
            alt="Bell Carpets"
            className="h-10 mx-auto mb-1"
          />
          <p className="text-[9px] tracking-[0.25em] text-zinc-400 uppercase font-light mb-4">RESIDENTIAL | COMMERCIAL | PROJECTS</p>
          <h1 className="text-xl text-zinc-900 font-semibold">
            Admin Panel
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Quote Manager</p>
        </div>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none mb-3"
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-3 rounded-xl bg-zinc-900 text-white font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Verifying..." : "Access Admin"}
        </button>
      </form>
    </div>
  );
}

// ─── Reusable UI Helpers ──────────────────────────────────────────────

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4 bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-zinc-900">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  // For number inputs: use a local display string so we can clear on focus
  // and restore if the user leaves without typing anything.
  const [displayValue, setDisplayValue] = useState<string | null>(null);
  const prevValueRef = useRef<string | number>(value);

  // Keep prevValueRef in sync when the external value changes
  useEffect(() => {
    if (displayValue === null) {
      prevValueRef.current = value;
    }
  }, [value, displayValue]);

  const isNumber = type === 'number';
  const inputValue = isNumber && displayValue !== null ? displayValue : String(value);

  if (multiline) {
    return (
      <div>
        <label className="block text-xs text-zinc-500 mb-1">{label}</label>
        <textarea
          value={String(value)}
          onChange={(e) => {
            onChange(e.target.value);
            // Auto-expand: reset height then set to scrollHeight
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          ref={(el) => {
            // Set initial height on mount
            if (el) {
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }
          }}
          placeholder={placeholder}
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none resize-none overflow-hidden"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      <input
        type={isNumber ? 'text' : type}
        inputMode={isNumber ? 'numeric' : undefined}
        pattern={isNumber ? '[0-9]*' : undefined}
        value={inputValue}
        onChange={(e) => {
          if (isNumber) {
            setDisplayValue(e.target.value);
            const num = parseFloat(e.target.value);
            if (!isNaN(num)) onChange(String(num));
          } else {
            onChange(e.target.value);
          }
        }}
        onFocus={() => {
          if (isNumber) {
            prevValueRef.current = value;
            setDisplayValue('');
          }
        }}
        onBlur={() => {
          if (isNumber) {
            // If user left the field empty, restore the previous value
            if (displayValue === '' || displayValue === null) {
              onChange(String(prevValueRef.current));
            }
            setDisplayValue(null);
          }
        }}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none"
      />
    </div>
  );
}

// ─── Homeowner Product Editor ────────────────────────────────────────

const MANUFACTURER_OPTIONS = [
  "Redbook", "Victoria Carpets", "Godfrey Hirst", "Feltex", "EC Carpets",
];
const FIBRE_OPTIONS = [
  "Wool", "Nylon", "Duratuft Polyester", "Polyester", "Polypropylene",
];
const STYLE_OPTIONS = [
  "Textured Loop Pile", "Twist Pile", "Cut Pile",
];
const UNDERLAY_OPTIONS = [
  "Dunlop Springtred Protect",
  "Dunlop Springtred Ultimate",
  "Dunlop Eureka",
];

function ComboSelect({
  label, value, options, onChange, placeholder,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void; placeholder?: string }) {
  // Derive custom mode from current value — don't rely on stale useState initial
  const isCustom = value !== "" && !options.includes(value);
  const [forceCustom, setForceCustom] = useState(false);
  const showCustom = isCustom || forceCustom;
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      {!showCustom ? (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => {
              if (e.target.value === "__custom__") { setForceCustom(true); onChange(""); }
              else onChange(e.target.value);
            }}
            style={{ WebkitAppearance: "none", appearance: "none" }}
            className="w-full px-3 py-2 pr-8 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none"
          >
            <option value="">{placeholder || `Select ${label}`}</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
            <option value="__custom__">Other (type custom)…</option>
          </select>
          {/* Custom chevron visible on all platforms */}
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">▾</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={`Type custom ${label.toLowerCase()}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none"
          />
          <button type="button" onClick={() => { setForceCustom(false); onChange(""); }} className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-900 border border-zinc-200 rounded-lg">List</button>
        </div>
      )}
    </div>
  );
}

function HomeownerProductEditor({
  product,
  onChange,
}: {
  product: HomeownerProductConfig;
  onChange: (updated: HomeownerProductConfig) => void;
}) {
  const update = (partial: Partial<HomeownerProductConfig>) =>
    onChange({ ...product, ...partial });

  return (
    <div className="space-y-3">
      {/* Row 1: Manufacturer + Product Name */}
      <div className="grid grid-cols-2 gap-3">
        <ComboSelect label="Manufacturer" value={product.manufacturer} options={MANUFACTURER_OPTIONS} onChange={(v) => update({ manufacturer: v })} />
        <Field label="Product Name" value={product.productName} onChange={(v) => update({ productName: v })} />
      </div>
      {/* Row 2: Colour Name */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Colour Name</label>
        <input
          type="text"
          placeholder="e.g. Charcoal, Silver Birch, Ocean Mist"
          value={product.colourName || ""}
          onChange={(e) => update({ colourName: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none"
        />
      </div>
      {/* Row 3: Fibre + Style */}
      <div className="grid grid-cols-2 gap-3">
        <ComboSelect label="Yarn / Fibre" value={product.fibre} options={FIBRE_OPTIONS} onChange={(v) => update({ fibre: v })} />
        <ComboSelect label="Style" value={product.pileType} options={STYLE_OPTIONS} onChange={(v) => update({ pileType: v })} />
      </div>
      {/* Row 4: Underlay */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Underlay</label>
        <div className="relative">
          <select
            value={product.underlay || ""}
            onChange={(e) => update({ underlay: e.target.value as import("../../../shared/quoteConfigTypes").UnderlayOption })}
            style={{ WebkitAppearance: "none", appearance: "none" }}
            className="w-full px-3 py-2 pr-8 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none"
          >
            <option value="">No underlay selected</option>
            {UNDERLAY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">▾</span>
        </div>
      </div>
      <Field label="Price (inc GST, whole dollars)" value={product.price} onChange={(v) => update({ price: parseInt(v) || 0 })} type="number" />
      <Field label="Product URL" value={product.productUrl} onChange={(v) => update({ productUrl: v })} />

      {/* Badges */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Badges / Certifications</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {product.badges.map((badge, i) => (
            <div key={i} className="flex items-center gap-1 bg-zinc-100 px-2 py-1 rounded border border-zinc-200 text-xs text-zinc-600">
              <input
                value={badge}
                onChange={(e) => {
                  const badges = [...product.badges];
                  badges[i] = e.target.value;
                  update({ badges });
                }}
                className="bg-transparent border-none text-xs text-zinc-600 focus:outline-none w-24"
              />
              <button type="button" onClick={() => update({ badges: product.badges.filter((_, bi) => bi !== i) })} className="text-red-400">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => update({ badges: [...product.badges, ""] })} className="text-xs text-zinc-600 border border-dashed border-zinc-300 px-2 py-1 rounded hover:bg-zinc-100">
            <Plus className="w-3 h-3 inline mr-1" />Add
          </button>
        </div>
      </div>

    </div>
  );
}

// ─── Tier Editor ──────────────────────────────────────────────────────

function TierEditor({
  tier,
  onChange,
}: {
  tier: TierConfig;
  onChange: (updated: TierConfig) => void;
}) {
  const update = (partial: Partial<TierConfig>) =>
    onChange({ ...tier, ...partial });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Tier Name"
          value={tier.name}
          onChange={(v) => update({ name: v })}
        />
        <Field
          label="Label"
          value={tier.label}
          onChange={(v) => update({ label: v })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Product Name"
          value={tier.productName}
          onChange={(v) => update({ productName: v })}
        />
        <Field
          label="Manufacturer"
          value={tier.manufacturer}
          onChange={(v) => update({ manufacturer: v })}
        />
      </div>
      <Field
        label="Price (inc GST, whole dollars)"
        value={tier.price}
        onChange={(v) => update({ price: parseInt(v) || 0 })}
        type="number"
      />
      <Field
        label="Product URL"
        value={tier.productUrl}
        onChange={(v) => update({ productUrl: v })}
      />
      {/* Carpet Colour */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Carpet Colour</label>
        <input
          type="text"
          placeholder="e.g. Charcoal, Silver Birch, Ocean Mist"
          value={tier.colourName || ""}
          onChange={(e) => update({ colourName: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none"
        />
      </div>
      {/* Underlay */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Underlay</label>
        <div className="relative">
          <select
            value={tier.underlay || ""}
            onChange={(e) => update({ underlay: e.target.value as import("../../../shared/quoteConfigTypes").UnderlayOption })}
            style={{ WebkitAppearance: "none", appearance: "none" }}
            className="w-full px-3 py-2 pr-8 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none"
          >
            <option value="">No underlay selected</option>
            {UNDERLAY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">▾</span>
        </div>
      </div>


    </div>
  );
}

// ─── Template Message Buttons ────────────────────────────────────────────────────────────

const MESSAGE_TEMPLATES = [
  {
    id: "new_quote",
    label: "New Quote",
    template: (name: string, link: string, address?: string) => {
      const addressLine = address ? ` for ${address}` : '';
      return `Hey ${name || "there"},\n\nI've just emailed your flooring quote${addressLine}  - you can also view it here:\n${link}\n\nIf you have any questions, don't hesitate to contact me.\n\nThanks, Leon`;
    },
  },
  {
    id: "follow_up",
    label: "Follow Up",
    template: (name: string, _link: string, address?: string) => {
      const addressLine = address ? ` for ${address}` : '';
      return `Hey ${name || "there"},\n\nStill thinking on the carpet${addressLine} or have you got it sorted?\n\nCheers,\nLeon`;
    },
  },
  {
    id: "thanks_accepted",
    label: "Thanks",
    template: (name: string, _link: string) =>
      `Hey ${name || "there"},\n\nThanks for approving the quote — really appreciate it.\n\nWe'll be in touch shortly to lock in the installation date.\n\nCheers,\nLeon`,
  },
  {
    id: "deposit_received",
    label: "Deposit Received",
    template: (name: string, _link: string) =>
      `Hey ${name || "there"},\n\nThanks for the deposit — we've got that locked in.\n\nWe'll confirm your installation date shortly.\n\nCheers,\nLeon`,
  },
];

// ─── Email Template Button ──────────────────────────────────────────────────────
function EmailTemplateButton({ clientName, quoteLink, propertyAddress, onCopied }: { clientName: string; quoteLink: string; propertyAddress?: string; onCopied?: () => void }) {
  const [copied, setCopied] = useState(false);
  const firstName = (clientName || "there").split(" ")[0] || "there";
  const addressLine = propertyAddress ? ` for ${propertyAddress}` : '';
  const emailBody = `Hi ${firstName},

Your personalised quote${addressLine} is ready and can be viewed using the link below:

${quoteLink}

The quote includes full product specifications, underlay details, scope of works, and pricing. It can be approved with a single click.

Once approved, we'll prioritise scheduling to minimise vacancy time and have your property tenant-ready as quickly as possible.

If you'd like to discuss anything or need any adjustments, I'm available on the number below.`;
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(emailBody).then(() => {
      setCopied(true);
      toast.success("Email template copied — paste into Gmail");
      onCopied?.();
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      toast.error("Could not copy — please try again");
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="w-full py-2 rounded-lg text-sm font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/25 transition-colors flex items-center justify-center gap-2"
    >
      {copied ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
      {copied ? "Copied!" : "Email Template"}
    </button>
  );
}

/** Format a raw AU phone number into a dialable string for sms: URIs (strips spaces/dashes, converts 04xx to +614xx) */
function formatSmsPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("04")) return "+61" + digits.slice(1);
  if (digits.startsWith("61")) return "+" + digits;
  return digits;
}

function TemplateMessageButtons({
  clientName,
  quoteLink,
  quoteSlug,
  phone,
  scheduledDate,
  balanceOwing,
  jobStatus,
  propertyAddress,
  expiresAt,
}: {
  clientName: string;
  quoteLink: string;
  quoteSlug?: string;
  phone?: string;
  scheduledDate?: Date | null;
  balanceOwing?: number | null;
  jobStatus?: string;
  propertyAddress?: string;
  expiresAt?: Date | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const openSms = (e: React.MouseEvent, msg: string) => {
    e.stopPropagation();
    if (phone) {
      const to = formatSmsPhone(phone);
      window.open(`sms:${to}?body=${encodeURIComponent(msg)}`, "_self");
    } else {
      // No phone stored — fall back to clipboard
      navigator.clipboard.writeText(msg).then(() => {
        toast.success("No phone on file — message copied instead!");
      }).catch(() => {
        toast.error("Could not copy. Message: " + msg);
      });
    }
  };

  const firstName = (clientName || "there").split(" ")[0] || "there";

  // Build the Job Scheduled message if we have a date
  const scheduledMsg = scheduledDate
    ? `Hey ${firstName},\n\nYour carpet installation is booked for ${scheduledDate.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Brisbane" })}.\n\nPlease make sure access is available on the day. Any questions, give us a call on 07 5571 1177.\n\nCheers,\nLeon`
    : null;

  // Build the Expiry Reminder message if the quote is still open and has an expiry date
  const expiryReminderMsg = (() => {
    if (!expiresAt) return null;
    const openStatuses = ["quote_sent", "draft"];
    if (jobStatus && !openStatuses.includes(jobStatus)) return null;
    const expDate = new Date(expiresAt);
    if (expDate < new Date()) return null; // already expired
    const expiryDay = expDate.toLocaleDateString("en-AU", { weekday: "long", timeZone: "Australia/Brisbane" });
    const addrLine = propertyAddress ? ` for ${propertyAddress}` : '';
    return `Hey ${firstName},\n\nYour carpet quote${addrLine} expires ${expiryDay}. After that I'd need to requote at current prices. No dramas either way — just didn't want you caught off guard. ${quoteLink}\n\nCheers,\nLeon`;
  })();

  // Build the Job Done / completion message with invoice link
  const invoicePageLink = quoteSlug ? `${window.location.origin}/invoice/${quoteSlug}` : quoteLink;
  const propertyAddressLine = propertyAddress ? ` at ${propertyAddress}` : '';
  const balanceMsg =
    balanceOwing && balanceOwing > 0
      ? `Hey ${firstName},\n\nJust letting you know the carpet${propertyAddressLine} has been completed and the property is ready for handover.\n\nI've included the invoice below for your records:\n${invoicePageLink}\n\nIf you need anything else, don't hesitate to reach out.\n\nCheers,\nLeon`
      : null;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="w-full py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center justify-center gap-1.5"
      >
        <MessageSquare className="w-3 h-3" />
        {expanded ? "Hide Templates" : "Text Templates"}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1.5">
          {MESSAGE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={(e) => openSms(e, t.template(clientName || "there", quoteLink, propertyAddress))}
              className="w-full text-left px-3 py-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-700 group-hover:text-zinc-900">{t.label}</span>
                <MessageSquare className="w-3 h-3 text-zinc-400 group-hover:text-amber-500 transition-colors" />
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">
                {t.template(clientName || "there", quoteLink, propertyAddress).substring(0, 80)}...
              </p>
            </button>
          ))}
          {/* Job Scheduled template — only shown when a scheduled date is set */}
          {scheduledMsg && (
            <button
              onClick={(e) => openSms(e, scheduledMsg)}
              className="w-full text-left px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/20 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-purple-300 group-hover:text-purple-200">Job Scheduled</span>
                <MessageSquare className="w-3 h-3 text-purple-400/50 group-hover:text-purple-400 transition-colors" />
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">
                {scheduledMsg.substring(0, 80)}...
              </p>
            </button>
          )}
          {/* Expiry Reminder — only shown for open quotes that haven't expired yet */}
          {expiryReminderMsg && (
            <button
              onClick={(e) => openSms(e, expiryReminderMsg)}
              className="w-full text-left px-3 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/20 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-orange-300 group-hover:text-orange-200">Expiry Reminder</span>
                <MessageSquare className="w-3 h-3 text-orange-400/50 group-hover:text-orange-400 transition-colors" />
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">
                {expiryReminderMsg.substring(0, 80)}...
              </p>
            </button>
          )}
          {/* Text Balance — only shown when there is an outstanding balance */}
          {balanceMsg && (
            <button
              onClick={(e) => openSms(e, balanceMsg)}
              className="w-full text-left px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-300 group-hover:text-emerald-200">
                  Text Balance — ${balanceOwing!.toLocaleString()} owing
                </span>
                <MessageSquare className="w-3 h-3 text-emerald-400/50 group-hover:text-emerald-400 transition-colors" />
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">
                {balanceMsg.substring(0, 80)}...
              </p>
            </button>
          )}
          {/* Google Review — only shown when the job is paid in full */}
          {jobStatus === "paid_in_full" && quoteSlug && (() => {
            const reviewLink = `${window.location.origin}/review/${quoteSlug}`;
            const reviewMsg = `Hey ${firstName},\n\nThank you for choosing Bell Carpets — we hope you love your new floors!\n\nWe'd be grateful if you could take a moment to share your experience:\n${reviewLink}\n\nCheers,\nLeon`;
            return (
              <button
                onClick={(e) => openSms(e, reviewMsg)}
                className="w-full text-left px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-300 group-hover:text-amber-200">
                    Google Review
                  </span>
                  <MessageSquare className="w-3 h-3 text-amber-400/50 group-hover:text-amber-400 transition-colors" />
                </div>
                <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">
                  {reviewMsg.substring(0, 80)}...
                </p>
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Invoice Download Button ──────────────────────────────────────────────────────────────

function InvoiceDownloadButton({
  password,
  quoteSlug,
  quoteNumber,
  onCreated,
  iconOnly,
}: {
  password: string;
  quoteSlug: string;
  quoteNumber: string;
  onCreated?: () => void;
  iconOnly?: boolean;
}) {
  const { data: invoice, isLoading, refetch } = trpc.invoice.getByQuote.useQuery(
    { password, quoteSlug },
    { refetchOnWindowFocus: false }
  );
  const generateMutation = trpc.invoice.generate.useMutation();
  const [creating, setCreating] = useState(false);

  if (isLoading) return null;

  if (!invoice) {
    return (
      <button
        onClick={async (e) => {
          e.stopPropagation();
          setCreating(true);
          try {
            await generateMutation.mutateAsync({ password, quoteSlug });
            await refetch();
            onCreated?.();
            toast.success(`Invoice created for ${quoteNumber}`);
          } catch (err) {
            toast.error("Failed to create invoice");
          } finally {
            setCreating(false);
          }
        }}
        disabled={creating}
        className="py-1.5 px-2 rounded-lg text-xs text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-1 border border-amber-500/20"
        title={`Create invoice for ${quoteNumber}`}
      >
        {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
        {creating ? "Creating..." : "Create Invoice"}
      </button>
    );
  }

  return (
    <a
      href={invoice.pdfUrl ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="py-1.5 px-2 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      title={`Download invoice for ${quoteNumber}`}
    >
      <Download className="w-3 h-3" /> Invoice
    </a>
  );
}// ─── Balance SMS Button ─────────────────────────────────────────────────────────────────


type JobStatus = "draft" | "quote_sent" | "accepted" | "deposit_paid" | "scheduled" | "completed" | "paid_in_full";
type QuoteType = "agent" | "homeowner" | "real_estate" | "agency_single";

type StatusConfig = { value: JobStatus; label: string; color: string; bg: string; icon: typeof Send };

// All possible status configs (shared lookup table)
const ALL_STATUS_CONFIGS: StatusConfig[] = [
  { value: "draft",        label: "Draft",        color: "text-zinc-400",    bg: "bg-zinc-500/10",    icon: FileText },
  { value: "quote_sent",   label: "Quote Sent",   color: "text-amber-400",   bg: "bg-amber-500/10",   icon: Send },
  { value: "accepted",     label: "Accepted",     color: "text-blue-400",    bg: "bg-blue-500/10",    icon: CheckCircle2 },
  { value: "deposit_paid", label: "Deposit Paid", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: Banknote },
  { value: "scheduled",    label: "Scheduled",    color: "text-purple-400",  bg: "bg-purple-500/10",  icon: Calendar },
  { value: "completed",    label: "Completed",    color: "text-cyan-400",    bg: "bg-cyan-500/10",    icon: CircleCheckBig },
  { value: "paid_in_full", label: "Invoice Paid", color: "text-green-400",   bg: "bg-green-500/10",   icon: DollarSign },
];

// Agent pipeline: Draft > Quote Sent > Accepted > Scheduled > Completed > Invoice Paid (no Deposit Paid)
const AGENT_PIPELINE: StatusConfig[] = ALL_STATUS_CONFIGS.filter(
  (s) => s.value !== "deposit_paid"
);

// Private/homeowner pipeline: Draft > Quote Sent > Accepted > [Deposit Paid OR Scheduled] > Completed > Paid in Full
// Deposit Paid is optional — Leon can go directly from Accepted to Scheduled if needed.
const PRIVATE_PIPELINE: StatusConfig[] = ALL_STATUS_CONFIGS.map((s) =>
  s.value === "paid_in_full" ? { ...s, label: "Paid in Full" } : s
);

// Helper: Get the next allowed statuses from a given status.
// For homeowner quotes, from "accepted" you can go to either "deposit_paid" OR "scheduled".
function getNextStatuses(currentStatus: JobStatus, quoteType: QuoteType | string | undefined): JobStatus[] {
  const pipeline = getPipeline(quoteType);
  const currentIdx = pipeline.findIndex((s) => s.value === currentStatus);
  if (currentIdx < 0 || currentIdx >= pipeline.length - 1) return [];
  
  // Special case: homeowner quotes at "accepted" can go to either "deposit_paid" or "scheduled"
  if (quoteType === "homeowner" && currentStatus === "accepted") {
    return ["deposit_paid", "scheduled"];
  }
  
  // Default: just the next status in the pipeline
  return [pipeline[currentIdx + 1]!.value];
}

function getPipeline(quoteType: QuoteType | string | undefined): StatusConfig[] {
  // homeowner uses private pipeline (with deposit step)
  // agent, real_estate, agency_single all use agent pipeline (no deposit step)
  return quoteType === "homeowner" ? PRIVATE_PIPELINE : AGENT_PIPELINE;
}

// All statuses across both pipelines for the combined dashboard tiles
const DASHBOARD_STATUSES: StatusConfig[] = ALL_STATUS_CONFIGS;

function getStatusConfig(status: JobStatus, quoteType?: QuoteType | string): StatusConfig {
  const pipeline = quoteType ? getPipeline(quoteType) : ALL_STATUS_CONFIGS;
  return pipeline.find((s) => s.value === status) || ALL_STATUS_CONFIGS.find((s) => s.value === status) || ALL_STATUS_CONFIGS[0]!;
}

function StatusBadge({ status }: { status: JobStatus }) {
  const cfg = getStatusConfig(status);
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} text-xs`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function StatusDropdown({
  currentStatus,
  quoteType,
  onSelect,
  disabled,
  compact,
}: {
  currentStatus: JobStatus;
  quoteType: QuoteType | string;
  onSelect: (status: JobStatus) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pipeline = getPipeline(quoteType);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        disabled={disabled}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors disabled:opacity-50"
      >
        <CircleDot className="w-3 h-3" /> Status <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div
          className="absolute right-0 bottom-full z-50 mb-1 bg-white border border-zinc-200 rounded-xl shadow-xl w-56 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {pipeline.map((s) => {
            const Icon = s.icon;
            const isCurrent = s.value === currentStatus;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => { onSelect(s.value); setOpen(false); }}
                className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors border-b border-zinc-100 last:border-0 ${
                  isCurrent
                    ? `${s.bg} ${s.color} font-semibold`
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isCurrent ? s.color : "text-zinc-400"}`} />
                <span className="flex-1">{s.label}</span>
                {isCurrent && <span className="text-[10px] text-zinc-400 flex-shrink-0">current</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Quotes Dashboard ─────────────────────────────────────────────────

/** Safety guard — prevents raw JSON or objects from rendering in JSX */
function safeString(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return '';  // silently drop objects/arrays
  const s = String(val);
  if (s.length > 300) return s.substring(0, 50) + '...';
  if (s.includes('"pricingMode"') || s.includes('"colours"') || s.includes('"swatchImage"') || s.includes('"configJson"')) return '';
  return s;
}

/** Format a Date as relative time (e.g. "2 hours ago", "3 days ago") */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatAESTDate(date, { day: 'numeric', month: 'short', year: 'numeric' });
}

function QuotesDashboard({
  password,
  onEditQuote,
}: {
  password: string;
  onEditQuote: (slug: string) => void;
}) {
  const { data: quotesList, isLoading, refetch } = trpc.admin.listQuotes.useQuery(
    { password },
    { refetchOnWindowFocus: false }
  );
  const createMutation = trpc.admin.createQuote.useMutation();
  const duplicateMutation = trpc.admin.duplicateQuote.useMutation();
  const deleteMutation = trpc.admin.deleteQuote.useMutation();
  const restoreMutation = trpc.admin.restoreQuote.useMutation();
  const updateStatusMutation = trpc.admin.updateJobStatus.useMutation();
  const markEmailedMutation = trpc.admin.markEmailed.useMutation();
  const requestReviewMutation = trpc.admin.requestReview.useMutation();
  const markReviewReceivedMutation = trpc.admin.markReviewReceived.useMutation();
  const saveContactMutation = trpc.contacts.create.useMutation();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newQuoteForm, setNewQuoteForm] = useState({
    quoteType: "agent" as QuoteType,
    clientName: "",
    propertyAddress: "",
    agentName: "",
    agentEmail: "",
    agentPhone: "",
    agentPropertyManager: "",
    isInsuranceAssessment: false,
    linkedQuoteSlug: "",
  });
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all" | "expired" | "archived">("all");
  const [sortField, setSortField] = useState<"date" | "quote" | "client" | "status" | "value">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { data: archivedQuotes, refetch: refetchArchived } = trpc.admin.listDeletedQuotes.useQuery(
    { password },
    { enabled: statusFilter === "archived", refetchOnWindowFocus: false }
  );
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "agency" | "homeowner">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Status summary counts
  const statusCounts = (quotesList || []).reduce(
    (acc, q) => {
      const s = q.jobStatus as JobStatus;
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    {} as Record<JobStatus, number>
  );

  const [scheduleDateModal, setScheduleDateModal] = useState<{ slug: string; status: JobStatus } | null>(null);
  const [scheduleDateInput, setScheduleDateInput] = useState("");

  // Deposit amount modal state (list view)
  const [depositModal, setDepositModal] = useState<{ slug: string; suggestedAmount: number } | null>(null);
  const [depositAmountInput, setDepositAmountInput] = useState("");

  // Tier accept modal state (list view) — for tiered quotes only
  const [tierAcceptModal, setTierAcceptModal] = useState<{ slug: string; tiers: { name: string; price: number }[] } | null>(null);
  const [tierAcceptSelected, setTierAcceptSelected] = useState<string>("");

  const handleStatusChange = async (slug: string, newStatus: JobStatus, quoteTotal?: number, depositPercent?: number, tierSummaries?: { name: string; price: number }[], pricingMode?: string) => {
    // If moving to "accepted" for a tiered quote, prompt for tier selection
    if (newStatus === "accepted" && pricingMode !== "single" && tierSummaries && tierSummaries.length > 1) {
      setTierAcceptSelected("");
      setTierAcceptModal({ slug, tiers: tierSummaries });
      return;
    }
    // If moving to "scheduled", prompt for a date first
    if (newStatus === "scheduled") {
      setScheduleDateInput("");
      setScheduleDateModal({ slug, status: newStatus });
      return;
    }
    // If moving to "deposit_paid", prompt for actual deposit amount
    if (newStatus === "deposit_paid") {
      const suggested = quoteTotal && depositPercent ? Math.round(quoteTotal * (depositPercent / 100)) : 0;
      setDepositAmountInput(suggested > 0 ? String(suggested) : "");
      setDepositModal({ slug, suggestedAmount: suggested });
      return;
    }
    try {
      await updateStatusMutation.mutateAsync({ password, slug, jobStatus: newStatus });
      toast.success(`Status updated to ${getStatusConfig(newStatus).label}`);
      refetch();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleTierAcceptConfirm = async () => {
    if (!tierAcceptModal || !tierAcceptSelected) return;
    const selectedTier = tierAcceptModal.tiers.find(t => t.name === tierAcceptSelected);
    try {
      await updateStatusMutation.mutateAsync({
        password,
        slug: tierAcceptModal.slug,
        jobStatus: "accepted",
        acceptedTierName: tierAcceptSelected,
        acceptedTierTotal: selectedTier?.price,
      });
      toast.success(`Accepted — ${tierAcceptSelected} tier recorded`);
      refetch();
    } catch {
      toast.error("Failed to update status");
    }
    setTierAcceptModal(null);
    setTierAcceptSelected("");
  };

  const handleDepositConfirm = async () => {
    if (!depositModal) return;
    const amount = parseInt(depositAmountInput, 10);
    if (!depositAmountInput || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid deposit amount");
      return;
    }
    try {
      await updateStatusMutation.mutateAsync({
        password,
        slug: depositModal.slug,
        jobStatus: "deposit_paid",
        depositPaidAmount: amount,
      });
      toast.success(`Deposit of $${amount.toLocaleString()} recorded — status → Deposit Paid`);
      refetch();
    } catch {
      toast.error("Failed to update status");
    }
    setDepositModal(null);
  };

  const handleScheduleDateConfirm = async () => {
    if (!scheduleDateModal) return;
    try {
      const scheduledDate = scheduleDateInput ? new Date(scheduleDateInput + "T00:00:00") : null;
      await updateStatusMutation.mutateAsync({
        password,
        slug: scheduleDateModal.slug,
        jobStatus: scheduleDateModal.status,
        scheduledDate,
      });
      toast.success(`Status → Scheduled${scheduledDate ? " · " + formatAESTDate(scheduledDate, { day: "numeric", month: "short", year: "numeric" }) : ""}`);
      refetch();
    } catch {
      toast.error("Failed to update status");
    }
    setScheduleDateModal(null);
  };

  const handleCreate = async (overrideType?: QuoteType) => {
    const effectiveType = overrideType || newQuoteForm.quoteType;
    setShowTypeModal(false);
    setCreating(true);
    try {
      // For homeowner quotes: clientName = agentName (contact name IS the client name — no separate field)
      // For agent/real_estate/agency_single: clientName = agency name (separate from contact person)
      const resolvedClientName = effectiveType === "homeowner"
        ? newQuoteForm.agentName
        : newQuoteForm.clientName;
      const result = await createMutation.mutateAsync({
        password,
        quoteType: effectiveType,
        clientName: resolvedClientName,
        propertyAddress: newQuoteForm.propertyAddress,
        agentName: newQuoteForm.agentName,
        agentEmail: newQuoteForm.agentEmail,
        agentPhone: newQuoteForm.agentPhone,
        agentPropertyManager: newQuoteForm.agentPropertyManager || undefined,
        sendQuoteEmail: false,
        isInsuranceAssessment: newQuoteForm.isInsuranceAssessment,
        linkedQuoteSlug: newQuoteForm.linkedQuoteSlug || undefined,
      });
      toast.success(`Quote ${result.quoteNumber} created!`);
      refetch();
      // Offer to save as a contact
      // For agency/real_estate/agency_single: save agency name (clientName) with agency email/phone only
      // For homeowner: save customer name (agentName) with customer email/phone
      const isAgencyQuote = effectiveType === "agent" || effectiveType === "real_estate" || effectiveType === "agency_single";
      const contactNameToSave = isAgencyQuote ? newQuoteForm.clientName : newQuoteForm.agentName;
      const contactEmailToSave = newQuoteForm.agentEmail; // Same field for both (agency email or customer email)
      const contactPhoneToSave = newQuoteForm.agentPhone; // Same field for both (agency phone or customer phone)
      
      if (contactNameToSave.trim()) {
        toast(
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Save {contactNameToSave} as a contact?</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await saveContactMutation.mutateAsync({
                      password,
                      name: contactNameToSave,
                      email: contactEmailToSave || undefined,
                      phone: contactPhoneToSave || undefined,
                    });
                    toast.success(`${contactNameToSave} saved to contacts`);
                  } catch {
                    toast.error("Could not save contact");
                  }
                }}
                className="px-3 py-1 rounded-lg bg-white text-black text-xs font-semibold"
              >
                Save
              </button>
              <button
                onClick={() => {}}
                className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-xs"
              >
                Skip
              </button>
            </div>
          </div>,
          { duration: 8000 }
        );
      }
      onEditQuote(result.slug);
    } catch (err) {
      toast.error("Failed to create quote: " + (err instanceof Error ? err.message : "Unknown error"));
    }
    setCreating(false);
  };

  const handleDuplicate = async (sourceSlug: string, quoteNumber: string) => {
    try {
      const result = await duplicateMutation.mutateAsync({
        password,
        sourceSlug,
      });
      toast.success(`Duplicated ${quoteNumber} → ${result.quoteNumber}`);
      refetch();
    } catch (err) {
      toast.error("Failed to duplicate: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleDelete = async (slug: string, quoteNumber: string) => {
    if (!confirm(`Delete quote ${quoteNumber}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync({ password, slug });
      toast.success(`Quote ${quoteNumber} deleted`);
      refetch();
    } catch (err) {
      toast.error("Failed to delete: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const isExpiredQuote = (q: { expiresAt?: Date | null; jobStatus: string }) => {
    if (!q.expiresAt) return false;
    // Draft quotes are not yet "sent" so they can't be expired
    if (q.jobStatus === "draft") return false;
    return new Date(q.expiresAt) < new Date() && q.jobStatus === "quote_sent";
  };

  const getDaysRemaining = (expiresAt?: Date | null) => {
    if (!expiresAt) return null;
    const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Unique agent names for the dropdown
  const uniqueAgents = Array.from(
    new Set(
      (quotesList || [])
        .map((q) => q.agentName || q.acceptedAgentName || "")
        .filter(Boolean)
    )
  ).sort();

  const filteredQuotes = (quotesList || []).filter((q) => {
    // Archived filter uses separate query, skip normal list
    if (statusFilter === "archived") return false;
    // Expired filter
    if (statusFilter === "expired") return isExpiredQuote(q);
    // Status filter
    if (statusFilter !== "all" && q.jobStatus !== statusFilter) return false;
    // Type filter
    if (typeFilter === "agency" && q.quoteType === "homeowner") return false;
    if (typeFilter === "homeowner" && q.quoteType !== "homeowner") return false;
    // Agent filter
    if (agentFilter !== "all") {
      const qAgent = q.agentName || q.acceptedAgentName || "";
      if (qAgent !== agentFilter) return false;
    }
    // Date range filter
    if (dateFrom && q.createdAt) {
      const created = new Date(q.createdAt);
      const from = new Date(dateFrom + "T00:00:00");
      if (created < from) return false;
    }
    if (dateTo && q.createdAt) {
      const created = new Date(q.createdAt);
      const to = new Date(dateTo + "T23:59:59");
      if (created > to) return false;
    }
    // Search filter
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.quoteNumber.toLowerCase().includes(s) ||
      q.clientName.toLowerCase().includes(s) ||
      q.propertyAddress.toLowerCase().includes(s) ||
      (q.agentName || "").toLowerCase().includes(s) ||
      (q.acceptedAgentName || "").toLowerCase().includes(s)
    );
  });
  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    let aVal: string | number = 0;
    let bVal: string | number = 0;
    if (sortField === "date") {
      aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    } else if (sortField === "quote") {
      aVal = a.quoteNumber || "";
      bVal = b.quoteNumber || "";
    } else if (sortField === "client") {
      aVal = (a.clientName || a.agentName || "").toLowerCase();
      bVal = (b.clientName || b.agentName || "").toLowerCase();
    } else if (sortField === "status") {
      aVal = a.jobStatus || "";
      bVal = b.jobStatus || "";
    } else if (sortField === "value") {
      aVal = a.acceptedTotal ?? a.lowestPrice ?? 0;
      bVal = b.acceptedTotal ?? b.lowestPrice ?? 0;
    }
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

    const expiredCount = (quotesList || []).filter(isExpiredQuote).length;
  // Summary stats for the header bar
  const pipelineValue = (quotesList || []).reduce((sum, q) => {
    if (["accepted", "deposit_paid", "scheduled", "completed"].includes(q.jobStatus)) {
      return sum + (q.acceptedTotal ?? q.highestPrice ?? 0);
    }
    return sum;
  }, 0);
  const openQuoteCount = (quotesList || []).filter(q => ["draft", "quote_sent"].includes(q.jobStatus)).length;
  const scheduledCount = (quotesList || []).filter(q => q.jobStatus === "scheduled").length;
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f7] text-zinc-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-zinc-200/80 shadow-sm">
        <div className="px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 leading-tight tracking-[-0.02em]">Quotes</h1>
              <p className="text-xs text-zinc-400 mt-0.5">{quotesList?.length || 0} total</p>
            </div>
            <button
              onClick={() => setShowTypeModal(true)}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white font-medium text-sm hover:bg-zinc-800 disabled:opacity-50 transition-colors shrink-0 shadow-sm border border-zinc-200"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              New Quote
            </button>
          </div>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3 pb-4">
            <div className="bg-zinc-50 rounded-xl px-4 py-3 border border-zinc-200/60">
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-medium mb-1">Open</p>
              <p className="text-2xl font-bold text-zinc-900 leading-none tabular-nums">{openQuoteCount}</p>
            </div>
            <div className="bg-zinc-50 rounded-xl px-4 py-3 border border-zinc-200/60">
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-medium mb-1">Scheduled</p>
              <p className="text-2xl font-bold text-zinc-900 leading-none tabular-nums">{scheduledCount}</p>
            </div>
            {expiredCount > 0 ? (
              <div className="bg-red-50 rounded-xl px-4 py-3 border border-red-200/60">
                <p className="text-[10px] uppercase tracking-[0.12em] text-red-500 font-medium mb-1">Expired</p>
                <p className="text-2xl font-bold text-red-600 leading-none tabular-nums">{expiredCount}</p>
              </div>
            ) : (
              <div className="bg-zinc-50 rounded-xl px-4 py-3 border border-zinc-200/60">
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-medium mb-1">Total</p>
                <p className="text-2xl font-bold text-zinc-900 leading-none tabular-nums">{quotesList?.length || 0}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Quote Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTypeModal(false)} />
          <div
            className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-y-auto max-h-[92vh] shadow-xl"
          >
            <div className="px-5 pt-5 pb-3 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">New Quote</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Select quote type</p>
            </div>
            <div className="p-5 space-y-2">
              {[
                { value: "homeowner", label: "Homeowner", desc: "Direct to homeowner, single price" },
                { value: "real_estate", label: "Real Estate Agency (3-Tier)", desc: "Good / Better / Best pricing" },
                { value: "agency_single", label: "Agency Single Product", desc: "Single product for agency" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleCreate(t.value as QuoteType)}
                  disabled={creating}
                  className="w-full text-left px-4 py-3.5 rounded-xl border border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 transition-all group"
                >
                  <p className="text-sm font-medium text-zinc-900 group-hover:text-zinc-900">{t.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
            <div className="px-5 pb-5">
              <button onClick={() => setShowTypeModal(false)} className="w-full py-2.5 text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="px-6 lg:px-8 py-5">
        {/* Status filter pills */}
        <div className="overflow-x-auto scrollbar-none -mx-1 px-1 mb-4">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === "all"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200 border border-zinc-200"
              }`}
            >
              All ({quotesList?.length || 0})
            </button>
            {(["draft", "quote_sent", "accepted", "deposit_paid", "scheduled", "completed", "paid_in_full"] as JobStatus[]).map((s) => {
              const count = (quotesList || []).filter((q) => q.jobStatus === s).length;
              const isActive = statusFilter === s;
              const label = s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(isActive ? "all" : s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "bg-zinc-100 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200 border border-zinc-200"
                  }`}
                >
                  {label} {count}
                </button>
              );
            })}
            {expiredCount > 0 && (
              <button
                onClick={() => setStatusFilter(statusFilter === "expired" ? "all" : "expired")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  statusFilter === "expired"
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                }`}
              >
                Expired {expiredCount}
              </button>
            )}
            <button
              onClick={() => setStatusFilter(statusFilter === "archived" ? "all" : "archived")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === "archived"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200 border border-zinc-200"
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by quote #, client, address, or agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200 transition-all"
            />
          </div>
          {/* Type toggle */}
          <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                typeFilter === "all" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter(typeFilter === "agency" ? "all" : "agency")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                typeFilter === "agency" ? "bg-sky-500 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Agency
            </button>
            <button
              onClick={() => setTypeFilter(typeFilter === "homeowner" ? "all" : "homeowner")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                typeFilter === "homeowner" ? "bg-violet-500 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Owner
            </button>
          </div>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 transition-all"
          >
            <option value="all">All Agents</option>
            {uniqueAgents.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>From</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-2 py-1.5 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-700 focus:outline-none focus:border-zinc-400" />
            <span>to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-2 py-1.5 rounded-lg bg-white border border-zinc-200 text-sm text-zinc-700 focus:outline-none focus:border-zinc-400" />
          </div>

        </div>

        {/* Archived quotes */}
        {statusFilter === "archived" && (
          <div className="space-y-2">
            {(archivedQuotes || []).length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm">No archived quotes</div>
            ) : (
              (archivedQuotes || []).map((q) => (
                <div key={q.slug} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{q.quoteNumber}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-zinc-400">{q.quoteType === "homeowner" ? (q.agentName || q.clientName || "No client") : (q.clientName || "No client")}</p>
                      {q.quoteType === "homeowner"
                        ? <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-700">Owner</span>
                        : <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-sky-100 text-sky-700">Agency</span>
                      }
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm(`Restore ${q.quoteNumber}?`)) { restoreMutation.mutate({ password, slug: q.slug }, { onSuccess: () => { refetchArchived(); refetch(); } }); } }}
                    className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Empty state */}
        {statusFilter !== "archived" && filteredQuotes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-zinc-400">
              {(search || agentFilter !== "all" || dateFrom || dateTo || statusFilter !== "all") ? "No quotes match your filters" : "No quotes yet"}
            </p>
            {!search && agentFilter === "all" && !dateFrom && !dateTo && statusFilter === "all" && (
              <p className="text-xs text-zinc-300 mt-1">
                Tap "New Quote" to create your first quote
              </p>
            )}
          </div>
        ) : statusFilter !== "archived" ? (
          /* The Table */
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="w-10 py-3 pl-4 pr-2 text-left">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-zinc-300 accent-zinc-900 cursor-pointer"
                      onChange={() => {}}
                    />
                  </th>
                  <th
                    className="py-3 pr-3 text-left text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-semibold whitespace-nowrap cursor-pointer hover:text-zinc-600 transition-colors select-none"
                    onClick={() => { setSortField("date"); setSortDir(sortField === "date" && sortDir === "desc" ? "asc" : "desc"); }}
                  >
                    Date {sortField === "date" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                  </th>
                  <th
                    className="py-3 pr-3 text-left text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-semibold whitespace-nowrap cursor-pointer hover:text-zinc-600 transition-colors select-none"
                    onClick={() => { setSortField("quote"); setSortDir(sortField === "quote" && sortDir === "desc" ? "asc" : "desc"); }}
                  >
                    Quote {sortField === "quote" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                  </th>
                  <th
                    className="py-3 pr-3 text-left text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-semibold cursor-pointer hover:text-zinc-600 transition-colors select-none"
                    onClick={() => { setSortField("client"); setSortDir(sortField === "client" && sortDir === "desc" ? "asc" : "desc"); }}
                  >
                    Client {sortField === "client" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                  </th>
                  <th
                    className="py-3 pr-3 text-left text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-semibold whitespace-nowrap cursor-pointer hover:text-zinc-600 transition-colors select-none"
                    onClick={() => { setSortField("status"); setSortDir(sortField === "status" && sortDir === "desc" ? "asc" : "desc"); }}
                  >
                    Status {sortField === "status" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                  </th>
                  <th
                    className="py-3 pr-3 text-right text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-semibold whitespace-nowrap cursor-pointer hover:text-zinc-600 transition-colors select-none"
                    onClick={() => { setSortField("value"); setSortDir(sortField === "value" && sortDir === "desc" ? "asc" : "desc"); }}
                  >
                    Value {sortField === "value" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                  </th>
                  <th className="py-3 pr-4 text-right text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-semibold w-24">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sortedQuotes.map((q) => {
                  const qDaysLeft = getDaysRemaining(q.expiresAt);
                  const qIsOpenStatus = q.jobStatus === "draft" || q.jobStatus === "quote_sent";
                  const qExpired = qIsOpenStatus && qDaysLeft !== null && qDaysLeft <= 0;
                  const qExpiringSoon = qIsOpenStatus && qDaysLeft !== null && qDaysLeft > 0 && qDaysLeft <= 3;
                  const qCancelled = q.jobStatus === "cancelled";
                  const rowClasses = [
                    "group cursor-pointer transition-colors hover:bg-zinc-50",
                    qCancelled ? "opacity-40" : "",
                    qExpired ? "border-l-2 border-l-red-400" : qExpiringSoon ? "border-l-2 border-l-amber-400" : "border-l-2 border-l-transparent",
                  ].join(" ");
                  const acceptedVal = (q.acceptedTotal ?? 0) > 0 ? q.acceptedTotal : null;
                  const displayValue = acceptedVal ?? (q.lowestPrice === q.highestPrice ? q.lowestPrice : null);
                  const valueRange =
                    !displayValue && q.lowestPrice && q.highestPrice && q.lowestPrice !== q.highestPrice
                      ? `$${q.lowestPrice.toLocaleString()} \u2013 $${q.highestPrice.toLocaleString()}`
                      : null;
                  return (
                    <tr
                      key={q.slug}
                      className={rowClasses}
                      onClick={() => onEditQuote(q.slug)}
                    >
                      <td className="py-3 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-zinc-300 accent-zinc-900 cursor-pointer" onChange={() => {}} />
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span className="text-xs text-zinc-400 tabular-nums">
                          {q.createdAt ? new Date(q.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" }) : ""}
                        </span>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-zinc-900 tracking-tight">{q.quoteNumber}</span>
                        {qExpired && <span className="ml-1.5 text-[9px] font-bold text-red-500 uppercase tracking-wider">Expired</span>}
                        {qExpiringSoon && <span className="ml-1.5 text-[9px] font-bold text-amber-500 uppercase tracking-wider">{qDaysLeft}D Left</span>}
                      </td>
                      <td className="py-3 pr-3 max-w-[200px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-xs font-medium text-zinc-800 truncate">
                            {q.quoteType === "homeowner" ? (q.agentName || q.clientName || "No client") : (q.clientName || "No client")}
                          </p>
                          {q.quoteType === "homeowner"
                            ? <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-700">Owner</span>
                            : <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-sky-100 text-sky-700">Agency</span>
                          }
                        </div>
                        {q.propertyAddress && (
                          <p className="text-[10px] text-zinc-400 truncate mt-0.5">{q.propertyAddress}</p>
                        )}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <StatusDropdown
                          currentStatus={q.jobStatus as JobStatus}
                          quoteType={q.quoteType}
                          onSelect={(newStatus) =>
                            handleStatusChange(
                              q.slug,
                              newStatus,
                              q.acceptedTotal ?? undefined,
                              q.depositPercent,
                              q.tierSummaries,
                              q.pricingMode
                            )
                          }
                          disabled={updateStatusMutation.isPending}
                          compact
                        />
                      </td>
                      <td className="py-3 pr-3 text-right whitespace-nowrap">
                        {displayValue ? (
                          <span className={`text-xs font-semibold tabular-nums ${acceptedVal ? "text-emerald-600" : "text-zinc-700"}`}>
                            ${displayValue.toLocaleString()}
                          </span>
                        ) : valueRange ? (
                          <span className="text-xs text-zinc-400 tabular-nums">{valueRange}</span>
                        ) : (
                          <span className="text-xs text-zinc-300">\u2014</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={`/quote/${q.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View quote"
                            className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            title="Duplicate"
                            onClick={() => handleDuplicate(q.slug, q.quoteNumber)}
                            className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {(q.jobStatus === "completed" || q.jobStatus === "paid_in_full") && (
                            <InvoiceDownloadButton
                              password={password}
                              quoteSlug={q.slug}
                              quoteNumber={q.quoteNumber}
                              onCreated={refetch}
                              iconOnly
                            />
                          )}
                          <button
                            title="Delete"
                            onClick={() => handleDelete(q.slug, q.quoteNumber)}
                            className="p-1.5 rounded hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );

}

// ─── Payment Terms Input (mobile-friendly clear-on-focus) ──────────────────

function PaymentTermsInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [displayValue, setDisplayValue] = useState<string | null>(null);
  const prevValueRef = useRef<number>(value);

  useEffect(() => {
    if (displayValue === null) prevValueRef.current = value;
  }, [value, displayValue]);

  const inputValue = displayValue !== null ? displayValue : String(value);

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={inputValue}
      onChange={(e) => {
        setDisplayValue(e.target.value);
        const num = parseInt(e.target.value);
        if (!isNaN(num) && num > 0) onChange(num);
      }}
      onFocus={() => {
        prevValueRef.current = value;
        setDisplayValue('');
      }}
      onBlur={() => {
        if (displayValue === '' || displayValue === null) {
          onChange(prevValueRef.current);
        }
        setDisplayValue(null);
      }}
      className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-amber-500/50 focus:outline-none"
    />
  );
}

// ─── View Analytics Panel ───────────────────────────────────────────────

function ViewAnalyticsPanel({ password, slug, viewCount, lastViewedAt }: { password: string; slug: string; viewCount: number; lastViewedAt: Date | string | null }) {
  const [expanded, setExpanded] = useState(false);
  const { data: analytics, isLoading } = trpc.admin.getQuoteViewAnalytics.useQuery(
    { password, slug },
    { enabled: expanded && viewCount > 0 }
  );

  return (
    <div className="mb-4 rounded-xl bg-white border border-zinc-200 overflow-hidden shadow-sm">
      {/* Summary row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors"
      >
        <Eye className="w-4 h-4 text-cyan-400/70 flex-shrink-0" />
        {viewCount > 0 ? (
          <div className="flex items-center gap-2 text-sm flex-1">
            <span className="text-cyan-400 font-medium">{viewCount} view{viewCount !== 1 ? 's' : ''}</span>
            {lastViewedAt && (
              <span className="text-zinc-400">· Last viewed {formatRelativeTime(new Date(lastViewedAt as string))}</span>
            )}
          </div>
        ) : (
          <span className="text-sm text-zinc-400 flex-1">Not yet viewed by client</span>
        )}
        {viewCount > 0 && (
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        )}
        {analytics?.sharingAlert && (
          <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5" /> SHARED
          </span>
        )}
      </button>

      {/* Expanded analytics */}
      {expanded && viewCount > 0 && (
        <div className="px-4 pb-4 border-t border-zinc-100">
          {isLoading ? (
            <div className="py-4 text-center text-zinc-400 text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading analytics...</div>
          ) : analytics ? (
            <div className="mt-3 space-y-3">
              {/* Summary stats */}
              <div className="flex gap-4 text-xs">
                <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <span className="text-cyan-400 font-semibold">{analytics.uniqueIPs}</span>
                  <span className="text-zinc-400 ml-1">unique IP{analytics.uniqueIPs !== 1 ? 's' : ''}</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200">
                  <span className="text-zinc-700 font-semibold">{analytics.visitors.length}</span>
                  <span className="text-zinc-400 ml-1">visitor{analytics.visitors.length !== 1 ? 's' : ''}</span>
                </div>
                {analytics.sharingAlert && (
                  <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400 font-semibold">Link being shared</span>
                  </div>
                )}
              </div>

              {/* Visitor breakdown — one card per IP/visitor */}
              <div className="space-y-2">
                {analytics.visitors.map((v: any, i: number) => {
                  // Sort timestamps newest-first for display
                  const timestamps: Date[] = (v.viewTimestamps || [v.lastSeen])
                    .map((t: Date | string) => new Date(t))
                    .sort((a: Date, b: Date) => b.getTime() - a.getTime());

                  return (
                    <div key={i} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                      {/* IP + meta row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-mono text-xs text-zinc-700">
                          {v.ipAddress === 'unknown' ? '—' : v.ipAddress}
                        </span>
                        {(v.city || v.country) && (
                          <span className="text-[11px] text-zinc-400">
                            {v.city ? `${v.city}, ${v.country}` : v.country}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          v.deviceType === 'mobile' ? 'bg-purple-500/20 text-purple-300' :
                          v.deviceType === 'tablet' ? 'bg-blue-500/20 text-blue-300' :
                          v.deviceType === 'bot' ? 'bg-red-500/20 text-red-300' :
                          'bg-zinc-600/50 text-zinc-500'
                        }`}>{v.deviceType || 'desktop'}</span>
                        <span className="ml-auto text-[11px] text-zinc-400">
                          {v.viewCount} view{v.viewCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {/* Individual view timestamps */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {timestamps.map((ts: Date, j: number) => (
                          <span key={j} className="text-[11px] text-cyan-400/70">
                            {formatAESTDateTime(ts, {
                              day: 'numeric',
                              month: 'short',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                              timeZone: 'Australia/Brisbane',
                            })}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Quote Editor ─────────────────────────────────────────────────────

function QuoteEditor({
  password,
  slug,
  onBack,
  onNavigateToQuote,
}: {
  password: string;
  slug: string;
  onBack: () => void;
  onNavigateToQuote?: (slug: string) => void;
}) {
  const { data: quoteData, isLoading, refetch: refetchQuote } = trpc.admin.getQuoteForEdit.useQuery(
    { password, slug },
    { refetchOnWindowFocus: false }
  );
  const updateMutation = trpc.admin.updateQuote.useMutation();
  const setExpiryMutation = trpc.admin.setExpiryDate.useMutation();
  const sendQuoteLinkMutation = trpc.admin.sendQuoteLink.useMutation();
  const updateStatusMutation = trpc.admin.updateJobStatus.useMutation();
  const duplicateQuoteMutation = trpc.admin.duplicateQuote.useMutation();
  const downloadPdfMutation = trpc.invoice.downloadQuotePdf.useMutation();
  const [config, setConfig] = useState<QuoteConfigData | null>(null);
  const [saving, setSaving] = useState(false);
  const [expiryInput, setExpiryInput] = useState<string>("");
  const [savingExpiry, setSavingExpiry] = useState(false);
  const [agentFields, setAgentFields] = useState({ name: "", email: "", phone: "", propertyManager: "" });
  const [sendingLink, setSendingLink] = useState(false);
  const [advancingStatus, setAdvancingStatus] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const updateNotesMutation = trpc.admin.updateInternalNotes.useMutation();
  const markEmailedMutation = trpc.admin.markEmailed.useMutation();
  const requestReviewMutation = trpc.admin.requestReview.useMutation();
  const markReviewReceivedMutation = trpc.admin.markReviewReceived.useMutation();

  const [paymentTermsDays, setPaymentTermsDays] = useState(30);
  const [savingPaymentTerms, setSavingPaymentTerms] = useState(false);
  const updatePaymentTermsMutation = trpc.admin.updatePaymentTerms.useMutation();

  const [isInsuranceAssessment, setIsInsuranceAssessment] = useState(false);
  const [linkedQuoteSlug, setLinkedQuoteSlug] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const { data: allQuotes } = trpc.admin.listQuotes.useQuery({ password });

  const [editorScheduleModal, setEditorScheduleModal] = useState(false);
  const [editorScheduleDateInput, setEditorScheduleDateInput] = useState("");
  const [pendingScheduleStatus, setPendingScheduleStatus] = useState<string | null>(null);

  // DnD sensors for scope of works reordering — pointer (desktop) + touch (mobile)
  const scopeSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  // Tier accept modal state (editor view) — for tiered quotes only
  const [editorTierAcceptModal, setEditorTierAcceptModal] = useState(false);
  const [editorTierAcceptSelected, setEditorTierAcceptSelected] = useState<string>("");

  // Deposit amount modal state (editor view)
  const [editorDepositModal, setEditorDepositModal] = useState(false);
  const [editorDepositAmountInput, setEditorDepositAmountInput] = useState("");

  // Cancel quote confirmation
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancellingQuote, setCancellingQuote] = useState(false);

  const handleCancelQuote = async () => {
    setCancellingQuote(true);
    try {
      await updateStatusMutation.mutateAsync({ password, slug, jobStatus: "cancelled" });
      toast.success("Quote cancelled — customer link is now blocked");
      refetchQuote();
    } catch {
      toast.error("Failed to cancel quote");
    }
    setCancellingQuote(false);
    setCancelConfirmOpen(false);
  };

  // Reactivate cancelled quote
  const [reactivatingQuote, setReactivatingQuote] = useState(false);
  const reactivateMutation = trpc.admin.reactivateQuote.useMutation();

  const handleReactivateQuote = async () => {
    setReactivatingQuote(true);
    try {
      await reactivateMutation.mutateAsync({ password, slug });
      toast.success("Quote reactivated — status reset to Draft, expiry set to 10 days");
      refetchQuote();
    } catch {
      toast.error("Failed to reactivate quote");
    }
    setReactivatingQuote(false);
  };

  const openEditorDepositModal = () => {
    const total = quoteData?.acceptedTotal ?? 0;
    const pct = quoteData?.config?.depositPercent ?? 50;
    const suggested = total > 0 ? Math.round(total * (pct / 100)) : 0;
    setEditorDepositAmountInput(suggested > 0 ? String(suggested) : "");
    setEditorDepositModal(true);
  };

  const handleEditorDepositConfirm = async () => {
    const amount = parseInt(editorDepositAmountInput, 10);
    if (!editorDepositAmountInput || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid deposit amount");
      return;
    }
    setAdvancingStatus(true);
    try {
      await updateStatusMutation.mutateAsync({
        password,
        slug,
        jobStatus: "deposit_paid",
        depositPaidAmount: amount,
      });
      toast.success(`Deposit of $${amount.toLocaleString()} recorded — status → Deposit Paid`);
      refetchQuote();
    } catch {
      toast.error("Failed to update status");
    }
    setAdvancingStatus(false);
    setEditorDepositModal(false);
  };

  const handleEditorTierAcceptConfirm = async () => {
    if (!editorTierAcceptSelected) return;
    const tiers = quoteData?.config?.tiers ?? [];
    const selectedTier = tiers.find((t) => t.name === editorTierAcceptSelected);
    setAdvancingStatus(true);
    try {
      await updateStatusMutation.mutateAsync({
        password,
        slug,
        jobStatus: "accepted",
        acceptedTierName: editorTierAcceptSelected,
        acceptedTierTotal: selectedTier?.price,
      });
      toast.success(`Accepted — ${editorTierAcceptSelected} tier recorded`);
      refetchQuote();
    } catch {
      toast.error("Failed to update status");
    }
    setAdvancingStatus(false);
    setEditorTierAcceptModal(false);
    setEditorTierAcceptSelected("");
  };

  const handleAdvanceStatus = async () => {
    if (!quoteData?.jobStatus) return;
    const nextStatuses = getNextStatuses(quoteData.jobStatus as JobStatus, quoteData.quoteType);
    if (nextStatuses.length === 0) return;
    
    // If multiple options (homeowner at accepted), prompt user to choose
    if (nextStatuses.length > 1) {
      // For homeowner at "accepted", show a choice dialog
      // For now, default to deposit_paid if it's an option, otherwise use first
      const hasDepositOption = nextStatuses.includes("deposit_paid");
      const hasScheduledOption = nextStatuses.includes("scheduled");
      
      // Show a simple choice: if both options exist, let user pick
      // This can be a toast with quick buttons or a modal
      // For simplicity, open deposit modal if available, user can skip it
      if (hasDepositOption && hasScheduledOption) {
        // Show choice dialog (or just go to deposit for now)
        openEditorDepositModal();
        return;
      }
    }
    
    const nextStatus = nextStatuses[0]!;
    // For tiered quotes, prompt for tier selection before marking as accepted
    if (nextStatus === "accepted" && quoteData.config?.pricingMode !== "single" && (quoteData.config?.tiers?.length ?? 0) > 1) {
      setEditorTierAcceptSelected("");
      setEditorTierAcceptModal(true);
      return;
    }
    if (nextStatus === "scheduled") {
      setEditorScheduleDateInput("");
      setPendingScheduleStatus(nextStatus);
      setEditorScheduleModal(true);
      return;
    }
    if (nextStatus === "deposit_paid") {
      openEditorDepositModal();
      return;
    }
    setAdvancingStatus(true);
    try {
      await updateStatusMutation.mutateAsync({ password, slug, jobStatus: nextStatus });
      toast.success(`Status → ${getStatusConfig(nextStatus).label}`);
      refetchQuote();
    } catch {
      toast.error("Failed to update status");
    }
    setAdvancingStatus(false);
  };

  const handleSetStatus = async (newStatus: JobStatus) => {
    // For tiered quotes, prompt for tier selection before marking as accepted
    if (newStatus === "accepted" && quoteData?.config?.pricingMode !== "single" && (quoteData?.config?.tiers?.length ?? 0) > 1) {
      setEditorTierAcceptSelected("");
      setEditorTierAcceptModal(true);
      return;
    }
    if (newStatus === "scheduled") {
      setEditorScheduleDateInput("");
      setPendingScheduleStatus(newStatus);
      setEditorScheduleModal(true);
      return;
    }
    if (newStatus === "deposit_paid") {
      openEditorDepositModal();
      return;
    }
    setAdvancingStatus(true);
    try {
      await updateStatusMutation.mutateAsync({ password, slug, jobStatus: newStatus });
      toast.success(`Status → ${getStatusConfig(newStatus).label}`);
      refetchQuote();
    } catch {
      toast.error("Failed to update status");
    }
    setAdvancingStatus(false);
  };

  const handleEditorScheduleConfirm = async () => {
    if (!pendingScheduleStatus) return;
    setAdvancingStatus(true);
    try {
      const scheduledDate = editorScheduleDateInput ? new Date(editorScheduleDateInput + "T00:00:00") : null;
      await updateStatusMutation.mutateAsync({
        password,
        slug,
        jobStatus: pendingScheduleStatus as JobStatus,
        scheduledDate,
      });
      toast.success(`Status → Scheduled${scheduledDate ? " · " + formatAESTDate(scheduledDate, { day: "numeric", month: "short", year: "numeric" }) : ""}`);
      refetchQuote();
    } catch {
      toast.error("Failed to update status");
    }
    setAdvancingStatus(false);
    setEditorScheduleModal(false);
    setPendingScheduleStatus(null);
  };

  // Sync expiry input when quoteData loads
  useEffect(() => {
    if (quoteData?.expiresAt) {
      const d = new Date(quoteData.expiresAt);
      setExpiryInput(d.toISOString().slice(0, 10));
    }
  }, [quoteData?.expiresAt]);

  // Sync agent fields from quoteData
  useEffect(() => {
    if (quoteData) {
      setAgentFields({
        name: quoteData.agentName || "",
        email: quoteData.agentEmail || "",
        phone: quoteData.agentPhone || "",
        propertyManager: quoteData.agentPropertyManager || "",
      });
    }
  }, [quoteData?.agentName, quoteData?.agentEmail, quoteData?.agentPhone, quoteData?.agentPropertyManager]);

  // Sync insurance assessment fields from quoteData
  useEffect(() => {
    if (quoteData) {
      setIsInsuranceAssessment(quoteData.isInsuranceAssessment ?? false);
      setLinkedQuoteSlug(quoteData.linkedQuoteSlug || "");
    }
  }, [quoteData?.isInsuranceAssessment, quoteData?.linkedQuoteSlug]);
  // Sync discountAmount from quoteData
  useEffect(() => {
    if (quoteData) {
      setDiscountAmount(quoteData.discountAmount ?? 0);
    }
  }, [quoteData?.discountAmount]);

  const handleSaveExpiry = async () => {
    setSavingExpiry(true);
    try {
      const newDate = expiryInput ? new Date(expiryInput + "T23:59:59") : null;
      await setExpiryMutation.mutateAsync({ password, slug, expiresAt: newDate });
      toast.success(newDate ? `Expiry set to ${formatAESTDate(newDate)}` : "Expiry date cleared");
      refetchQuote();
    } catch (err) {
      toast.error("Failed to save expiry date");
    }
    setSavingExpiry(false);
  };

  useEffect(() => {
    if (quoteData?.config && !config) {
      const loadedConfig = { ...quoteData.config };
      // Defensive: older quotes created before pricingMode existed have undefined.
      // homeowner/agency_single are always single-product; agent/real_estate are always tiered.
      if (!loadedConfig.pricingMode) {
        loadedConfig.pricingMode =
          (loadedConfig.quoteType === "homeowner" || loadedConfig.quoteType === "agency_single") ? "single" : "tiered";
      }
      // Defensive: real_estate single product quotes need a product field.
      // If missing (e.g. created before this fix), inject a blank product.
      // Defensive: real_estate single product quotes may be missing tiers array (created before backfill).
      if (!loadedConfig.tiers) {
        loadedConfig.tiers = [];
      }
      if (loadedConfig.pricingMode === "single" && !loadedConfig.product) {
        loadedConfig.product = { id: "product-1", productName: "", manufacturer: "", fibre: "", pileType: "", badges: [], price: 0, productUrl: "", colours: [] };
      }
      setConfig(loadedConfig);
    }
  }, [quoteData, config]);

  // Sync internal notes from quoteData
  useEffect(() => {
    if (quoteData) {
      setInternalNotes(quoteData.internalNotes || "");
    }
  }, [quoteData?.internalNotes]);

  // Sync payment terms from quoteData
  useEffect(() => {
    if (quoteData) {
      setPaymentTermsDays(quoteData.paymentTermsDays ?? 30);
    }
  }, [quoteData?.paymentTermsDays]);

  const handleSavePaymentTerms = async () => {
    setSavingPaymentTerms(true);
    try {
      await updatePaymentTermsMutation.mutateAsync({ password, slug, paymentTermsDays });
      toast.success("Payment terms saved");
      refetchQuote();
    } catch {
      toast.error("Failed to save payment terms");
    }
    setSavingPaymentTerms(false);
  };

  const handleSaveInternalNotes = async () => {
    setSavingNotes(true);
    try {
      await updateNotesMutation.mutateAsync({ password, slug, internalNotes });
      toast.success("Internal notes saved");
      refetchQuote();
    } catch {
      toast.error("Failed to save notes");
    }
    setSavingNotes(false);
  };

  const handleSave = useCallback(async () => {
    if (!config) return;
    setSaving(true);
    try {
      const result = await updateMutation.mutateAsync({
        password,
        slug,
        config,
        quoteType: config.quoteType as "agent" | "homeowner" | "real_estate" | undefined,
        agentName: agentFields.name || undefined,
        agentEmail: agentFields.email || undefined,
        agentPhone: agentFields.phone || undefined,
        agentPropertyManager: agentFields.propertyManager || null,
        isInsuranceAssessment,
        linkedQuoteSlug: isInsuranceAssessment ? (linkedQuoteSlug || null) : null,
        discountAmount,
      });
      if (result.success) {
        toast.success("Quote updated! Changes are live.");
      } else {
        toast.error("Failed to save — please try again.");
      }
    } catch (err) {
      toast.error(
        "Error saving: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    }
    setSaving(false);
  }, [config, password, slug, updateMutation, agentFields, isInsuranceAssessment, linkedQuoteSlug, discountAmount]);

  if (isLoading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  const updateConfig = (partial: Partial<QuoteConfigData>) => {
    setConfig({ ...config, ...partial });
  };

  const updateTier = (idx: number, updated: TierConfig) => {
    const tiers = [...(config.tiers ?? [])];
    tiers[idx] = updated;
    updateConfig({ tiers });
  };

  const updateAddon = (
    idx: number,
    field: keyof AddonConfig,
    value: string | number
  ) => {
    const addons = [...(config.addons || [])];
    addons[idx] = { ...addons[idx]!, [field]: value };
    updateConfig({ addons });
  };

  const addAddon = () => {
    updateConfig({
      addons: [
        ...config.addons,
        { id: `addon-${Date.now()}`, title: "", description: "", price: 0 },
      ],
    });
  };

  const removeAddon = (idx: number) => {
    updateConfig({ addons: (config.addons || []).filter((_, i) => i !== idx) });
  };

  const updateScope = (
    idx: number,
    field: keyof ScopeItemConfig,
    value: string
  ) => {
    const scopeOfWorks = [...(config.scopeOfWorks || [])];
    scopeOfWorks[idx] = { ...scopeOfWorks[idx]!, [field]: value };
    updateConfig({ scopeOfWorks });
  };

  const addScope = () => {
    updateConfig({
      scopeOfWorks: [...(config.scopeOfWorks || []), { title: "", description: "" }],
    });
  };

  const removeScope = (idx: number) => {
    updateConfig({
      scopeOfWorks: (config.scopeOfWorks || []).filter((_, i) => i !== idx),
    });
  };

  const updateTerm = (idx: number, value: string) => {
    const terms = [...(config.terms || [])];
    terms[idx] = value;
    updateConfig({ terms });
  };

  const addTerm = () => {
    updateConfig({ terms: [...(config.terms || []), ""] });
  };

  const removeTerm = (idx: number) => {
    updateConfig({ terms: (config.terms || []).filter((_, i) => i !== idx) });
  };

  // Copy the public quote link to clipboard; auto-advance draft → quote_sent
  const handleCopyQuoteLink = () => {
    const url = `${window.location.origin}/quote/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Quote link copied to clipboard!");
    });
    // Auto-advance from draft → quote_sent when link is copied
    if (quoteData?.jobStatus === "draft") {
      updateStatusMutation.mutate(
        { password, slug, jobStatus: "quote_sent" },
        { onSuccess: () => refetchQuote() }
      );
    }
  };

  const handleExportPDF = async () => {
    if (!config || !quoteData) return;
    try {
      const selectedTier = config.tiers?.[0];
      if (!selectedTier) {
        toast.error("No tiers found in quote");
        return;
      }
      const selectedColour = selectedTier.colours?.[0];
      const input = {
        quoteSlug: slug,
        tierName: selectedTier.name,
        productName: selectedTier.productName,
        manufacturer: selectedTier.manufacturer,
        fibre: selectedTier.fibre,
        pileType: selectedTier.pileType,
        colourName: selectedColour?.name || "Default",
        colourCode: selectedColour?.id || "",
        basePrice: selectedTier.price,
        addons: config.addons || [],
        grandTotal: selectedTier.price + (config.addons?.reduce((sum, a) => sum + a.price, 0) || 0),
        allTiers: config.tiers?.map(t => ({
          name: t.name,
          productName: t.productName,
          manufacturer: t.manufacturer,
          fibre: t.fibre,
          pileType: t.pileType,
          price: t.price,
          depositPercent: config.depositPercent,
        })),
      };
      const result = await downloadPdfMutation.mutateAsync(input);
      const pdfBuffer = Buffer.from(result.pdfBase64, "base64");
      const blob = new Blob([pdfBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quoteData.quoteNumber}-Quote.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to export PDF");
    }
  };

  if (!config || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-zinc-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </button>
            <div>
              <h1
                className="text-lg text-zinc-900 leading-tight"
                
              >
                {quoteData?.quoteNumber || "Quote Editor"}
              </h1>
              <p className="text-xs text-zinc-500">
                {config.client?.name || "No client"} ·{" "}
                {config.property?.address || "No address"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 text-zinc-700 font-semibold text-sm hover:bg-zinc-200 transition-colors border border-zinc-200"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Quick actions bar */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={handleCopyQuoteLink}
            className="flex-1 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Copy className="w-4 h-4" /> Copy Quote Link
          </button>
          <a
            href={`/quote/${slug}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <ExternalLink className="w-4 h-4" /> Preview
          </a>
          <button
            onClick={async () => {
              try {
                const result = await duplicateQuoteMutation.mutateAsync({ password, sourceSlug: slug });
                toast.success(`Duplicated → ${result.quoteNumber}`);
                if (onNavigateToQuote) onNavigateToQuote(result.slug);
              } catch (err) {
                toast.error("Failed to duplicate: " + (err instanceof Error ? err.message : "Unknown error"));
              }
            }}
            disabled={duplicateQuoteMutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {duplicateQuoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CopyPlus className="w-4 h-4" />}
            Duplicate
          </button>
        </div>

        {/* ─── Cancel Quote — top-of-editor, always visible ─── */}
        {quoteData?.jobStatus === "cancelled" && (
          <div className="mb-4">
            <button
              onClick={handleReactivateQuote}
              disabled={reactivatingQuote}
              className="w-full py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/8 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/15 hover:border-emerald-500/60 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {reactivatingQuote ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Reactivate Quote
            </button>
            <p className="text-xs text-zinc-400 text-center mt-1.5">Resets to Draft — new 10-day expiry</p>
          </div>
        )}

        {quoteData?.jobStatus !== "cancelled" && quoteData?.jobStatus !== "paid_in_full" && (
          <div className="mb-4">
            {!cancelConfirmOpen ? (
              <button
                onClick={() => setCancelConfirmOpen(true)}
                className="w-full py-2.5 rounded-xl border border-red-500/40 bg-red-500/8 text-red-400 text-sm font-semibold hover:bg-red-500/15 hover:border-red-500/60 transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Cancel Quote
              </button>
            ) : (
              <div className="rounded-xl border border-red-500/50 bg-red-950/40 p-4">
                <p className="text-sm text-red-300 font-semibold mb-1">Cancel this quote?</p>
                <p className="text-xs text-zinc-500 mb-3">The customer link will show a blocked page. You can restore the status manually if needed.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelQuote}
                    disabled={cancellingQuote}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {cancellingQuote ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Yes, Cancel Quote
                  </button>
                  <button
                    onClick={() => setCancelConfirmOpen(false)}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-zinc-100 text-zinc-500 text-sm font-medium hover:text-zinc-900 transition-colors"
                  >
                    Keep Quote
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Text Templates ──────────────────────────────── */}
        <div className="mb-4">
          {/* Email Template button — agency/real_estate/agency_single only */}
          {(config.quoteType === 'agent' || config.quoteType === 'real_estate' || config.quoteType === 'agency_single') && (
            <div className="mb-2">
              <EmailTemplateButton
                clientName={config.client?.name || agentFields.name}
                quoteLink={`${window.location.origin}/quote/${slug}`}
                propertyAddress={config.property?.address || undefined}
                onCopied={() => {
                  markEmailedMutation.mutate({ password, slug });
                  refetchQuote();
                }}
              />
            </div>
          )}
          <TemplateMessageButtons
            clientName={config.client?.name || agentFields.name}
            quoteLink={`${window.location.origin}/quote/${slug}`}
            quoteSlug={slug}
            phone={agentFields.phone || undefined}
            scheduledDate={quoteData?.scheduledDate ? new Date(quoteData.scheduledDate) : null}
            jobStatus={quoteData?.jobStatus}
            propertyAddress={config.property?.fullAddress || config.property?.address || undefined}
            expiresAt={quoteData?.expiresAt ? new Date(quoteData.expiresAt) : null}
            balanceOwing={(() => {
              // Show balance for any completed quote that hasn't been marked Paid in Full.
              // depositPaidAmount may be null for older quotes — treat as 0 (full balance owing).
              const status = quoteData?.jobStatus;
              if (status === "paid_in_full") return null;
              const total = quoteData?.acceptedTotal ?? 0;
              if (!total) return null;
              const discount = quoteData?.discountAmount ?? 0;
              const paid = quoteData?.depositPaidAmount ?? 0;
              return Math.max(0, total - discount - paid);
            })()}
          />

          {/* Google Review Request — homeowner completed/paid_in_full only */}
          {config.quoteType === "homeowner" && (quoteData?.jobStatus === "completed" || quoteData?.jobStatus === "paid_in_full") && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              {(!quoteData?.reviewStatus || quoteData.reviewStatus === "none") && (
                <button
                  onClick={async () => {
                    if (!confirm("Send a Google review request to this customer? They'll get an email and SMS offering $100 off for a review.")) return;
                    try {
                      const res = await requestReviewMutation.mutateAsync({ password, slug });
                      toast.success(`Review request sent${res.emailSent ? " (email)" : ""}${res.smsSent ? " (SMS)" : ""}`);
                      refetchQuote();
                    } catch (err: any) {
                      toast.error(err.message || "Failed to send review request");
                    }
                  }}
                  disabled={requestReviewMutation.isPending}
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  {requestReviewMutation.isPending ? "Sending..." : "Request Google Review ($100 off)"}
                </button>
              )}
              {quoteData?.reviewStatus === "requested" && (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-amber-400 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" /> Review requested{quoteData.reviewRequestedAt ? ` ${new Date(quoteData.reviewRequestedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""}
                  </span>
                  <button
                    onClick={async () => {
                      if (!confirm("Confirm the customer has left a Google review? This will apply a $100 credit to their invoice.")) return;
                      try {
                        await markReviewReceivedMutation.mutateAsync({ password, slug });
                        toast.success("Review received \u2014 $100 credit applied!");
                        refetchQuote();
                      } catch (err: any) {
                        toast.error(err.message || "Failed to mark review received");
                      }
                    }}
                    disabled={markReviewReceivedMutation.isPending}
                    className="py-2 px-4 rounded-lg text-sm font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {markReviewReceivedMutation.isPending ? "Applying..." : "Review Received"}
                  </button>
                </div>
              )}
              {quoteData?.reviewStatus === "received" && (
                <span className="text-sm text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Review received \u2014 credit pending
                </span>
              )}
              {quoteData?.reviewStatus === "credit_applied" && (
                <span className="text-sm text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> \u2713 $100 Google Review credit applied
                </span>
              )}
            </div>
          )}
        </div>

        {/* ─── View Stats & Analytics ──────────────────────────────────── */}
        <ViewAnalyticsPanel password={password} slug={slug} viewCount={quoteData?.viewCount ?? 0} lastViewedAt={quoteData?.lastViewedAt ?? null} />

        {/* ─── Job Status Pipeline ─────────────────────────── */}
        {quoteData?.jobStatus && (() => {
          const edPipeline = getPipeline(quoteData.quoteType);
          const currentIdx = edPipeline.findIndex((s) => s.value === quoteData.jobStatus);
          const currentCfg = edPipeline[currentIdx] ?? getStatusConfig(quoteData.jobStatus as JobStatus);
          // Use getNextStatuses to support multiple options (e.g. homeowner at accepted → deposit_paid OR scheduled)
          const nextStatusValues = getNextStatuses(quoteData.jobStatus as JobStatus, quoteData.quoteType);
          const nextCfgs = nextStatusValues.map((v) => ALL_STATUS_CONFIGS.find((s) => s.value === v)).filter(Boolean) as StatusConfig[];
          const CurrentIcon = currentCfg.icon;
          return (
            <div className="mb-4 rounded-xl border border-white/10 overflow-hidden">
              {/* Current status header */}
              <div className={`px-4 py-3 flex items-center gap-3 ${currentCfg.bg} border-b border-white/10`}>
                <CurrentIcon className={`w-5 h-5 flex-shrink-0 ${currentCfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${currentCfg.color}`}>{currentCfg.label}</p>
                  {quoteData.acceptedTier && (
                    <p className="text-xs text-zinc-400 truncate">
                      {quoteData.acceptedTier} · {quoteData.acceptedColour} · ${quoteData.acceptedTotal?.toLocaleString()}
                      {quoteData.acceptedAt && ` · ${formatAESTDate(new Date(quoteData.acceptedAt), { day: 'numeric', month: 'short' })}`}
                    </p>
                  )}
                  {quoteData.scheduledDate && (
                    <p className="text-xs text-purple-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Install: {formatAESTDate(new Date(quoteData.scheduledDate), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
                {/* Single next step: show one button */}
                {nextCfgs.length === 1 && (
                  <button
                    onClick={handleAdvanceStatus}
                    disabled={advancingStatus}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    {advancingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    {nextCfgs[0]!.label}
                  </button>
                )}
                {/* Multiple next steps (homeowner at accepted): show both buttons */}
                {nextCfgs.length > 1 && (
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {nextCfgs.map((cfg) => (
                      <button
                        key={cfg.value}
                        onClick={() => handleSetStatus(cfg.value)}
                        disabled={advancingStatus}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-colors ${cfg.bg} ${cfg.color} border border-white/10`}
                      >
                        {advancingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                )}
                {nextCfgs.length === 0 && (
                  <span className="text-xs text-zinc-400 flex-shrink-0">Final stage</span>
                )}
              </div>

              {/* Pipeline stepper */}
              <div className="px-4 py-3 bg-zinc-900/50">
                <div className="flex items-center gap-0">
                  {edPipeline.map((s, idx) => {
                    const Icon = s.icon;
                    const isPast = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    const isFuture = idx > currentIdx;
                    return (
                      <div key={s.value} className="flex items-center flex-1 min-w-0">
                        <button
                          onClick={() => handleSetStatus(s.value)}
                          disabled={advancingStatus || isCurrent}
                          title={s.label}
                          className={`flex flex-col items-center gap-1 flex-shrink-0 transition-all disabled:cursor-default ${
                            isCurrent ? "opacity-100" : isPast ? "opacity-70 hover:opacity-100" : "opacity-30 hover:opacity-60"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                            isCurrent
                              ? `${s.bg} border-current ${s.color}`
                              : isPast
                              ? "bg-white/10 border-white/30"
                              : "bg-zinc-800 border-white/10"
                          }`}>
                            <Icon className={`w-3.5 h-3.5 ${
                              isCurrent ? s.color : isPast ? "text-zinc-500" : "text-zinc-300"
                            }`} />
                          </div>
                          <span className={`text-[9px] leading-tight text-center max-w-[44px] ${
                            isCurrent ? s.color : isFuture ? "text-zinc-300" : "text-zinc-400"
                          }`}>{s.label}</span>
                        </button>
                        {idx < edPipeline.length - 1 && (
                          <div className={`flex-1 h-px mx-1 ${
                            idx < currentIdx ? "bg-white/30" : "bg-white/10"
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agent notes if present */}
              {quoteData.acceptedNotes && (
                <div className="px-4 py-3 border-t border-white/10 bg-zinc-900/30">
                  <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Agent Notes</p>
                  <p className="text-sm text-zinc-600 whitespace-pre-wrap">{quoteData.acceptedNotes}</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Notification History */}
        {quoteData?.quoteNumber && (
          <NotificationHistorySection quoteNumber={quoteData.quoteNumber} />
        )}

        {/* Quote Details */}
        <Section title="Quote Details" defaultOpen={true}>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Quote Number"
              value={config.quoteNumber || ""}
              onChange={(v) => updateConfig({ quoteNumber: v })}
            />
            <Field
              label="Issue Date"
              value={config.issueDate || ""}
              onChange={(v) => updateConfig({ issueDate: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Valid Days"
              value={config.validDays ?? ""}
              onChange={(v) => updateConfig({ validDays: parseInt(v) || 10 })}
              type="number"
            />
            {/* Deposit % only applies to homeowner quotes — agents and real_estate are invoiced after the job */}
            {config.quoteType === "homeowner" && (
              <Field
                label="Deposit % (0 = full payment on completion)"
                value={config.depositPercent ?? 0}
                onChange={(v) => {
                  const parsed = parseInt(v, 10);
                  updateConfig({ depositPercent: isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed)) });
                }}
                type="number"
              />
            )}
          </div>
          {/* Discount / Credit — available on all quote types */}
          <div className="mt-3">
            <label className="block text-xs text-zinc-500 mb-1">Discount / Credit ($)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={discountAmount || ""}
              placeholder="0"
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setDiscountAmount(isNaN(v) ? 0 : Math.max(0, v));
              }}
              className="w-full px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-zinc-900 text-sm focus:border-amber-400 focus:outline-none placeholder-zinc-400"
            />
            {discountAmount > 0 && (
              <p className="text-xs text-amber-400/70 mt-1">
                Balance reduced by ${discountAmount.toLocaleString()} — save quote to apply
              </p>
            )}
          </div>
          {/* Expiry Date */}
          <div className="mt-2">
            <label className="block text-xs text-zinc-500 mb-1.5">Expiry Date</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={expiryInput}
                onChange={(e) => setExpiryInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none"
              />
              <button
                onClick={handleSaveExpiry}
                disabled={savingExpiry}
                className="px-3 py-2 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs hover:bg-zinc-200 disabled:opacity-50 transition-colors"
              >
                {savingExpiry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Set"}
              </button>
              {expiryInput && (
                <button
                  onClick={() => { setExpiryInput(""); }}
                  className="px-3 py-2 rounded-lg bg-white/[0.04] text-zinc-500 text-xs hover:bg-white/10 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            {quoteData?.expiresAt && !['accepted','deposit_paid','scheduled','completed','paid_in_full','cancelled'].includes(quoteData.jobStatus ?? '') && (() => {
              const now = new Date();
              const exp = new Date(quoteData.expiresAt);
              const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (daysLeft <= 0) return (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400 font-medium">This quote expired {Math.abs(daysLeft)} day{Math.abs(daysLeft) !== 1 ? "s" : ""} ago. Consider extending the expiry date or creating a new quote.</p>
                </div>
              );
              if (daysLeft <= 3) return (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-400 font-medium">Expiring soon — {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining. Consider extending the expiry date.</p>
                </div>
              );
              return (
                <p className="text-xs text-zinc-400 mt-1">{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining</p>
              );
            })()}
          </div>
        </Section>

        {/* Client & Property */}
        <Section title="Client & Property" defaultOpen={true}>
          <ContactPicker
            password={password}
            onSelect={(contact) => {
              // Build display name: "Name — Company" if both, else whichever is available
              const displayName = contact.name && contact.agency
                ? `${contact.name} — ${contact.agency}`
                : contact.name || contact.agency || "";
              updateConfig({
                client: {
                  ...(config.client || {}),
                  name: displayName,
                  type: contact.agency || config.client?.type,
                },
              });
              // Also prefill agent contact fields from the selected contact
              setAgentFields({
                name: contact.name || contact.agency || "",
                email: contact.email || "",
                phone: contact.phone || "",
                propertyManager: "",
              });
              toast.success(`Loaded contact: ${displayName}`);
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Client Name"
              value={config.client?.name}
              onChange={(v) =>
                updateConfig({ client: { ...(config.client || {}), name: v } })
              }
            />
            {/* Quote Type — switchable dropdown */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Quote Type</label>
              <select
                value={config.quoteType}
                onChange={(e) => {
                  const newType = e.target.value as QuoteType;
                  const isSingleLayout = newType === "homeowner" || newType === "agency_single";
                  updateConfig({
                    quoteType: newType,
                    pricingMode: isSingleLayout ? "single" : "tiered",
                    depositPercent: newType === "homeowner" ? 50 : 0,
                    client: {
                      ...(config.client || {}),
                      type: newType === "homeowner" ? "Residential" : "Real Estate Agency",
                    },
                  });
                }}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none"
              >
                <option value="homeowner">Homeowner</option>
                <option value="real_estate">Real Estate Agency (3-Tier)</option>
                <option value="agency_single">Agency — Single Product</option>
              </select>
            </div>
          </div>
          <Field
            label="Property Address"
            value={config.property?.address}
            onChange={(v) =>
              updateConfig({
                property: { ...(config.property || {}), address: v },
              })
            }
          />
          {/* Full Address removed — Property Address is the single source of truth */}
          <Field
            label="Scope Description"
            value={config.scope || ""}
            onChange={(v) => updateConfig({ scope: v })}
          />
        </Section>

        {/* Contact — context-aware label based on quote type */}
        {(() => {
          const isHomeowner = config.quoteType === "homeowner";
          const isRealEstate = config.quoteType === "real_estate";
          const contactLabel = isHomeowner ? "Homeowner Contact" : isRealEstate ? "Agent Contact (Real Estate)" : "Agent Contact";
          const contactDesc = isHomeowner
            ? "The quote link will be emailed to the homeowner. You can update these details and resend at any time."
            : "The quote link will be emailed to the agent. You can update these details and resend at any time.";
          // For agency quotes: no PM name shown. For homeowner: show their name.
          const showNameField = isHomeowner;
          const emailLabel = isHomeowner ? "Homeowner Email" : "Agent Email";
          const phoneLabel = isHomeowner ? "Homeowner Phone" : "Agent Phone";
          const emailErrorMsg = isHomeowner ? "Enter a homeowner email first" : "Enter an agent email first";
          const sentMsg = isHomeowner ? "✓ Quote link email was sent to this homeowner" : "✓ Quote link email was sent to this agent";
          const sendBtnLabel = isHomeowner ? "Email Quote Link to Homeowner" : "Email Quote Link to Agent";
          const resendBtnLabel = "Resend Quote Link Email";
          return (
            <Section title={contactLabel} defaultOpen={true}>
              <p className="text-xs text-zinc-400 mb-3">{contactDesc}</p>
              <div className="space-y-2 mb-3">
                {showNameField && (
                  <Field
                    label="Homeowner Name"
                    value={agentFields.name}
                    onChange={(v) => setAgentFields(f => ({ ...f, name: v }))}
                  />
                )}
                <Field
                  label={emailLabel}
                  value={agentFields.email}
                  onChange={(v) => setAgentFields(f => ({ ...f, email: v }))}
                />
                <Field
                  label={phoneLabel}
                  value={agentFields.phone}
                  onChange={(v) => setAgentFields(f => ({ ...f, phone: v }))}
                />
              </div>
              {quoteData?.quoteLinkEmailSent ? (
                <p className="text-xs text-green-400/70 mb-2">{sentMsg}</p>
              ) : (
                <p className="text-xs text-amber-400/70 mb-2">Quote link has not been emailed yet</p>
              )}
              <button
                onClick={async () => {
                  if (!agentFields.email) { toast.error(emailErrorMsg); return; }
                  setSendingLink(true);
                  try {
                    const result = await sendQuoteLinkMutation.mutateAsync({
                      password,
                      slug,
                      agentName: agentFields.name,
                      agentEmail: agentFields.email,
                      agentPhone: agentFields.phone,
                      agentPropertyManager: agentFields.propertyManager || null,
                    });
                    if (result.emailSent) {
                      toast.success(`Quote link emailed to ${agentFields.email}`);
                      refetchQuote();
                    } else {
                      toast.error("Email failed — check RESEND_API_KEY configuration");
                    }
                  } catch (err) {
                    toast.error("Failed: " + (err instanceof Error ? err.message : "Unknown error"));
                  }
                  setSendingLink(false);
                }}
                disabled={sendingLink || !agentFields.email}
                className="w-full py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {sendingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {sendingLink ? "Sending..." : (quoteData?.quoteLinkEmailSent ? resendBtnLabel : sendBtnLabel)}
              </button>
              <button
                onClick={() => {
                  const origin = window.location.origin;
                  const url = `${origin}/quote/${slug}`;
                  navigator.clipboard.writeText(url).then(() => {
                    toast.success("Copied! Paste into WhatsApp, iMessage, or any channel.");
                  }).catch(() => {
                    toast.error("Failed to copy — try manually.");
                  });
                  // Auto-advance from draft → quote_sent when link is copied
                  if (quoteData?.jobStatus === "draft") {
                    updateStatusMutation.mutate(
                      { password, slug, jobStatus: "quote_sent" },
                      { onSuccess: () => refetchQuote() }
                    );
                  }
                }}
                className="w-full mt-2 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-sm text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 transition-colors flex items-center justify-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                Copy Quote Link
              </button>
            </Section>
          );
        })()}

        {/* Tiers — any quote with tiered pricing mode */}
        {config.pricingMode !== "single" && (config.tiers ?? []).map((tier, idx) => (
          <Section
            key={tier.id}
            title={`${tier.label} Tier — $${tier.price.toLocaleString()}`}
          >
            <TierEditor
              tier={tier}
              onChange={(updated) => updateTier(idx, updated)}
            />
          </Section>
        ))}

        {/* Single Product — single-price quotes (any type) */}
        {config.pricingMode === "single" && (
          <Section title="Product Details" defaultOpen={true}>
            <HomeownerProductEditor
              product={config.product || { id: "product-1", productName: "", manufacturer: "", fibre: "", pileType: "", badges: [], price: 0, productUrl: "", colours: [] }}
              onChange={(updated) => updateConfig({ product: updated })}
            />
          </Section>
        )}

        {/* Room Itemisation — optional for homeowner, real_estate, and agency_single quotes */}
        {(config.quoteType === "homeowner" || config.quoteType === "real_estate" || config.quoteType === "agency_single") && (
          <Section title="Room-by-Room Itemisation (Optional)">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(config.rooms?.length ?? 0) > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateConfig({ rooms: [{ id: `room-${Date.now()}`, name: "", price: 0 }] });
                    } else {
                      updateConfig({ rooms: [] });
                    }
                  }}
                  className="w-4 h-4 rounded border-zinc-300 bg-white text-zinc-900 cursor-pointer"
                />
                <label className="text-sm text-zinc-600">Enable room-by-room pricing</label>
              </div>

              {(config.rooms?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  {config.rooms?.map((room, idx) => (
                    <div key={room.id} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Room name (e.g. Living Room)"
                          value={room.name}
                          onChange={(e) => {
                            const updated = [...(config.rooms || [])];
                            updated[idx] = { ...room, name: e.target.value };
                            updateConfig({ rooms: updated });
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none"
                        />
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          placeholder="Price (inc GST)"
                          value={room.price}
                          onChange={(e) => {
                            const updated = [...(config.rooms || [])];
                            updated[idx] = { ...room, price: parseInt(e.target.value) || 0 };
                            updateConfig({ rooms: updated });
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = config.rooms?.filter((_, i) => i !== idx) || [];
                          updateConfig({ rooms: updated.length > 0 ? updated : [] });
                        }}
                        className="px-3 py-2 rounded-lg bg-red-900/20 border border-red-900/30 text-red-400 hover:bg-red-900/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(config.rooms || []), { id: `room-${Date.now()}`, name: "", price: 0 }];
                      updateConfig({ rooms: updated });
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-dashed border-white/20 text-zinc-500 hover:border-white/40 hover:text-zinc-600 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Room
                  </button>
                  {(config.rooms?.length ?? 0) > 0 && (
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Total from rooms (inc GST):</span>
                        <span className="text-zinc-900 font-semibold">${(config.rooms?.reduce((sum, r) => sum + r.price, 0) || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Add-on Services */}
        <Section title="Additional Services (Add-ons)">
          {(config.addons || []).map((addon, idx) => (
            <div
              key={addon.id}
              className="bg-zinc-900 rounded-lg p-3 border border-white/10"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Field
                    label="Title"
                    value={addon.title}
                    onChange={(v) => updateAddon(idx, "title", v)}
                  />
                  <Field
                    label="Description"
                    value={addon.description}
                    onChange={(v) => updateAddon(idx, "description", v)}
                  />
                  <Field
                    label="Price (inc GST, $)"
                    value={addon.price}
                    onChange={(v) =>
                      updateAddon(idx, "price", parseInt(v) || 0)
                    }
                    type="number"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeAddon(idx)}
                  className="p-1.5 text-red-400 hover:text-red-300 mt-5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addAddon}
            className="w-full py-2 rounded-lg border border-dashed border-zinc-300 text-zinc-500 text-sm hover:border-zinc-900 hover:text-zinc-900 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </Section>

        {/* Scope of Works */}
        <Section title="Scope of Works">
          {/* Quick-pick library panel */}
          <ScopeLibraryPicker
            onSelect={(title, description) => {
              updateConfig({
                scopeOfWorks: [...(config.scopeOfWorks || []), { title, description }],
              });
            }}
            existingTitles={(config.scopeOfWorks || []).map((s) => s.title)}
          />

          {/* Drag-and-drop sortable list — works on desktop (pointer) and mobile (touch) */}
          <DndContext
            sensors={scopeSensors}
            collisionDetection={closestCenter}
            onDragEnd={(event: DragEndEvent) => {
              const { active, over } = event;
              if (!over || active.id === over.id) return;
              const oldIndex = (config.scopeOfWorks || []).findIndex((_, i) => `scope-${i}` === active.id);
              const newIndex = (config.scopeOfWorks || []).findIndex((_, i) => `scope-${i}` === over.id);
              if (oldIndex !== -1 && newIndex !== -1) {
                updateConfig({ scopeOfWorks: arrayMove(config.scopeOfWorks, oldIndex, newIndex) });
              }
            }}
          >
            <SortableContext
              items={(config.scopeOfWorks || []).map((_, i) => `scope-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {(config.scopeOfWorks || []).map((item, idx) => (
                  <SortableScopeItem
                    key={`scope-${idx}`}
                    id={`scope-${idx}`}
                    item={item}
                    idx={idx}
                    onUpdate={updateScope}
                    onRemove={removeScope}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={addScope}
            className="w-full py-2 rounded-lg border border-dashed border-zinc-300 text-zinc-500 text-sm hover:border-zinc-900 hover:text-zinc-900 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Custom Item
          </button>
        </Section>

        {/* Customer Notes */}
        <Section title="Customer Notes">
          <p className="text-zinc-400 text-xs mb-2">Visible to the customer below the scope of works. Leave blank to hide.</p>
          <textarea
            value={config.customerNotes ?? ""}
            onChange={(e) => {
              updateConfig({ customerNotes: e.target.value });
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            placeholder="e.g. Furniture to be moved prior to install, access via side gate, colour sample to be confirmed..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none resize-none overflow-hidden placeholder:text-zinc-300"
          />
        </Section>

        {/* Terms */}
        <Section title="Terms & Conditions">
          {(config.terms || []).map((term, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={term}
                onChange={(e) => updateTerm(idx, e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeTerm(idx)}
                className="p-2 text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addTerm}
            className="w-full py-2 rounded-lg border border-dashed border-zinc-300 text-zinc-500 text-sm hover:border-zinc-900 hover:text-zinc-900 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Term
          </button>
        </Section>

        {/* Payment Terms */}
        <Section title="Payment Terms" defaultOpen>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1.5">Payment Due (days)</label>
              <PaymentTermsInput
                value={paymentTermsDays}
                onChange={(v) => setPaymentTermsDays(Math.max(1, v))}
              />
              <p className="text-[10px] text-zinc-400 mt-1">Used for overdue detection and shown on invoice. Default: 30 days (agents). Use 7 days for homeowners.</p>
            </div>
            <button
              type="button"
              onClick={handleSavePaymentTerms}
              disabled={savingPaymentTerms || paymentTermsDays === (quoteData?.paymentTermsDays ?? 30)}
              className="mt-5 px-3 py-2 rounded-lg text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1 flex-shrink-0"
            >
              {savingPaymentTerms ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
          </div>
        </Section>

        {/* Insurance Assessment */}
        <Section title="Insurance Assessment" defaultOpen={isInsuranceAssessment}>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                  isInsuranceAssessment ? "bg-amber-500" : "bg-zinc-700"
                }`}
                onClick={() => {
                  setIsInsuranceAssessment(!isInsuranceAssessment);
                  if (isInsuranceAssessment) setLinkedQuoteSlug("");
                }}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                  isInsuranceAssessment ? "translate-x-5" : ""
                }`} />
              </div>
              <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">Insurance Assessment Only</span>
            </label>
            {isInsuranceAssessment && (
              <>
                <p className="text-xs text-amber-400/60">Accept button will be hidden on the client-facing page. This quote is for insurance assessment purposes only.</p>
                <div>
                  <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest mb-2">Linked Quote (optional)</p>
                  <select
                    value={linkedQuoteSlug}
                    onChange={(e) => setLinkedQuoteSlug(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-amber-500/50 transition-colors"
                  >
                    <option value="">None — no linked quote</option>
                    {(allQuotes || []).filter(q => q.slug !== slug && !q.isInsuranceAssessment).map(q => (
                      <option key={q.slug} value={q.slug}>
                        {q.quoteNumber} — {q.clientName || q.propertyAddress || "Untitled"}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-400 mt-1">Link to the full replacement quote so clients can navigate to it</p>
                </div>
              </>
            )}
          </div>
        </Section>

        {/* Internal Admin Notes */}
        <Section title="Internal Notes (Admin Only)" defaultOpen={!!quoteData?.internalNotes}>
          <div className="relative">
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Private notes — keys under mat, dog in backyard, parking info, etc. These are NOT visible on the public quote page or invoices."
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-zinc-900 text-sm focus:border-amber-400 focus:outline-none resize-none placeholder:text-zinc-400"
            />
            <button
              type="button"
              onClick={handleSaveInternalNotes}
              disabled={savingNotes || internalNotes === (quoteData?.internalNotes || "")}
              className="mt-2 px-3 py-1.5 rounded-lg text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Notes
            </button>
            <p className="text-[10px] text-zinc-300 mt-1.5">🔒 Private — only visible in admin panel</p>
          </div>
        </Section>

        {/* Bottom save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 mb-8 py-4 rounded-xl bg-white text-black font-semibold text-base hover:bg-white/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? "Saving Changes..." : "Save All Changes"}
        </button>
      </div>

      {/* Editor Deposit Amount Modal */}
      {editorDepositModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ animation: "fadeIn 0.15s ease" }}
          onClick={() => setEditorDepositModal(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-[#141418] rounded-t-3xl sm:rounded-2xl border border-white/8 p-6"
            style={{ animation: "slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Record Deposit Received</h3>
                <p className="text-xs text-zinc-400">Enter the actual amount paid by the client</p>
              </div>
            </div>
            {quoteData?.acceptedTotal && (
              <p className="text-xs text-zinc-400 mb-2">
                Quote total: ${quoteData.acceptedTotal.toLocaleString()}
                {quoteData.config?.depositPercent ? ` · ${quoteData.config.depositPercent}% deposit = $${Math.round(quoteData.acceptedTotal * quoteData.config.depositPercent / 100).toLocaleString()}` : ''}
              </p>
            )}
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={editorDepositAmountInput}
                onChange={(e) => setEditorDepositAmountInput(e.target.value)}
                placeholder="e.g. 1250"
                className="w-full pl-7 pr-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditorDepositModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditorDepositConfirm}
                disabled={advancingStatus || !editorDepositAmountInput}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {advancingStatus ? "Saving..." : "Confirm Deposit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Tier Accept Modal — for tiered quotes only */}
      {editorTierAcceptModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ animation: "fadeIn 0.15s ease" }}
          onClick={() => setEditorTierAcceptModal(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-[#141418] rounded-t-3xl sm:rounded-2xl border border-white/8 p-6"
            style={{ animation: "slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Which Tier Did They Choose?</h3>
                <p className="text-xs text-zinc-400">Select the tier the client accepted</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {(quoteData?.config?.tiers ?? []).map((tier) => (
                <button
                  key={tier.name}
                  onClick={() => setEditorTierAcceptSelected(tier.name)}
                  className={`w-full px-4 py-3 rounded-xl border text-left transition-colors ${
                    editorTierAcceptSelected === tier.name
                      ? "bg-blue-500/20 border-blue-500/50 text-white"
                      : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{tier.name}</span>
                    <span className="text-sm text-zinc-500">${tier.price.toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditorTierAcceptModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditorTierAcceptConfirm}
                disabled={advancingStatus || !editorTierAcceptSelected}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {advancingStatus ? "Saving..." : "Confirm Acceptance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Schedule Date Modal */}
      {editorScheduleModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ animation: "fadeIn 0.15s ease" }}
          onClick={() => { setEditorScheduleModal(false); setPendingScheduleStatus(null); }}
        >
          <div
            className="w-full sm:max-w-sm bg-[#141418] rounded-t-3xl sm:rounded-2xl border border-white/8 p-6"
            style={{ animation: "slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Schedule Installation</h3>
                <p className="text-xs text-zinc-400">Set the install date for this job</p>
              </div>
            </div>
            <input
              type="date"
              value={editorScheduleDateInput}
              onChange={(e) => setEditorScheduleDateInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:border-purple-400 transition-colors mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setEditorScheduleModal(false); setPendingScheduleStatus(null); }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditorScheduleConfirm}
                disabled={advancingStatus}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-500 disabled:opacity-50 transition-colors"
              >
                {advancingStatus ? "Saving..." : editorScheduleDateInput ? "Schedule" : "Skip Date"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Contacts Manager ────────────────────────────────────────────────

function ContactsManager({ password }: { password: string }) {
  const { data: contactsList, isLoading, refetch } = trpc.contacts.list.useQuery(
    { password },
    { refetchOnWindowFocus: false }
  );
  const createMutation = trpc.contacts.create.useMutation();
  const updateMutation = trpc.contacts.update.useMutation();
  const deleteMutation = trpc.contacts.delete.useMutation();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", agency: "" });
  const [search, setSearch] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmData, setDeleteConfirmData] = useState<{ id: number; name: string | null } | null>(null);

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", agency: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() && !form.agency.trim()) { toast.error("Please enter a contact name or company — at least one is required"); return; }
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ password, id: editingId, ...form });
        toast.success("Contact updated");
      } else {
        await createMutation.mutateAsync({ password, ...form });
        toast.success("Contact added");
      }
      refetch();
      resetForm();
    } catch (err) {
      toast.error("Failed: " + (err instanceof Error ? err.message : "Unknown"));
    }
  };

  const handleEdit = (c: { id: number; name: string | null; email: string | null; phone: string | null; agency: string | null }) => {
    setForm({ name: c.name || "", email: c.email || "", phone: c.phone || "", agency: c.agency || "" });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDeleteClick = (id: number, name: string | null) => {
    setDeleteConfirmData({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmData) return;
    try {
      await deleteMutation.mutateAsync({ password, id: deleteConfirmData.id });
      toast.success("Contact deleted");
      refetch();
      setDeleteConfirmOpen(false);
      setDeleteConfirmData(null);
    } catch (err) {
      toast.error("Failed: " + (err instanceof Error ? err.message : "Unknown"));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setDeleteConfirmData(null);
  };

  const filtered = (contactsList || []).filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.name || "").toLowerCase().includes(s) || (c.agency || "").toLowerCase().includes(s) || (c.email || "").toLowerCase().includes(s);
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-zinc-400 animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-4 bg-white rounded-xl border border-zinc-200 p-4 space-y-3 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-900">{editingId ? "Edit Contact" : "New Contact"}</h3>
          <Field label="Contact Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Eliana" />
          <Field label="Company / Agency" value={form.agency} onChange={(v) => setForm({ ...form, agency: v })} placeholder="e.g. Coronis" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="john@example.com" />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="0400 000 000" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 transition-colors">
              {editingId ? "Update" : "Add Contact"}
            </button>
            <button onClick={resetForm} className="px-4 py-2.5 rounded-lg bg-zinc-100 text-zinc-500 text-sm hover:text-zinc-900 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="w-full mb-4 py-3 rounded-xl border border-dashed border-zinc-300 text-zinc-500 text-sm hover:border-zinc-900 hover:text-zinc-900 transition-colors flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add New Contact
        </button>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input type="text" placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 text-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none shadow-sm" />
      </div>

      {/* Contacts List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookUser className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 mb-1">{search ? "No contacts match" : "No contacts yet"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-900 text-sm font-medium truncate">
                    {c.name && c.agency ? `${c.name} — ${c.agency}` : c.name || c.agency || "(no name)"}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {c.email && <span className="text-zinc-500 text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                    {c.phone && <span className="text-zinc-500 text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"><FileText className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteClick(c.id, c.name)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-white border border-zinc-200 rounded-xl">
          <AlertDialogTitle className="text-zinc-900">Delete Contact?</AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-600">
            Are you sure you want to delete <span className="font-semibold text-zinc-900">"{deleteConfirmData?.name || 'this contact'}"</span>? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end mt-6">
            <AlertDialogCancel onClick={handleDeleteCancel} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-0 rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Contact Picker (inline dropdown for QuoteEditor) ────────────────

function ContactPicker({
  password,
  onSelect,
}: {
  password: string;
  onSelect: (contact: { name: string; email?: string; phone?: string; agency?: string }) => void;
}) {
  const { data: contactsList, refetch } = trpc.contacts.list.useQuery(
    { password },
    { refetchOnWindowFocus: false }
  );
  const createMutation = trpc.contacts.create.useMutation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "", agency: "" });

  const filtered = (contactsList || []).filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (c.name || "").toLowerCase().includes(s) || (c.agency || "").toLowerCase().includes(s);
  });

  const handleCreateAndSelect = async () => {
    if (!newContact.name.trim() && !newContact.agency.trim()) { toast.error("Please enter a name or company — at least one is required"); return; }
    try {
      await createMutation.mutateAsync({ password, ...newContact });
      onSelect({
        name: newContact.name,
        email: newContact.email || undefined,
        phone: newContact.phone || undefined,
        agency: newContact.agency || undefined,
      });
      refetch();
      setNewContact({ name: "", email: "", phone: "", agency: "" });
      setShowNewForm(false);
      setOpen(false);
      toast.success("Contact created & loaded");
    } catch (err) {
      toast.error("Failed to create contact");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full py-2 rounded-lg border border-dashed border-zinc-300 text-zinc-500 text-xs hover:border-zinc-900 hover:text-zinc-900 transition-colors flex items-center justify-center gap-1.5"
      >
        <BookUser className="w-3.5 h-3.5" /> Load from Contacts
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
          <div className="sticky top-0 bg-white p-2 border-b border-zinc-200">
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
              autoFocus
            />
          </div>
          {/* On-the-fly new contact form */}
          {showNewForm ? (
            <div className="p-3 space-y-2 border-b border-zinc-200">
              <p className="text-xs font-medium text-zinc-900">Quick Add Contact</p>
              <input
                placeholder="Contact Name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
              />
              <input
                placeholder="Company / Agency"
                value={newContact.agency}
                onChange={(e) => setNewContact({ ...newContact, agency: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="px-2 py-1.5 rounded bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
                />
                <input
                  placeholder="Phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="px-2 py-1.5 rounded bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateAndSelect}
                  className="flex-1 py-1.5 rounded bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors"
                >
                  Create & Use
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-3 py-1.5 rounded bg-zinc-100 text-zinc-500 text-xs hover:text-zinc-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewForm(true)}
              className="w-full px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50 transition-colors border-b border-zinc-200 flex items-center gap-1.5"
            >
              <UserPlus className="w-3 h-3" /> Add New Contact
            </button>
          )}
          {filtered.length === 0 ? (
            <p className="text-zinc-400 text-xs text-center py-4">No contacts found</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect({ name: c.name || c.agency || "", email: c.email || undefined, phone: c.phone || undefined, agency: c.agency || undefined });
                  setOpen(false);
                  setSearch("");
                }}
                className="w-full px-3 py-2 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
              >
                <p className="text-zinc-900 text-xs font-medium">
                  {c.name && c.agency ? `${c.name} — ${c.agency}` : c.name || c.agency || "(no name)"}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Scope Library Picker (inline quick-pick for QuoteEditor) ────────────────

// ─── Sortable Scope Item ─────────────────────────────────────────────
function SortableScopeItem({
  id,
  item,
  idx,
  onUpdate,
  onRemove,
}: {
  id: string;
  item: ScopeItemConfig;
  idx: number;
  onUpdate: (idx: number, field: keyof ScopeItemConfig, value: string) => void;
  onRemove: (idx: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-zinc-900 rounded-lg p-3 border border-white/10"
    >
      <div className="flex items-start gap-2">
        {/* Drag handle — large touch target for mobile */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex-shrink-0 mt-5 p-2 -ml-1 text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 space-y-2">
          <Field
            label="Title"
            value={item.title}
            onChange={(v) => onUpdate(idx, "title", v)}
          />
          <Field
            label="Description"
            value={item.description}
            onChange={(v) => onUpdate(idx, "description", v)}
            multiline
          />
        </div>
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="p-1.5 text-red-400 hover:text-red-300 mt-5"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ScopeLibraryPicker({
  onSelect,
  existingTitles,
}: {
  onSelect: (title: string, description: string) => void;
  existingTitles: string[];
}) {
  const { data: items } = trpc.scopeLibrary.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const [expanded, setExpanded] = useState(false);

  if (!items || items.length === 0) return null;

  const alreadyAdded = new Set(existingTitles);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full py-2 rounded-lg border border-dashed border-amber-400/30 text-amber-400/70 text-xs hover:border-amber-400 hover:text-amber-400 transition-colors flex items-center justify-center gap-1.5"
      >
        <BookOpen className="w-3.5 h-3.5" />
        {expanded ? "Hide Library" : "Pick from Library"}
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="mt-2 bg-zinc-900/80 rounded-lg border border-white/10 p-2">
          <p className="text-zinc-400 text-[10px] mb-2 px-1">Tap to add to scope of works</p>
          <div className="flex flex-col gap-1.5">
            {items.map((item) => {
              const added = alreadyAdded.has(item.text);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { if (!added) onSelect(item.text, item.description ?? ""); }}
                  disabled={added}
                  className={`px-3 py-2 rounded-lg text-left transition-colors ${
                    added
                      ? "bg-green-500/10 text-green-400 border border-green-500/20 cursor-default"
                      : "bg-white/5 border border-white/10 hover:bg-amber-400/10 hover:border-amber-400/30"
                  }`}
                >
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${
                    added ? "text-green-400" : "text-zinc-600 group-hover:text-amber-400"
                  }`}>
                    {added && <Check className="w-3 h-3 flex-shrink-0" />}
                    <span>{item.text}</span>
                  </div>
                  {item.description && (
                    <p className={`text-[10px] mt-0.5 leading-snug ${
                      added ? "text-green-500" : "text-zinc-300"
                    }`}>{item.description}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Scope Library Manager ──────────────────────────────────────────

function ScopeLibraryManager() {
  const { data: items, isLoading, refetch } = trpc.scopeLibrary.list.useQuery(
    undefined,
    { refetchOnWindowFocus: false }
  );
  const createMutation = trpc.scopeLibrary.create.useMutation();
  const updateMutation = trpc.scopeLibrary.update.useMutation();
  const deleteMutation = trpc.scopeLibrary.delete.useMutation();

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      await createMutation.mutateAsync({ text: newTitle.trim(), description: newDesc.trim() });
      setNewTitle("");
      setNewDesc("");
      setAdding(false);
      refetch();
      toast.success("Item added to library");
    } catch (err) {
      toast.error("Failed: " + (err instanceof Error ? err.message : "Unknown"));
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editTitle.trim()) return;
    try {
      await updateMutation.mutateAsync({ id, text: editTitle.trim(), description: editDesc.trim() });
      setEditingId(null);
      refetch();
      toast.success("Item updated");
    } catch (err) {
      toast.error("Failed: " + (err instanceof Error ? err.message : "Unknown"));
    }
  };

  const handleDelete = async (id: number, text: string) => {
    if (!confirm(`Delete "${text}" from library?`)) return;
    try {
      await deleteMutation.mutateAsync({ id });
      refetch();
      toast.success("Item removed");
    } catch (err) {
      toast.error("Failed: " + (err instanceof Error ? err.message : "Unknown"));
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="w-8 h-8 text-zinc-400 animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="mb-4">
        <p className="text-zinc-500 text-xs">Saved scope of work items for quick-pick in the quote editor. Each item has a title and optional description.</p>
      </div>

      {/* Add new item */}
      {adding ? (
        <div className="mb-4 bg-white rounded-xl border border-zinc-200 p-4 space-y-3 shadow-sm">
          <p className="text-sm font-medium text-zinc-900">New Library Item</p>
          <div className="space-y-2">
            <input
              autoFocus
              type="text"
              placeholder="Title — e.g. Diamond grind substrate"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setAdding(false); setNewTitle(''); setNewDesc(''); } }}
              className="w-full px-3 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Description — e.g. Grind and prepare concrete substrate prior to installation"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewTitle(''); setNewDesc(''); } }}
              className="w-full px-3 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!newTitle.trim() || createMutation.isPending} className="flex-1 py-2.5 rounded-lg bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Item
            </button>
            <button onClick={() => { setAdding(false); setNewTitle(''); setNewDesc(''); }} className="px-4 py-2.5 rounded-lg bg-zinc-100 text-zinc-500 text-sm hover:text-zinc-900 transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full mb-4 py-3 rounded-xl border border-dashed border-zinc-300 text-zinc-500 text-sm hover:border-zinc-900 hover:text-zinc-900 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Library Item
        </button>
      )}

      {/* Items list */}
      {(items || []).length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 mb-1">No library items yet</p>
          <p className="text-zinc-400 text-xs">Add common scope of work items to speed up quoting</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(items || []).map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-start gap-3 shadow-sm">
              <GripVertical className="w-4 h-4 text-zinc-300 flex-shrink-0 mt-1" />
              {editingId === item.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditingId(null); }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(item.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(item.id)} disabled={!editTitle.trim() || updateMutation.isPending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-40 transition-colors">
                      {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-500 text-xs hover:text-zinc-900 transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-900 font-medium">{item.text}</p>
                    {item.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{item.description}</p>
                    )}
                  </div>
                  <button onClick={() => { setEditingId(item.id); setEditTitle(item.text); setEditDesc(item.description ?? ""); }} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors flex-shrink-0"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(item.id, item.text)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────────

function CalendarView({ password, onEditQuote }: { password: string; onEditQuote: (slug: string) => void }) {
  // Use nowAEST() which correctly parses AEST date via Intl.DateTimeFormat parts
  const todayAEST = nowAEST();
  const [year, setYear] = useState(todayAEST.getFullYear());
  const [month, setMonth] = useState(todayAEST.getMonth() + 1); // 1-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data: calendarJobs, isLoading } = trpc.admin.getCalendarData.useQuery(
    { password, year, month },
    { refetchOnWindowFocus: false }
  );

  const monthName = formatAESTDate(new Date(year, month - 1), { month: "long", year: "numeric" });
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun

  // Group jobs by day
  const jobsByDay: Record<number, typeof calendarJobs> = {};
  (calendarJobs || []).forEach((job) => {
    if (job.scheduledDate) {
      const d = new Date(job.scheduledDate).getDate();
      if (!jobsByDay[d]) jobsByDay[d] = [];
      jobsByDay[d]!.push(job);
    }
  });

  const goToPrevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
    setSelectedDay(null);
  };
  const goToNextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
    setSelectedDay(null);
  };

  const selectedJobs = selectedDay ? (jobsByDay[selectedDay] || []) : [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPrevMonth}
          className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-zinc-900">{monthName}</h2>
        <button
          onClick={goToNextMonth}
          className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-zinc-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the 1st */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const jobs = jobsByDay[day] || [];
              const isToday = day === todayAEST.getDate() && month === todayAEST.getMonth() + 1 && year === todayAEST.getFullYear();
              const isSelected = day === selectedDay;
              const hasJobs = jobs.length > 0;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm transition-all relative ${
                    isSelected
                      ? "bg-zinc-900 text-white font-bold ring-2 ring-zinc-900"
                      : isToday
                        ? "bg-zinc-200 text-zinc-900 font-semibold border border-zinc-300"
                        : hasJobs
                          ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          : "text-zinc-400 hover:bg-zinc-100"
                  }`}
                >
                  <span className={isSelected ? "text-white" : ""}>{day}</span>
                  {hasJobs && (
                    <div className="flex gap-0.5">
                      {jobs.slice(0, 3).map((_, ji) => (
                        <div
                          key={ji}
                          className={`w-1 h-1 rounded-full ${isSelected ? "bg-white/60" : "bg-amber-500"}`}
                        />
                      ))}
                      {jobs.length > 3 && (
                        <span className={`text-[8px] ${isSelected ? "text-zinc-500" : "text-amber-500"}`}>+</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day job list */}
          {selectedDay !== null && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-zinc-500 mb-3">
                {formatAESTDate(new Date(year, month - 1, selectedDay), { weekday: "long", day: "numeric", month: "long" })}
                {selectedJobs.length > 0 && (
                  <span className="ml-2 text-amber-600">({selectedJobs.length} job{selectedJobs.length !== 1 ? "s" : ""})</span>
                )}
              </h3>
              {selectedJobs.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 py-8 text-center">
                  <Calendar className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">No jobs scheduled</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedJobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => onEditQuote(job.slug)}
                      className="w-full text-left rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-zinc-900 truncate">
                            {job.quoteNumber} · {job.clientName || "Unnamed"}
                          </p>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            {job.propertyAddress || "No address"}
                          </p>
                          {job.agentName && (
                            <p className="text-xs text-zinc-400 mt-0.5">{job.agentName}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <StatusBadge status={job.jobStatus as JobStatus} />

                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Monthly summary */}
          {(calendarJobs || []).length > 0 && (
            <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500 mb-1">Monthly Summary</p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-2xl font-bold text-zinc-900">{(calendarJobs || []).length}</p>
                  <p className="text-xs text-zinc-500">Jobs</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Invoices Tab ───────────────────────────────────────────────────────────────

const PAYMENT_STATUSES = [
  { value: "unpaid" as const, label: "Unpaid", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  { value: "deposit_paid" as const, label: "Deposit Paid", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  { value: "balance_due" as const, label: "Balance Due", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  { value: "paid_in_full" as const, label: "Paid in Full", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
] as const;

type PaymentStatus = typeof PAYMENT_STATUSES[number]["value"];

function getPaymentStatusConfig(status: string) {
  return PAYMENT_STATUSES.find((s) => s.value === status) || PAYMENT_STATUSES[0];
}

function PaymentStatusBadge({ status }: { status: string }) {
  const config = getPaymentStatusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color} ${config.border} border`}>
      {config.label}
    </span>
  );
}

function XeroSyncButton({ password, invoiceId, onSynced }: { password: string; invoiceId: number; onSynced: () => void }) {
  const retrySyncMutation = trpc.admin.retrySaasuSync.useMutation();
  const [syncing, setSyncing] = useState(false);
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        setSyncing(true);
        try {
          await retrySyncMutation.mutateAsync({ password, invoiceId });
          onSynced();
          toast.success("Synced to Saasu");
        } catch {
          toast.error("Saasu sync failed");
        } finally {
          setSyncing(false);
        }
      }}
      disabled={syncing}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-400 text-[10px] hover:bg-gray-200 hover:text-gray-600 transition-colors"
      title="Sync to Saasu manually"
    >
      {syncing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
      Saasu
    </button>
  );
}

function InvoicesTab({ password }: { password: string }) {
  const { data: invoicesList, isLoading, refetch } = trpc.invoice.list.useQuery(
    { password },
    { refetchOnWindowFocus: false }
  );
  const updatePaymentMutation = trpc.invoice.updatePaymentStatus.useMutation();
  const sendEmailMutation = trpc.invoice.sendEmail.useMutation();
  const createDirectMutation = trpc.invoice.createDirect.useMutation();
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);
  const [showDirectInvoiceModal, setShowDirectInvoiceModal] = useState(false);
  const [directForm, setDirectForm] = useState({
    recipientName: "",
    recipientEmail: "",
    recipientPhone: "",
    propertyAddress: "",
    paymentTermsDays: 30,
  });
  const [lineItems, setLineItems] = useState<{ description: string; amount: string }[]>([
    { description: "", amount: "" },
  ]);
  const [sendingDirect, setSendingDirect] = useState(false);

  const handleSendDirectInvoice = async () => {
    const validItems = lineItems.filter((li) => li.description.trim() && parseFloat(li.amount) > 0);
    if (!directForm.recipientName.trim()) { toast.error("Client name is required"); return; }
    if (!directForm.recipientEmail.trim()) { toast.error("Client email is required"); return; }
    if (!directForm.propertyAddress.trim()) { toast.error("Property address is required"); return; }
    if (validItems.length === 0) { toast.error("At least one line item with a valid amount is required"); return; }
    setSendingDirect(true);
    try {
      const result = await createDirectMutation.mutateAsync({
        password,
        recipientName: directForm.recipientName.trim(),
        recipientEmail: directForm.recipientEmail.trim(),
        recipientPhone: directForm.recipientPhone.trim() || undefined,
        propertyAddress: directForm.propertyAddress.trim(),
        lineItems: validItems.map((li) => ({ description: li.description.trim(), amount: Math.round(parseFloat(li.amount) * 100) })),
        paymentTermsDays: directForm.paymentTermsDays,
      });
      toast.success(`Invoice ${result.invoiceNumber} created and sent to ${directForm.recipientEmail}`);
      setShowDirectInvoiceModal(false);
      setDirectForm({ recipientName: "", recipientEmail: "", recipientPhone: "", propertyAddress: "", paymentTermsDays: 30 });
      setLineItems([{ description: "", amount: "" }]);
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create invoice");
    }
    setSendingDirect(false);
  };

  const handlePaymentStatusChange = async (invoiceId: number, newStatus: PaymentStatus) => {
    try {
      await updatePaymentMutation.mutateAsync({ password, invoiceId, paymentStatus: newStatus });
      toast.success(`Payment status updated to ${getPaymentStatusConfig(newStatus).label}`);
      refetch();
    } catch {
      toast.error("Failed to update payment status");
    }
  };

  const handleSendEmail = async (invoiceId: number) => {
    setSendingEmailId(invoiceId);
    try {
      await sendEmailMutation.mutateAsync({ password, invoiceId });
      toast.success("Invoice email sent successfully");
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send email");
    }
    setSendingEmailId(null);
  };

  // Overdue check helper — uses per-invoice paymentTermsDays
  const isOverdue = (inv: { paymentStatus: string; createdAt: Date | string; paymentTermsDays?: number | null }) => {
    if (inv.paymentStatus === "paid_in_full") return false;
    const terms = inv.paymentTermsDays ?? 30;
    const created = new Date(inv.createdAt);
    const daysSince = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= terms;
  };

  // Workflow stats
  const invoices = invoicesList || [];
  const overdueCount = invoices.filter(isOverdue).length;

  const paymentCounts = invoices.reduce(
    (acc, inv) => {
      acc[inv.paymentStatus as PaymentStatus] = (acc[inv.paymentStatus as PaymentStatus] || 0) + 1;
      return acc;
    },
    {} as Record<PaymentStatus, number>
  );

  const filtered = paymentFilter === "all" ? invoices : invoices.filter((i) => i.paymentStatus === paymentFilter);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-600">{overdueCount} overdue invoice{overdueCount !== 1 ? "s" : ""}</p>
            <p className="text-[10px] text-red-400">Past payment terms. Reminder emails are sent automatically.</p>
          </div>
        </div>
      )}

      {/* Workflow Status Counts */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-bold text-gray-900">{invoices.length}</span>
          <span className="text-xs text-gray-400 uppercase tracking-wider">Total</span>
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold text-red-500">{paymentCounts.unpaid || 0}</span>
          <span className="text-xs text-gray-400">Unpaid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold text-amber-500">{paymentCounts.deposit_paid || 0}</span>
          <span className="text-xs text-gray-400">Deposit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold text-orange-500">{paymentCounts.balance_due || 0}</span>
          <span className="text-xs text-gray-400">Balance Due</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-semibold text-emerald-500">{paymentCounts.paid_in_full || 0}</span>
          <span className="text-xs text-gray-400">Paid</span>
        </div>
      </div>

      {/* Payment Status Filter */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        <button
          onClick={() => setPaymentFilter("all")}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            paymentFilter === "all" ? "bg-gray-900 border-gray-900 text-white" : "border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          All ({invoices.length})
        </button>
        {PAYMENT_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setPaymentFilter(paymentFilter === s.value ? "all" : s.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              paymentFilter === s.value ? `${s.bg} ${s.border} ${s.color}` : "border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {s.label} ({paymentCounts[s.value] || 0})
          </button>
        ))}
      </div>

      {/* Create Direct Invoice Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowDirectInvoiceModal(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Direct Invoice
        </button>
      </div>

      {/* Direct Invoice Modal */}
      {showDirectInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Create Direct Invoice</h2>
                <p className="text-xs text-gray-400 mt-0.5">For jobs confirmed via phone or text</p>
              </div>
              <button onClick={() => setShowDirectInvoiceModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Client Details */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Client Details</p>
                <input
                  type="text"
                  placeholder="Client / Agent Name *"
                  value={directForm.recipientName}
                  onChange={(e) => setDirectForm((f) => ({ ...f, recipientName: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                />
                <input
                  type="email"
                  placeholder="Email Address *"
                  value={directForm.recipientEmail}
                  onChange={(e) => setDirectForm((f) => ({ ...f, recipientEmail: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={directForm.recipientPhone}
                  onChange={(e) => setDirectForm((f) => ({ ...f, recipientPhone: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                />
                <input
                  type="text"
                  placeholder="Property Address *"
                  value={directForm.propertyAddress}
                  onChange={(e) => setDirectForm((f) => ({ ...f, propertyAddress: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                />
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Line Items</p>
                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Description *"
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...lineItems];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        setLineItems(updated);
                      }}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                    />
                    <input
                      type="number"
                      placeholder="$"
                      value={item.amount}
                      onChange={(e) => {
                        const updated = [...lineItems];
                        updated[idx] = { ...updated[idx], amount: e.target.value };
                        setLineItems(updated);
                      }}
                      className="w-24 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                    />
                    {lineItems.length > 1 && (
                      <button
                        onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setLineItems([...lineItems, { description: "", amount: "" }])}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add line item
                </button>
              </div>

              {/* Total Preview */}
              {lineItems.some((li) => parseFloat(li.amount) > 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Total (inc. GST)</span>
                  <span className="text-base font-semibold text-gray-900">
                    ${lineItems.reduce((sum, li) => sum + (parseFloat(li.amount) || 0), 0).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Payment Terms */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-500 whitespace-nowrap">Payment terms</label>
                <select
                  value={directForm.paymentTermsDays}
                  onChange={(e) => setDirectForm((f) => ({ ...f, paymentTermsDays: parseInt(e.target.value) }))}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowDirectInvoiceModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSendDirectInvoice}
                disabled={sendingDirect}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingDirect ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingDirect ? "Sending..." : "Send Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No invoices yet</p>
          <p className="text-gray-300 text-xs mt-1">Invoices are auto-generated when jobs are marked as completed</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sent</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Saasu</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((inv) => (
                <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${isOverdue(inv) ? "bg-red-50/50" : ""}`}>
                  {/* Invoice # + Date */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{inv.invoiceNumber}</div>
                    <div className="text-xs text-gray-400">{formatAESTDate(new Date(inv.createdAt), { day: "numeric", month: "short", year: "2-digit" })}</div>
                  </td>
                  {/* Client */}
                  <td className="px-4 py-3">
                    <div className="text-gray-700">{inv.recipientName || "—"}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[160px]">{inv.recipientEmail}</div>
                  </td>
                  {/* Property */}
                  <td className="px-4 py-3">
                    <div className="text-gray-600 truncate max-w-[180px]">{inv.propertyAddress || "—"}</div>
                    <div className="text-xs text-gray-400">Ref: {inv.quoteNumber}</div>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={inv.paymentStatus} />
                    {isOverdue(inv) && (
                      <span className="block mt-1 text-[10px] text-red-500 font-medium">Overdue</span>
                    )}
                  </td>
                  {/* Sent */}
                  <td className="px-4 py-3">
                    {inv.emailSent === 1 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" />
                        {inv.emailSentAt ? formatAESTDate(new Date(inv.emailSentAt), { day: "numeric", month: "short" }) : "Yes"}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">Not sent</span>
                    )}
                  </td>
                  {/* Saasu */}
                  <td className="px-4 py-3">
                    {(inv as any).xeroInvoiceId ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                        <CheckCircle2 className="w-3 h-3" /> Synced
                      </span>
                    ) : (
                      <XeroSyncButton password={password} invoiceId={inv.id} onSynced={() => refetch()} />
                    )}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {inv.pdfUrl && (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleSendEmail(inv.id)}
                        disabled={sendingEmailId === inv.id || !inv.recipientEmail}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={inv.recipientEmail ? `Send to ${inv.recipientEmail}` : "No email address"}
                      >
                        {sendingEmailId === inv.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <select
                        value={inv.paymentStatus}
                        onChange={(e) => handlePaymentStatusChange(inv.id, e.target.value as PaymentStatus)}
                        className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        {PAYMENT_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Accounting Settings (Saasu) ──────────────────────────────────────────────

function XeroSettings({ password }: { password: string }) {
  // Renamed internally but kept component name for backward compat with tab references
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Saasu Integration</h2>
      <p className="text-xs text-zinc-400 mb-6">
        Saasu accounting is connected via API key. Invoices are automatically created in Saasu when a job is marked as Completed. If a deposit was already paid, it’s recorded as a partial payment against the invoice.
      </p>

      {/* Connection Status Card */}
      <div className="rounded-xl border p-5 mb-6 bg-emerald-500/5 border-emerald-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/15">
            <Plug className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-400">Connected (API Key)</p>
            <p className="text-xs text-zinc-400">Saasu File ID configured</p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mt-4 space-y-3">
        <h3 className="text-sm font-medium text-zinc-500">How It Works</h3>
        <div className="space-y-2">
          {[
            { step: "1", text: "When a job is marked Completed, a sales invoice is auto-created in Saasu" },
            { step: "2", text: "Contact is looked up by email/company — created if not found" },
            { step: "3", text: "If a deposit was already paid, it’s recorded as a partial payment" },
            { step: "4", text: "Invoice summary uses quote code + property address for easy reference" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-zinc-400 flex-shrink-0 mt-0.5">
                {item.step}
              </span>
              <p className="text-xs text-zinc-400">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Notification History Section (per-quote) ────────────────────────────────
function NotificationHistorySection({ quoteNumber }: { quoteNumber: string }) {
  const { data, isLoading, refetch } = trpc.notificationLog.byQuote.useQuery(
    { quoteNumber },
    { refetchOnWindowFocus: false }
  );

  const triggerLabels: Record<string, string> = {
    accepted: "Quote Accepted",
    deposit_paid: "Deposit Paid",
    scheduled: "Scheduled",
    completed: "Completed",
    paid_in_full: "Paid in Full",
    reminder: "Reminder",
    overdue_reminder: "Overdue Reminder",
    quote_link: "Quote Link Sent",
  };

  const entries = data?.entries ?? [];

  return (
    <div className="mb-4 rounded-xl border border-white/10 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between bg-zinc-800/40 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400/80" />
          <span className="text-sm font-semibold text-zinc-900">Notification History</span>
          {entries.length > 0 && (
            <span className="text-xs bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full">{entries.length}</span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="text-zinc-400 hover:text-zinc-500 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      {isLoading ? (
        <div className="px-4 py-4 flex items-center gap-2 text-zinc-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : entries.length === 0 ? (
        <div className="px-4 py-4 flex items-center gap-2 text-zinc-400 text-sm">
          <BellOff className="w-4 h-4" /> No notifications sent yet
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {entries.map((entry) => (
            <div key={entry.id} className="px-4 py-2.5 flex items-start gap-3">
              <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                entry.success ? "bg-emerald-500/15" : "bg-red-500/15"
              }`}>
                {entry.channel === "email" ? (
                  <Mail className={`w-3 h-3 ${entry.success ? "text-emerald-400" : "text-red-400"}`} />
                ) : (
                  <Phone className={`w-3 h-3 ${entry.success ? "text-emerald-400" : "text-red-400"}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-zinc-700">
                    {triggerLabels[entry.statusTrigger] ?? entry.statusTrigger}
                  </span>
                  <span className="text-xs text-zinc-400 uppercase tracking-wide">{entry.channel}</span>
                  {!entry.success && (
                    <span className="text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">Failed</span>
                  )}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5 truncate">
                  {entry.recipientEmail || entry.recipientPhone || "—"}
                  {entry.recipientName ? ` · ${entry.recipientName}` : ""}
                </div>
                {entry.errorMessage && (
                  <div className="text-xs text-red-500 mt-0.5 truncate">{entry.errorMessage}</div>
                )}
              </div>
              <div className="text-xs text-zinc-300 flex-shrink-0 mt-0.5">
                {new Date(entry.sentAt).toLocaleString("en-AU", {
                  day: "2-digit", month: "short",
                  hour: "2-digit", minute: "2-digit",
                  timeZone: "Australia/Brisbane",
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Notification Log View (global admin tab) ─────────────────────────────────
function NotificationLogView() {
  const [filterQuote, setFilterQuote] = useState("");
  const [appliedFilter, setAppliedFilter] = useState("");

  const { data, isLoading, refetch } = trpc.notificationLog.list.useQuery(
    { quoteNumber: appliedFilter || undefined, limit: 200 },
    { refetchOnWindowFocus: false }
  );

  const triggerLabels: Record<string, string> = {
    accepted: "Quote Accepted",
    deposit_paid: "Deposit Paid",
    scheduled: "Scheduled",
    completed: "Completed",
    paid_in_full: "Paid in Full",
    reminder: "Reminder",
    overdue_reminder: "Overdue Reminder",
    quote_link: "Quote Link Sent",
  };

  const entries = data?.entries ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" /> Notification Log
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Every SMS and email the system has attempted to send</p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-zinc-400 hover:text-zinc-600 transition-colors p-2"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={filterQuote}
          onChange={(e) => setFilterQuote(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === "Enter") setAppliedFilter(filterQuote.trim()); }}
          placeholder="Filter by quote number (e.g. BC-008)"
          className="flex-1 px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-900 text-sm placeholder-zinc-400 focus:outline-none focus:border-zinc-900 shadow-sm"
        />
        <button
          onClick={() => setAppliedFilter(filterQuote.trim())}
          className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 transition-colors"
        >
          Filter
        </button>
        {appliedFilter && (
          <button
            onClick={() => { setFilterQuote(""); setAppliedFilter(""); }}
            className="px-3 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-500 hover:text-zinc-900 text-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Summary stats */}
      {!isLoading && entries.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-white border border-zinc-200 px-3 py-2.5 text-center shadow-sm">
            <p className="text-lg font-bold text-zinc-900">{entries.length}</p>
            <p className="text-xs text-zinc-500">Total</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-emerald-600">{entries.filter(e => e.success).length}</p>
            <p className="text-xs text-zinc-500">Delivered</p>
          </div>
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-red-600">{entries.filter(e => !e.success).length}</p>
            <p className="text-xs text-zinc-500">Failed</p>
          </div>
        </div>
      )}

      {/* Log table */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-sm py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading notifications...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <BellOff className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">
            {appliedFilter ? `No notifications found for ${appliedFilter}` : "No notifications logged yet"}
          </p>
          <p className="text-zinc-400 text-xs mt-1">Notifications will appear here as quotes are processed</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white shadow-sm">
          <div className="divide-y divide-zinc-100">
            {entries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-start gap-3 hover:bg-zinc-50 transition-colors">
                <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  entry.success ? "bg-emerald-500/15" : "bg-red-500/15"
                }`}>
                  {entry.channel === "email" ? (
                    <Mail className={`w-3.5 h-3.5 ${entry.success ? "text-emerald-400" : "text-red-400"}`} />
                  ) : (
                    <Phone className={`w-3.5 h-3.5 ${entry.success ? "text-emerald-400" : "text-red-400"}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-amber-600">{entry.quoteNumber}</span>
                    <span className="text-xs font-medium text-zinc-700">
                      {triggerLabels[entry.statusTrigger] ?? entry.statusTrigger}
                    </span>
                    <span className="text-xs text-zinc-400 uppercase tracking-wide">{entry.channel}</span>
                    {!entry.success && (
                      <span className="text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">Failed</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 truncate">
                    {entry.recipientEmail || entry.recipientPhone || "—"}
                    {entry.recipientName ? ` · ${entry.recipientName}` : ""}
                  </div>
                  {entry.errorMessage && (
                    <div className="text-xs text-red-500 mt-0.5 truncate">{entry.errorMessage}</div>
                  )}
                </div>
                <div className="text-xs text-zinc-400 flex-shrink-0 mt-0.5 text-right">
                  <div>{formatAESTDate(new Date(entry.sentAt), { day: "2-digit", month: "short" })}</div>
                  <div>{formatAESTDateTime(new Date(entry.sentAt), { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agencies Tab ───────────────────────────────────────────────────────────────

type Agency = {
  agencyName: string;
  agencySlug: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  quoteCount: number;
  acceptedCount: number;
  totalRevenue: number;
  lastActivityAt: Date | null;
  quoteTypes: string[];
};

function AgencyProfileView({
  password,
  agencyName,
  onBack,
  onEditQuote,
}: {
  password: string;
  agencyName: string;
  onBack: () => void;
  onEditQuote: (slug: string) => void;
}) {
  const { data, isLoading } = trpc.admin.getAgencyProfile.useQuery(
    { password, agencyName },
    { refetchOnWindowFocus: false }
  );

  const fmt = (cents: number) =>
    "$" + Math.round(cents).toLocaleString("en-AU");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-zinc-400 text-sm">
        Agency not found.
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "text-zinc-400",
    quote_sent: "text-blue-400",
    accepted: "text-emerald-400",
    deposit_paid: "text-amber-400",
    scheduled: "text-cyan-400",
    completed: "text-purple-400",
    paid_in_full: "text-emerald-400",
    invoice_paid: "text-emerald-400",
  };

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    quote_sent: "Sent",
    accepted: "Accepted",
    deposit_paid: "Deposit Paid",
    scheduled: "Scheduled",
    completed: "Completed",
    paid_in_full: "Paid in Full",
    invoice_paid: "Invoice Paid",
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> All Agencies
      </button>

      {/* Agency header */}
      <div className="bg-zinc-800/50 rounded-2xl border border-white/10 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold text-lg leading-tight">{data.agencyName}</h2>
            {data.contactPerson && (
              <p className="text-zinc-500 text-sm mt-0.5">{data.contactPerson}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-3">
              {data.email && (
                <a href={`mailto:${data.email}`} className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-xs transition-colors">
                  <Mail className="w-3.5 h-3.5" /> {data.email}
                </a>
              )}
              {data.phone && (
                <a href={`tel:${data.phone}`} className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-xs transition-colors">
                  <Phone className="w-3.5 h-3.5" /> {data.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-800/50 rounded-xl border border-white/10 p-4">
          <p className="text-zinc-400 text-xs mb-1">Total Revenue</p>
          <p className="text-white font-bold text-xl">{fmt(data.revenue.totalQuoted)}</p>
          <p className="text-zinc-400 text-xs mt-0.5">{data.quotes.length} quote{data.quotes.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl border border-white/10 p-4">
          <p className="text-zinc-400 text-xs mb-1">Outstanding</p>
          <p className={`font-bold text-xl ${data.revenue.outstanding > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {fmt(data.revenue.outstanding)}
          </p>
          <p className="text-zinc-400 text-xs mt-0.5">{data.invoices.length} invoice{data.invoices.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl border border-white/10 p-4">
          <p className="text-zinc-400 text-xs mb-1">Total Invoiced</p>
          <p className="text-white font-semibold text-lg">{fmt(data.revenue.totalInvoiced)}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl border border-white/10 p-4">
          <p className="text-zinc-400 text-xs mb-1">Total Paid</p>
          <p className="text-emerald-400 font-semibold text-lg">{fmt(data.revenue.totalPaid)}</p>
        </div>
      </div>

      {/* Quotes */}
      <div>
        <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3">Quotes</h3>
        {data.quotes.length === 0 ? (
          <p className="text-zinc-400 text-sm">No quotes yet.</p>
        ) : (
          <div className="space-y-2">
            {data.quotes.map((q) => (
              <button
                key={q.slug}
                onClick={() => onEditQuote(q.slug)}
                className="w-full text-left bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl border border-white/10 hover:border-white/20 p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{q.quoteNumber}</span>
                      <span className={`text-xs font-medium ${statusColors[q.jobStatus || "draft"] || "text-zinc-400"}`}>
                        {statusLabels[q.jobStatus || "draft"] || q.jobStatus}
                      </span>
                    </div>
                    {q.propertyAddress && (
                      <p className="text-zinc-400 text-xs mt-0.5 truncate">{q.propertyAddress}</p>
                    )}
                    {q.scheduledDate && (
                      <p className="text-cyan-400 text-xs mt-0.5">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {formatAESTDate(new Date(q.scheduledDate), { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {q.acceptedTotal ? (
                      <p className="text-white font-semibold text-sm">${q.acceptedTotal.toLocaleString("en-AU")}</p>
                    ) : null}
                    <p className="text-zinc-300 text-xs">
                      {formatAESTDate(new Date(q.createdAt), { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Invoices */}
      {data.invoices.length > 0 && (
        <div>
          <h3 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3">Invoices</h3>
          <div className="space-y-2">
            {data.invoices.map((inv) => {
              const paymentConfig = getPaymentStatusConfig(inv.paymentStatus);
              return (
                <div
                  key={inv.id}
                  className="bg-zinc-800/50 rounded-xl border border-white/10 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">{inv.invoiceNumber}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${paymentConfig.bg} ${paymentConfig.color} ${paymentConfig.border} border`}>
                          {paymentConfig.label}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-xs mt-0.5">{inv.propertyAddress}</p>
                      <p className="text-zinc-300 text-xs mt-0.5">
                        {formatAESTDate(new Date(inv.createdAt), { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-semibold text-sm">${Math.round(inv.totalAmount).toLocaleString("en-AU")}</p>
                      {inv.pdfUrl && (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-zinc-400 hover:text-white text-xs mt-1 transition-colors"
                        >
                          <Download className="w-3 h-3" /> PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AgenciesTab({
  password,
  onEditQuote,
}: {
  password: string;
  onEditQuote: (slug: string) => void;
}) {
  const { data: agencies, isLoading } = trpc.admin.getAgencies.useQuery(
    { password },
    { refetchOnWindowFocus: false }
  );
  const [search, setSearch] = useState("");
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null);

  const fmt = (cents: number) =>
    "$" + Math.round(cents).toLocaleString("en-AU");

  if (selectedAgency) {
    return (
      <AgencyProfileView
        password={password}
        agencyName={selectedAgency}
        onBack={() => setSelectedAgency(null)}
        onEditQuote={(slug) => {
          setSelectedAgency(null);
          onEditQuote(slug);
        }}
      />
    );
  }

  const filtered = (agencies || []).filter((a) =>
    a.agencyName.toLowerCase().includes(search.toLowerCase()) ||
    (a.contactPerson || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = (agencies || []).reduce((sum, a) => sum + a.totalRevenue, 0);
  const totalQuotes = (agencies || []).reduce((sum, a) => sum + a.quoteCount, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Summary bar */}
      {!isLoading && agencies && agencies.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-zinc-800/50 rounded-xl border border-white/10 p-3 text-center">
            <p className="text-white font-bold text-lg">{agencies.length}</p>
            <p className="text-zinc-400 text-xs">Agencies</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl border border-white/10 p-3 text-center">
            <p className="text-white font-bold text-lg">{totalQuotes}</p>
            <p className="text-zinc-400 text-xs">Quotes</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl border border-white/10 p-3 text-center">
            <p className="text-white font-bold text-lg">{fmt(totalRevenue)}</p>
            <p className="text-zinc-400 text-xs">Revenue</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search agencies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-white text-sm placeholder:text-zinc-400 focus:border-white/30 focus:outline-none"
        />
      </div>

      {/* Agency list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-400 text-sm">
          {search ? "No agencies match your search." : "No agency quotes yet."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((agency) => (
            <button
              key={agency.agencyName}
              onClick={() => setSelectedAgency(agency.agencyName)}
              className="w-full text-left bg-zinc-800/50 hover:bg-zinc-700/50 rounded-2xl border border-white/10 hover:border-white/20 p-4 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                  <Building2 className="w-4.5 h-4.5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm leading-tight truncate">{agency.agencyName}</p>
                      {agency.contactPerson && (
                        <p className="text-zinc-400 text-xs mt-0.5">{agency.contactPerson}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {agency.totalRevenue > 0 ? (
                        <p className="text-white font-semibold text-sm">{fmt(agency.totalRevenue)}</p>
                      ) : null}
                      <p className="text-zinc-400 text-xs">
                        {agency.quoteCount} quote{agency.quoteCount !== 1 ? "s" : ""}
                        {agency.acceptedCount > 0 ? ` · ${agency.acceptedCount} accepted` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {agency.email && (
                      <span className="flex items-center gap-1 text-zinc-400 text-xs">
                        <Mail className="w-3 h-3" /> {agency.email}
                      </span>
                    )}
                    {agency.lastActivityAt && (
                      <span className="text-zinc-300 text-xs">
                        {formatRelativeTime(new Date(agency.lastActivityAt))}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-400 flex-shrink-0 mt-1 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Export ─────────────────────────────────────────────────────────────────────
type AdminView = "dashboard" | "calendar" | "contacts" | "library" | "invoices" | "xero" | "notifications";

const ADMIN_SESSION_KEY = "bell_admin_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function loadStoredSession(): string | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const { pw, expiresAt } = JSON.parse(raw) as { pw: string; expiresAt: number };
    if (Date.now() > expiresAt) {
      try { sessionStorage.removeItem('bellcarpets_admin'); } catch {}
      localStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }
    // Mark as admin for view tracking exclusion
    try { sessionStorage.setItem('bellcarpets_admin', '1'); } catch {}
    return pw;
  } catch {
    return null;
  }
}

function saveSession(pw: string) {
  localStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({ pw, expiresAt: Date.now() + SESSION_TTL_MS })
  );
}

function clearSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export default function Admin() {
  const [password, setPassword] = useState<string | null>(() => loadStoredSession());
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [view, setView] = useState<AdminView>("dashboard");

  const handleAuthenticated = (pw: string) => {
    saveSession(pw);
    setPassword(pw);
    // Mark this browser session as admin so public quote views are not tracked
    try { sessionStorage.setItem('bellcarpets_admin', '1'); } catch {}
  };

  const handleLogout = () => {
    clearSession();
    setPassword(null);
    try { sessionStorage.removeItem('bellcarpets_admin'); } catch {}
  };

  // Handle Xero OAuth callback query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const xeroParam = params.get("xero");
    if (xeroParam === "connected") {
      const org = params.get("org");
      toast.success(`Connected to Xero${org ? `: ${org}` : ""}`);
      setView("xero");
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (xeroParam === "error") {
      const reason = params.get("reason") || "Unknown error";
      toast.error(`Xero connection failed: ${reason}`);
      setView("xero");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  if (!password) {
    return <PasswordGate onAuthenticated={handleAuthenticated} />;
  }

  if (editingSlug) {
    return (
      <QuoteEditor
        password={password}
        slug={editingSlug}
        onBack={() => setEditingSlug(null)}
        onNavigateToQuote={setEditingSlug}
      />
    );
  }

    // Sidebar nav items grouped by category
  const NAV_ITEMS: { view: AdminView; label: string; icon: React.ElementType; group: string }[] = [
    { view: "dashboard",     label: "Quotes",        icon: LayoutDashboard, group: "pipeline" },
    { view: "calendar",      label: "Calendar",      icon: Calendar,        group: "pipeline" },
    { view: "invoices",      label: "Invoices",      icon: FileText,        group: "finance" },
    { view: "contacts",      label: "Contacts",      icon: BookUser,        group: "people" },
    { view: "library",       label: "Library",       icon: BookOpen,        group: "tools" },
    { view: "xero",          label: "Saasu",         icon: Settings,        group: "tools" },
    { view: "notifications", label: "Notifications", icon: Bell,            group: "tools" },
  ];
  const NAV_GROUPS = [
    { key: "pipeline", label: "Pipeline" },
    { key: "finance",  label: "Billing" },
    { key: "people",   label: "People" },
    { key: "tools",    label: "Tools" },
  ];
  // Mobile bottom bar: 5 primary items
  const MOBILE_NAV: AdminView[] = ["dashboard", "calendar", "invoices", "contacts"];

  return (
    <div className="min-h-screen bg-[#f8f8f7] text-zinc-900 flex admin-root">
      {/* ── Left Sidebar (desktop) ── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-[#080807] border-r border-white/[0.05] sticky top-0 h-screen overflow-y-auto">
        {/* Logo + subtitle */}
        <div className="px-5 pt-6 pb-5">
          <img src={LOGO_WHITE_PNG} alt="Bell Carpets" className="h-[18px] mb-1.5" />
          <p className="sidebar-subtitle text-[11px] text-zinc-300">Quote Manager</p>
        </div>
        {/* Nav groups */}
        <nav className="flex-1 px-3 pb-4 space-y-6">
          {NAV_GROUPS.map(group => {
            const items = NAV_ITEMS.filter(i => i.group === group.key);
            return (
              <div key={group.key}>
                <p className="px-2 mb-1.5 text-[9px] font-semibold tracking-[0.18em] uppercase text-zinc-300">{group.label}</p>
                {items.map(item => {
                  const Icon = item.icon;
                  const active = view === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => setView(item.view)}
                      className={`relative w-full flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150 mb-0.5 ${
                        active
                          ? "text-white bg-white/[0.07]"
                          : "text-zinc-400 hover:text-zinc-600 hover:bg-white/[0.03]"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full" />
                      )}
                      <Icon className={`w-[15px] h-[15px] shrink-0 ${active ? "text-white" : "text-zinc-400"}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
        {/* Lock button */}
        <div className="px-3 py-4 border-t border-white/[0.05]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] text-zinc-300 hover:text-zinc-500 hover:bg-white/[0.03] transition-all duration-150"
          >
            <Lock className="w-[15px] h-[15px] shrink-0" />
            Lock
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#f8f8f7]">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
          <img src={LOGO_PNG} alt="Bell Carpets" className="h-5" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            <Lock className="w-3 h-3" />
          </button>
        </div>

        {/* View content */}
        <div className="flex-1 pb-20 md:pb-0">
          {view === "dashboard"     && <QuotesDashboard password={password} onEditQuote={setEditingSlug} />}
          {view === "calendar"      && <CalendarView password={password} onEditQuote={setEditingSlug} />}
          {view === "contacts"      && <ContactsManager password={password} />}
          {view === "invoices"      && <InvoicesTab password={password} />}
          {view === "library"       && <ScopeLibraryManager />}
          {view === "xero"          && <XeroSettings password={password} />}
          {view === "notifications" && <NotificationLogView />}
        </div>

        {/* ── Mobile bottom tab bar ── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-zinc-200 flex">
          {NAV_ITEMS.filter(i => MOBILE_NAV.includes(i.view)).map(item => {
            const Icon = item.icon;
            const active = view === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-zinc-900" : "text-zinc-400"}`} />
                {item.label}
              </button>
            );
          })}
          {/* More button for non-primary items on mobile */}
          {(() => {
            const moreItems = NAV_ITEMS.filter(i => !MOBILE_NAV.includes(i.view));
            const moreActive = moreItems.some(i => i.view === view);
            return (
              <div className="flex-1 relative group">
                <button
                  className={`w-full flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                    moreActive ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
                  }`}
                >
                  <Layers className={`w-5 h-5 ${moreActive ? "text-zinc-900" : "text-zinc-400"}`} />
                  More
                </button>
                <div className="absolute bottom-full right-0 mb-1 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden hidden group-focus-within:block">
                  {moreItems.map(item => {
                    const Icon = item.icon;
                    const active = view === item.view;
                    return (
                      <button
                        key={item.view}
                        onClick={() => setView(item.view)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                          active ? "text-zinc-900 bg-zinc-100" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.04] transition-colors border-t border-white/[0.06]"
                  >
                    <Lock className="w-4 h-4" />
                    Lock
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
// force rebuild 1785370567
