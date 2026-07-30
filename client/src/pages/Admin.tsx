import { LOGO_WHITE_PNG } from "@/lib/logo";
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
import { generateDefaultDescription } from "@/lib/quoteDescription";
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
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-zinc-800/50 rounded-2xl p-6 border border-white/10"
      >
        <div className="text-center mb-6">
          <img
            src={LOGO_WHITE_PNG}
            alt="Bell Carpets"
            className="h-10 mx-auto mb-1"
          />
          <p className="text-[9px] tracking-[0.25em] text-white/50 uppercase font-light mb-4">RESIDENTIAL | COMMERCIAL | PROJECTS</p>
          <h1 className="text-xl text-white font-semibold">
            Admin Panel
          </h1>
          <p className="text-sm text-white/40 mt-1">Quote Manager</p>
        </div>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none mb-3"
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 disabled:opacity-50 transition-colors"
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
    <div className="mb-4 bg-zinc-800/50 rounded-xl border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-white">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-white/50" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/50" />
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
        <label className="block text-xs text-white/50 mb-1">{label}</label>
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
          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none resize-none overflow-hidden"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-xs text-white/50 mb-1">{label}</label>
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
        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none"
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
  "Dunlop Springtred Extra",
  "Dunlop Eureka",
  "Dunlop Government Red",
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
      <label className="block text-xs text-white/50 mb-1">{label}</label>
      {!showCustom ? (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => {
              if (e.target.value === "__custom__") { setForceCustom(true); onChange(""); }
              else onChange(e.target.value);
            }}
            style={{ WebkitAppearance: "none", appearance: "none" }}
            className="w-full px-3 py-2 pr-8 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none"
          >
            <option value="">{placeholder || `Select ${label}`}</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
            <option value="__custom__">Other (type custom)…</option>
          </select>
          {/* Custom chevron visible on all platforms */}
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-xs">▾</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={`Type custom ${label.toLowerCase()}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none"
          />
          <button type="button" onClick={() => { setForceCustom(false); onChange(""); }} className="px-2 py-1 text-xs text-white/40 hover:text-white border border-white/10 rounded-lg">List</button>
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
        <label className="block text-xs text-white/50 mb-1">Colour Name</label>
        <input
          type="text"
          placeholder="e.g. Charcoal, Silver Birch, Ocean Mist"
          value={product.colourName || ""}
          onChange={(e) => update({ colourName: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none"
        />
      </div>
      {/* Row 3: Fibre + Style */}
      <div className="grid grid-cols-2 gap-3">
        <ComboSelect label="Yarn / Fibre" value={product.fibre} options={FIBRE_OPTIONS} onChange={(v) => update({ fibre: v })} />
        <ComboSelect label="Style" value={product.pileType} options={STYLE_OPTIONS} onChange={(v) => update({ pileType: v })} />
      </div>
      {/* Row 4: Underlay */}
      <div>
        <label className="block text-xs text-white/50 mb-1">Underlay</label>
        <div className="relative">
          <select
            value={product.underlay || ""}
            onChange={(e) => update({ underlay: e.target.value as import("../../../shared/quoteConfigTypes").UnderlayOption })}
            style={{ WebkitAppearance: "none", appearance: "none" }}
            className="w-full px-3 py-2 pr-8 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none"
          >
            <option value="">No underlay selected</option>
            {UNDERLAY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-xs">▾</span>
        </div>
      </div>
      <Field label="Price (inc GST, whole dollars)" value={product.price} onChange={(v) => update({ price: parseInt(v) || 0 })} type="number" />
      <Field label="Product URL" value={product.productUrl} onChange={(v) => update({ productUrl: v })} />

      {/* Badges */}
      <div>
        <label className="block text-xs text-white/50 mb-1">Badges / Certifications</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {product.badges.map((badge, i) => (
            <div key={i} className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-white/10 text-xs text-white/60">
              <input
                value={badge}
                onChange={(e) => {
                  const badges = [...product.badges];
                  badges[i] = e.target.value;
                  update({ badges });
                }}
                className="bg-transparent border-none text-xs text-white/60 focus:outline-none w-24"
              />
              <button type="button" onClick={() => update({ badges: product.badges.filter((_, bi) => bi !== i) })} className="text-red-400">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => update({ badges: [...product.badges, ""] })} className="text-xs text-white border border-dashed border-white/20 px-2 py-1 rounded hover:bg-white/10">
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
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Fibre"
          value={tier.fibre}
          onChange={(v) => update({ fibre: v })}
        />
        <Field
          label="Pile Type"
          value={tier.pileType}
          onChange={(v) => update({ pileType: v })}
        />
      </div>
      <Field
        label="Price (inc GST, whole dollars)"
        value={tier.price}
        onChange={(v) => update({ price: parseInt(v) || 0 })}
        type="number"
      />
      <Field
        label="Hero Image URL"
        value={tier.image}
        onChange={(v) => update({ image: v })}
      />
      <Field
        label="Product URL"
        value={tier.productUrl}
        onChange={(v) => update({ productUrl: v })}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Primary Colour"
          value={tier.color}
          onChange={(v) => update({ color: v })}
        />
        <Field
          label="Accent Colour"
          value={tier.colorAccent}
          onChange={(v) => update({ colorAccent: v })}
        />
      </div>

      {/* Carpet Colour */}
      <div>
        <label className="block text-xs text-white/50 mb-1">Carpet Colour</label>
        <input
          type="text"
          placeholder="e.g. Charcoal, Silver Birch, Ocean Mist"
          value={tier.colourName || ""}
          onChange={(e) => update({ colourName: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none"
        />
      </div>
      {/* Underlay */}
      <div>
        <label className="block text-xs text-white/50 mb-1">Underlay</label>
        <div className="relative">
          <select
            value={tier.underlay || ""}
            onChange={(e) => update({ underlay: e.target.value as import("../../../shared/quoteConfigTypes").UnderlayOption })}
            style={{ WebkitAppearance: "none", appearance: "none" }}
            className="w-full px-3 py-2 pr-8 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none"
          >
            <option value="">No underlay selected</option>
            {UNDERLAY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 text-xs">▾</span>
        </div>
      </div>
      {/* Badges */}
      <div>
        <label className="block text-xs text-white/50 mb-1">
          Badges / Certifications
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tier.badges.map((badge, i) => (
            <div
              key={i}
              className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-white/10 text-xs text-white/60"
            >
              <input
                value={badge}
                onChange={(e) => {
                  const badges = [...tier.badges];
                  badges[i] = e.target.value;
                  update({ badges });
                }}
                className="bg-transparent border-none text-xs text-white/60 focus:outline-none w-24"
              />
              <button
                type="button"
                onClick={() =>
                  update({ badges: tier.badges.filter((_, bi) => bi !== i) })
                }
                className="text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update({ badges: [...tier.badges, ""] })}
            className="text-xs text-white border border-dashed border-white/20 px-2 py-1 rounded hover:bg-white/10"
          >
            <Plus className="w-3 h-3 inline mr-1" />
            Add
          </button>
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
      return `Hey ${name || "there"},\n\nI've just emailed your flooring quote${addressLine} - you can also view it here:\n${link}\n\nTo secure your installation date, please reply via our email sent or this text.\n\nThanks, Leon`;
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
function EmailTemplateButton({ 
  clientName, 
  quoteLink, 
  propertyAddress, 
  onCopied,
  tiers = [],
  product
}: { 
  clientName: string; 
  quoteLink: string; 
  propertyAddress?: string; 
  onCopied?: () => void;
  tiers?: { name: string; productName: string; manufacturer: string }[];
  product?: { productName: string; manufacturer: string };
}) {
  const [copied, setCopied] = useState(false);
  const firstName = (clientName || "there").split(" ")[0] || "there";
  
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')     // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-');   // Replace multiple - with single -
  };

  const tierLinks = tiers.length > 0 
    ? tiers.map(t => {
        const fullName = `${t.manufacturer} ${t.productName}`;
        const slug = slugify(fullName);
        return `${t.name} Tier — ${t.productName}\nhttps://www.bellcarpets.com.au/products/${slug}`;
      }).join('\n\n')
    : product 
      ? `${product.manufacturer} ${product.productName}\nhttps://www.bellcarpets.com.au/products/${slugify(`${product.manufacturer} ${product.productName}`)}`
      : '';

  const emailBody = `Hi ${firstName},

Your personalised quote for ${propertyAddress || 'your property'} is ready and can be viewed using the link below:

${quoteLink}

The quote includes full product specifications, underlay details, scope of works, and pricing.

${tierLinks}

If you'd like to discuss anything, I'm available on the number below.`;
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
        className="w-full py-1.5 rounded-lg text-xs text-white/50 hover:text-white/70 hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-1.5"
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
              className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/70 group-hover:text-white/90">{t.label}</span>
                <MessageSquare className="w-3 h-3 text-white/30 group-hover:text-amber-400 transition-colors" />
              </div>
              <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">
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
              <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">
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
              <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">
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
              <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">
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
                <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">
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
}: {
  password: string;
  quoteSlug: string;
  quoteNumber: string;
}) {
  const { data: invoice, isLoading } = trpc.invoice.getByQuote.useQuery(
    { password, quoteSlug },
    { refetchOnWindowFocus: false }
  );

  if (isLoading) return null;

  if (!invoice) {
    return (
      <span className="py-1.5 px-2 rounded-lg text-xs text-white/40 flex items-center gap-1">
        <FileText className="w-3 h-3" /> No Invoice
      </span>
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
}: {
  currentStatus: JobStatus;
  quoteType: QuoteType | string;
  onSelect: (status: JobStatus) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pipeline = getPipeline(quoteType);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        disabled={disabled}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white/50 hover:bg-white/[0.04] hover:text-white transition-colors disabled:opacity-50"
      >
        <CircleDot className="w-3 h-3" /> Status <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div
          className="absolute right-0 bottom-full z-50 mb-1 bg-zinc-900 border border-white/20 rounded-xl shadow-2xl w-56 overflow-hidden"
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
                className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors border-b border-white/10 last:border-0 ${
                  isCurrent
                    ? `${s.bg} ${s.color} font-semibold`
                    : "text-white hover:bg-white/10"
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isCurrent ? s.color : "text-white/60"}`} />
                <span className="flex-1">{s.label}</span>
                {isCurrent && <span className="text-[10px] text-white/50 flex-shrink-0">current</span>}
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
  const triggerAcceptanceEmailMutation = trpc.admin.triggerAcceptanceEmail.useMutation();
  const reactivateQuoteMutation = trpc.admin.reactivateQuote.useMutation();
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
  const { data: archivedQuotes, refetch: refetchArchived } = trpc.admin.listDeletedQuotes.useQuery(
    { password },
    { enabled: statusFilter === "archived", refetchOnWindowFocus: false }
  );
  const [agentFilter, setAgentFilter] = useState<string>("all");
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

  const handleCreate = async () => {
    setShowTypeModal(false);
    setCreating(true);
    try {
      // For homeowner quotes: clientName = agentName (contact name IS the client name — no separate field)
      // For agent/real_estate/agency_single: clientName = agency name (separate from contact person)
      const resolvedClientName = newQuoteForm.quoteType === "homeowner"
        ? newQuoteForm.agentName
        : newQuoteForm.clientName;
      const result = await createMutation.mutateAsync({
        password,
        quoteType: newQuoteForm.quoteType,
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
      const isAgencyQuote = newQuoteForm.quoteType === "agent" || newQuoteForm.quoteType === "real_estate" || newQuoteForm.quoteType === "agency_single";
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
                className="px-3 py-1 rounded-lg bg-white/10 text-white text-xs"
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

  const expiredCount = (quotesList || []).filter(isExpiredQuote).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/5 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-start">
              <img
                src={LOGO_WHITE_PNG}
                alt="Bell Carpets"
                className="h-5"
              />
              <p className="text-[7px] tracking-[0.2em] text-white/40 uppercase font-light mt-0.5">RESIDENTIAL | COMMERCIAL | PROJECTS</p>
            </div>
            <div className="h-5 w-px bg-white/10" />
            <div>
              <h1 className="text-sm font-semibold text-white leading-tight">
                Quotes
              </h1>
              <p className="text-xs text-white/40">
                {quotesList?.length || 0} quote{(quotesList?.length || 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTypeModal(true)}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition-colors"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            New Quote
          </button>
        </div>
      </div>

      {/* Quote Type Modal */}
      {/* Schedule Date Modal */}
      {scheduleDateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ animation: "fadeIn 0.15s ease" }}
          onClick={() => setScheduleDateModal(null)}
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
                <h3 className="text-lg font-semibold text-white">Schedule Installation</h3>
                <p className="text-xs text-white/40">Set the install date for this job</p>
              </div>
            </div>
            <input
              type="date"
              value={scheduleDateInput}
              onChange={(e) => setScheduleDateInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/60 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-400 transition-colors mb-4 [color-scheme:dark]"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setScheduleDateModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-sm text-white/60 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleDateConfirm}
                disabled={updateStatusMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-500 disabled:opacity-50 transition-colors"
              >
                {updateStatusMutation.isPending ? "Saving..." : scheduleDateInput ? "Schedule" : "Skip Date"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Amount Modal (list view) */}
      {depositModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ animation: "fadeIn 0.15s ease" }}
          onClick={() => setDepositModal(null)}
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
                <h3 className="text-lg font-semibold text-white">Record Deposit Received</h3>
                <p className="text-xs text-white/40">Enter the actual amount paid by the client</p>
              </div>
            </div>
            {depositModal.suggestedAmount > 0 && (
              <p className="text-xs text-white/40 mb-2">Suggested: ${depositModal.suggestedAmount.toLocaleString()} (based on deposit %)</p>
            )}
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={depositAmountInput}
                onChange={(e) => setDepositAmountInput(e.target.value)}
                placeholder="e.g. 1250"
                className="w-full pl-7 pr-4 py-3 rounded-xl bg-zinc-800/60 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDepositModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-sm text-white/60 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDepositConfirm}
                disabled={updateStatusMutation.isPending || !depositAmountInput}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {updateStatusMutation.isPending ? "Saving..." : "Confirm Deposit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tier Accept Modal (list view) — for tiered quotes only */}
      {tierAcceptModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ animation: "fadeIn 0.15s ease" }}
          onClick={() => setTierAcceptModal(null)}
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
                <h3 className="text-lg font-semibold text-white">Which Tier Did They Choose?</h3>
                <p className="text-xs text-white/40">Select the tier the client accepted</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {tierAcceptModal.tiers.map((tier) => (
                <button
                  key={tier.name}
                  onClick={() => setTierAcceptSelected(tier.name)}
                  className={`w-full px-4 py-3 rounded-xl border text-left transition-colors ${
                    tierAcceptSelected === tier.name
                      ? "bg-blue-500/20 border-blue-500/50 text-white"
                      : "bg-zinc-800/50 border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{tier.name}</span>
                    <span className="text-sm text-white/50">${tier.price.toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTierAcceptModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-sm text-white/60 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTierAcceptConfirm}
                disabled={updateStatusMutation.isPending || !tierAcceptSelected}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {updateStatusMutation.isPending ? "Saving..." : "Confirm Acceptance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTypeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ animation: "fadeIn 0.15s ease" }}
          onClick={() => setShowTypeModal(false)}
        >
          <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          <div
            className="w-full sm:max-w-md bg-[#141418] rounded-t-3xl sm:rounded-2xl border border-white/8 overflow-y-auto max-h-[92vh]"
            style={{ animation: "slideUp 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-6 pt-4 pb-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white tracking-tight">New Quote</h2>
                  <p className="text-xs text-white/40 mt-0.5">Create and send a quote to your client</p>
                </div>
                <button onClick={() => setShowTypeModal(false)} className="text-white/30 hover:text-white/60 transition-colors mt-0.5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quote Type — three options: Homeowner, Real Estate Agency (tiered), Agency Single Product */}
              <div className="mb-6">
                <p className="text-[11px] font-medium text-white/40 uppercase tracking-widest mb-2.5">Quote Type</p>
                <div className="flex flex-col bg-zinc-800/60 rounded-xl p-1 gap-1">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setNewQuoteForm(f => ({ ...f, quoteType: "homeowner" }))}
                      className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        newQuoteForm.quoteType === "homeowner"
                          ? "bg-white text-black shadow-sm"
                          : "text-white/50 hover:text-white/80"
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" />
                      Homeowner
                    </button>
                    <button
                      onClick={() => setNewQuoteForm(f => ({ ...f, quoteType: "real_estate" }))}
                      className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        newQuoteForm.quoteType === "real_estate" || newQuoteForm.quoteType === "agent"
                          ? "bg-white text-black shadow-sm"
                          : "text-white/50 hover:text-white/80"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Real Estate Agency
                    </button>
                  </div>
                  <button
                    onClick={() => setNewQuoteForm(f => ({ ...f, quoteType: "agency_single" }))}
                    className={`relative flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      newQuoteForm.quoteType === "agency_single"
                        ? "bg-white text-black shadow-sm"
                        : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    Agency — Single Product
                  </button>
                </div>
                <p className="text-[11px] text-white/30 mt-1.5 text-center">
                  {newQuoteForm.quoteType === "homeowner"
                    ? "Single product — with optional room itemisation"
                    : newQuoteForm.quoteType === "agency_single"
                    ? "One carpet, one price — agent payment terms, no deposit"
                    : "3-tier Good / Better / Best — agent payment terms, no deposit"}
                </p>
              </div>
              {/* Insurance Assessment Toggle */}
              <div className="mb-5">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                    newQuoteForm.isInsuranceAssessment ? "bg-amber-500" : "bg-zinc-700"
                  }`}
                    onClick={() => setNewQuoteForm(f => ({ ...f, isInsuranceAssessment: !f.isInsuranceAssessment, linkedQuoteSlug: "" }))}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      newQuoteForm.isInsuranceAssessment ? "translate-x-5" : ""
                    }`} />
                  </div>
                  <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">Insurance Assessment Only</span>
                </label>
                {newQuoteForm.isInsuranceAssessment && (
                  <p className="text-[11px] text-amber-400/60 mt-1.5 ml-[52px]">Client won't be able to accept this quote — for assessment purposes only</p>
                )}
              </div>

              {/* Linked Quote — only shown when insurance assessment is on */}
              {newQuoteForm.isInsuranceAssessment && quotesList && quotesList.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] font-medium text-white/40 uppercase tracking-widest mb-2">Linked Quote (optional)</p>
                  <select
                    value={newQuoteForm.linkedQuoteSlug}
                    onChange={(e) => setNewQuoteForm(f => ({ ...f, linkedQuoteSlug: e.target.value }))}
                    className="w-full bg-zinc-800/50 border border-white/8 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  >
                    <option value="">None — no linked quote</option>
                    {quotesList.filter(q => !q.isInsuranceAssessment).map(q => (
                      <option key={q.slug} value={q.slug}>
                        {q.quoteNumber} — {q.clientName || q.propertyAddress || "Untitled"}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-white/30 mt-1">Link to the full replacement quote so clients can navigate to it</p>
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-white/6 mb-6" />

              {/* Property Details */}
              <div className="mb-6">
                <p className="text-[11px] font-medium text-white/40 uppercase tracking-widest mb-3">Property Details</p>
                <div className="space-y-3">
                  {/* Agency Name field — only for agent/real_estate/agency_single (homeowner uses contact name from Client Contact section) */}
                  {(newQuoteForm.quoteType === "agent" || newQuoteForm.quoteType === "real_estate" || newQuoteForm.quoteType === "agency_single") && (
                    <>
                      {/* Load from Contacts populates Agency Name */}
                      <ContactPicker
                        password={password!}
                        onSelect={(c) => setNewQuoteForm(f => ({
                          ...f,
                          clientName: c.agency || c.name || f.clientName,
                          agentEmail: c.email || f.agentEmail,
                          agentPhone: c.phone || f.agentPhone,
                        }))}
                      />
                      <div>
                        <input
                          type="text"
                          placeholder="Agency / Company Name *"
                          value={newQuoteForm.clientName}
                          onChange={(e) => setNewQuoteForm(f => ({ ...f, clientName: e.target.value }))}
                          className="w-full bg-zinc-800/50 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30 focus:bg-zinc-800 transition-colors"
                        />
                        <p className="text-[10px] text-white/25 mt-1.5 px-1">Business name — e.g. REMAX United, Kollosche, Woodroffe Hotel</p>
                      </div>
                    </>
                  )}
                  <input
                    type="text"
                    placeholder="Property Address"
                    value={newQuoteForm.propertyAddress}
                    onChange={(e) => setNewQuoteForm(f => ({ ...f, propertyAddress: e.target.value }))}
                    className="w-full bg-zinc-800/50 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30 focus:bg-zinc-800 transition-colors"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/6 mb-6" />

              {/* Agent Contact */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-medium text-white/40 uppercase tracking-widest">Contact Details</p>
                </div>
                {/* For homeowner: Load from Contacts fills the client name. For agency: plain manual fields (PM changes per job) */}
                {(newQuoteForm.quoteType === "homeowner") && (
                  <div className="mb-3">
                    <ContactPicker
                      password={password!}
                      onSelect={(c) => setNewQuoteForm(f => ({
                        ...f,
                        agentName: c.name,
                        agentEmail: c.email || f.agentEmail,
                        agentPhone: c.phone || f.agentPhone,
                      }))}
                    />
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder={(newQuoteForm.quoteType === "agent" || newQuoteForm.quoteType === "real_estate" || newQuoteForm.quoteType === "agency_single") ? "Property Manager *" : "Client Name *"}
                      value={newQuoteForm.agentName}
                      onChange={(e) => setNewQuoteForm(f => ({ ...f, agentName: e.target.value }))}
                      className="w-full bg-zinc-800/50 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30 focus:bg-zinc-800 transition-colors"
                    />
                    <p className="text-[10px] text-white/25 mt-1.5 px-1">
                      {(newQuoteForm.quoteType === "agent" || newQuoteForm.quoteType === "real_estate" || newQuoteForm.quoteType === "agency_single")
                        ? "Contact person at the agency — e.g. Sarah Jones, Eliana Marks"
                        : "Client's full name — e.g. Helena Kowalski, John Smith"}
                    </p>
                  </div>

                  <input
                    type="email"
                    placeholder="Email (quote link sent here)"
                    value={newQuoteForm.agentEmail}
                    onChange={(e) => setNewQuoteForm(f => ({ ...f, agentEmail: e.target.value }))}
                    className="w-full bg-zinc-800/50 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30 focus:bg-zinc-800 transition-colors"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={newQuoteForm.agentPhone}
                    onChange={(e) => setNewQuoteForm(f => ({ ...f, agentPhone: e.target.value }))}
                    className="w-full bg-zinc-800/50 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30 focus:bg-zinc-800 transition-colors"
                  />
                </div>
              </div>

              {/* Homeowner email required hint */}
              {newQuoteForm.quoteType === "homeowner" && !newQuoteForm.agentEmail.trim() && (
                <p className="text-[11px] text-amber-400/70 mb-3 text-center">
                  Client email is required for homeowner quotes — acceptance emails need a destination.
                </p>
              )}
              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={creating || !newQuoteForm.agentName.trim() || (newQuoteForm.quoteType === "homeowner" && !newQuoteForm.agentEmail.trim())}
                className="w-full py-4 bg-white text-black text-base font-bold rounded-2xl hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-white/10"
              >
                {creating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                  </span>
                ) : (
                  "Create Quote →"
                )}
              </button>
              {/* Extra bottom padding on mobile so the Manus badge doesn't overlap the button */}
              <div className="h-6 sm:hidden" />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Status Summary Counts */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {DASHBOARD_STATUSES.map((s) => {
            const count = statusCounts[s.value] || 0;
            const isActive = statusFilter === s.value;
            const Icon = s.icon;
            return (
              <button
                key={s.value}
                onClick={() => setStatusFilter(isActive ? "all" : s.value)}
                className={`px-2.5 py-2 rounded-xl border text-left transition-all ${
                  isActive
                    ? `${s.bg} border-current ${s.color}`
                    : "bg-zinc-800/50 border-white/10 hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? s.color : "text-white/40"}`} />
                  <span className={`text-lg font-semibold ${isActive ? s.color : "text-white"}`}>{count}</span>
                </div>
                <p className={`text-[10px] mt-1 ${isActive ? s.color : "text-white/40"}`}>{s.label}</p>
              </button>
            );
          })}
          {/* Expired tile — always visible in the grid */}
          <button
            onClick={() => setStatusFilter(statusFilter === "expired" ? "all" : "expired")}
            className={`px-2.5 py-2 rounded-xl border text-left transition-all ${
              statusFilter === "expired"
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-zinc-800/50 border-white/10 hover:border-white/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <Clock className={`w-3.5 h-3.5 ${statusFilter === "expired" ? "text-red-400" : "text-white/40"}`} />
              <span className={`text-lg font-semibold ${statusFilter === "expired" ? "text-red-400" : expiredCount > 0 ? "text-red-400" : "text-white"}`}>{expiredCount}</span>
            </div>
            <p className={`text-[10px] mt-1 ${statusFilter === "expired" ? "text-red-400" : expiredCount > 0 ? "text-red-400" : "text-white/40"}`}>Expired</p>
          </button>
        </div>
        {/* Archived filter button */}
        <button
          onClick={() => setStatusFilter(statusFilter === "archived" ? "all" : "archived")}
          className={`w-full px-3 py-2 rounded-xl border text-left transition-all mb-2 flex items-center justify-between ${
            statusFilter === "archived"
              ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
              : "bg-zinc-800/50 border-white/10 hover:border-orange-500/30 hover:text-orange-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <Archive className={`w-3.5 h-3.5 ${statusFilter === "archived" ? "text-orange-400" : "text-white/40"}`} />
            <span className={`text-xs ${statusFilter === "archived" ? "text-orange-400" : "text-white/50"}`}>Archived Quotes</span>
          </div>
        </button>

        {/* Active filter indicator */}
        {statusFilter !== "all" && (
          <div className="mb-3 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs text-white/50">Showing:</span>
            {statusFilter === "expired" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-xs">
                <Clock className="w-3 h-3" /> Expired
              </span>
            ) : statusFilter === "archived" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-xs">
                <Archive className="w-3 h-3" /> Archived
              </span>
            ) : (
              <StatusBadge status={statusFilter} />
            )}
            <button
              onClick={() => setStatusFilter("all")}
              className="text-xs text-white/40 hover:text-white ml-auto"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search by quote #, client, address, or agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-white focus:outline-none"
          />
        </div>

        {/* Advanced Filters: Agent + Date Range */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Agent dropdown */}
          {uniqueAgents.length > 0 && (
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-zinc-800/60 border border-white/10 text-white text-xs focus:border-white focus:outline-none [color-scheme:dark] appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="all">All Agents</option>
              {uniqueAgents.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          )}
          {/* Date from */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-2 rounded-lg bg-zinc-800/60 border border-white/10 text-white text-xs focus:border-white focus:outline-none [color-scheme:dark]"
            />
          </div>
          {/* Date to */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-2 rounded-lg bg-zinc-800/60 border border-white/10 text-white text-xs focus:border-white focus:outline-none [color-scheme:dark]"
            />
          </div>
          {/* Clear all filters */}
          {(agentFilter !== "all" || dateFrom || dateTo || search) && (
            <button
              onClick={() => { setAgentFilter("all"); setDateFrom(""); setDateTo(""); setSearch(""); setStatusFilter("all"); }}
              className="px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Archived Quotes List */}
        {statusFilter === "archived" && (
          <div className="space-y-3">
            {(!archivedQuotes || archivedQuotes.length === 0) ? (
              <div className="text-center py-16">
                <Archive className="w-12 h-12 text-white/40 mx-auto mb-3" />
                <p className="text-white/50 mb-1">No archived quotes</p>
                <p className="text-white/40 text-sm">Deleted quotes will appear here and can be restored</p>
              </div>
            ) : (
              archivedQuotes.map((q) => (
                <div key={q.slug} className="bg-zinc-800/50 rounded-xl border border-orange-500/20 overflow-hidden p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{q.quoteNumber}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">Archived</span>
                      </div>
                      <p className="text-xs text-white/60">{q.clientName || q.agentName || 'Unknown'}</p>
                      {q.propertyAddress && <p className="text-xs text-white/40">{q.propertyAddress}</p>}
                      <p className="text-xs text-white/30 mt-1">Deleted: {q.deletedAt ? new Date(q.deletedAt).toLocaleDateString('en-AU') : 'Unknown'}</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm(`Restore ${q.quoteNumber}? It will reappear in the main quotes list.`)) return;
                        await restoreMutation.mutateAsync({ password, slug: q.slug });
                        refetchArchived();
                        refetch();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs hover:bg-green-500/20 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Quotes List */}
        {statusFilter !== "archived" && filteredQuotes.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-white/40 mx-auto mb-3" />
            <p className="text-white/50 mb-1">
              {(search || agentFilter !== "all" || dateFrom || dateTo || statusFilter !== "all") ? "No quotes match your filters" : "No quotes yet"}
            </p>
            {!search && (
              <p className="text-white/40 text-sm">
                Tap "New Quote" to create your first quote
              </p>
            )}
          </div>
        ) : statusFilter !== "archived" ? (
          <div className="space-y-3">
            {filteredQuotes.map((q) => {
              const qDaysLeft = getDaysRemaining(q.expiresAt);
              const qExpired = qDaysLeft !== null && qDaysLeft <= 0;
              const qExpiringSoon = qDaysLeft !== null && qDaysLeft > 0 && qDaysLeft <= 3;
              const qCancelled = q.jobStatus === "cancelled";
              const cardBorder = qCancelled
                ? "border-zinc-700/40"
                : qExpired
                ? "border-red-500/40"
                : qExpiringSoon
                  ? "border-amber-500/40"
                  : "border-white/10";
              return (
              <div
                key={q.slug}
                className={`rounded-xl border overflow-hidden ${cardBorder} ${qCancelled ? "bg-zinc-900/40 opacity-50" : "bg-zinc-800/50"}`}
              >
                {/* Quote card header */}
                <button
                  onClick={() => onEditQuote(q.slug)}
                  className="w-full px-4 py-3 text-left hover:bg-[#1A1F28] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-mono text-sm font-semibold">
                        {q.quoteNumber}
                      </span>
                      {q.quoteType === "homeowner" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                          <Home className="w-3 h-3" /> Homeowner
                        </span>
                      ) : q.quoteType === "agency_single" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 text-xs">
                          <Package className="w-3 h-3" /> Agency Single
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs">
                          <Users className="w-3 h-3" /> Agent
                        </span>
                      )}
                      {q.jobStatus !== "cancelled" && <StatusBadge status={q.jobStatus as JobStatus} />}
                      {q.jobStatus === "cancelled" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 text-xs border border-zinc-600/40">
                          <XCircle className="w-3 h-3" /> Cancelled
                        </span>
                      )}
                      {q.isInsuranceAssessment && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                          Insurance
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-white/40">
                      {q.createdAt
                        ? formatAESTDate(new Date(q.createdAt), {
                            day: "2-digit",
                            month: "short",
                          })
                        : ""}
                    </span>
                  </div>
                  {/* Headline name: agency name (clientName) for agency types, customer name for homeowner */}
                  <p className="text-white text-sm font-medium truncate">
                    {(q.quoteType === "agent" || q.quoteType === "real_estate" || q.quoteType === "agency_single")
                      ? (safeString(q.clientName) || safeString(q.agentName) || "No agency")
                      : (safeString(q.clientName) || "No client name")}
                  </p>
                  {/* Secondary line: PM name (agentName) for agency types; nothing extra for homeowner */}
                  {(q.quoteType === "agent" || q.quoteType === "real_estate" || q.quoteType === "agency_single")
                    ? safeString(q.agentName) && (
                        <p className="text-white/50 text-xs truncate mt-0.5">
                          {safeString(q.agentName)}
                        </p>
                      )
                    : null
                  }
                  <p className="text-white/40 text-xs truncate mt-0.5">
                    {safeString(q.propertyAddress) || "No property address"}
                  </p>
                  {(q.quoteType === "agent" || q.quoteType === "real_estate" || q.quoteType === "agency_single") && safeString(q.agentEmail) && (
                    <p className="text-white/25 text-xs truncate mt-0.5 flex items-center gap-1">
                      {safeString(q.agentEmail)}
                      {q.quoteLinkEmailSent ? (
                        <span className="text-green-400/60 ml-1">✓ emailed</span>
                      ) : (
                        <span className="text-amber-400/60 ml-1">not emailed</span>
                      )}
                    </p>
                  )}
                  {/* Payment breakdown — only shown once quote is accepted (not draft/quote_sent) */}
                  {(q.acceptedTotal ?? 0) > 0 && q.jobStatus !== 'draft' && q.jobStatus !== 'quote_sent' && (() => {
                    const total = q.acceptedTotal ?? q.highestPrice ?? 0;
                    const discount = q.discountAmount ?? 0;
                    const effectiveTotal = Math.max(0, total - discount);
                    const paid = q.depositPaidAmount ?? 0;
                    const balance = Math.max(0, effectiveTotal - paid);
                    return (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
                          <span className="text-white/50">Total</span>
                          <span className="text-white font-semibold">${total.toLocaleString()}</span>
                          {discount > 0 && (
                            <>
                              <span className="text-white/20">·</span>
                              <span className="text-white/50">Discount</span>
                              <span className="text-orange-400 font-semibold">−${discount.toLocaleString()}</span>
                            </>
                          )}
                          {paid > 0 && (
                            <>
                              <span className="text-white/20">·</span>
                              <span className="text-white/50">Deposit</span>
                              <span className="text-green-400 font-semibold">${paid.toLocaleString()}</span>
                            </>
                          )}
                          <span className="text-white/20">·</span>
                          <span className="text-white/50">Balance</span>
                          <span className={balance > 0 ? "text-amber-400 font-bold" : "text-green-400 font-bold"}>
                            {balance > 0 ? `$${balance.toLocaleString()}` : "Paid"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/40 flex-wrap">
                    <span>
                      ${q.lowestPrice.toLocaleString()} – $
                      {q.highestPrice.toLocaleString()}
                    </span>
                    {safeString(q.acceptedTier) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        {safeString(q.acceptedTier)}{safeString(q.acceptedColour) ? ` · ${safeString(q.acceptedColour)}` : ""}{q.acceptedTotal ? ` · $${q.acceptedTotal.toLocaleString()}` : ""}
                      </span>
                    )}
                    {/* Scheduled date indicator */}
                    {q.scheduledDate && (
                      <span className="inline-flex items-center gap-1 text-purple-400">
                        <Calendar className="w-3 h-3" /> {formatAESTDate(new Date(q.scheduledDate), { day: "numeric", month: "short" })}
                      </span>
                    )}
                    {/* Expiry indicator — only relevant while quote is pending (draft or quote_sent) */}
                    {q.expiresAt && !([ "accepted", "deposit_paid", "scheduled", "completed", "paid_in_full"] as string[]).includes(q.jobStatus) && (() => {
                      const days = getDaysRemaining(q.expiresAt);
                      if (days === null) return null;
                      if (days <= 0) return (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <Clock className="w-3 h-3" /> Expired {Math.abs(days)}d ago
                        </span>
                      );
                      if (days <= 3) return (
                        <span className="inline-flex items-center gap-1 text-orange-400">
                          <Clock className="w-3 h-3" /> {days}d left
                        </span>
                      );
                      return (
                        <span className="inline-flex items-center gap-1 text-white/40">
                          <Clock className="w-3 h-3" /> {days}d left
                        </span>
                      );
                    })()}
                    {/* View tracking indicator */}
                    {q.viewCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-cyan-400" title={q.lastViewedAt ? `Last viewed ${formatRelativeTime(new Date(q.lastViewedAt))}` : ''}>
                        <Eye className="w-3 h-3" /> {q.viewCount} view{q.viewCount !== 1 ? 's' : ''}
                        {(q as any).uniqueIPs > 1 && <span className="text-white/40">({(q as any).uniqueIPs} IPs)</span>}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-white/25">
                        <Eye className="w-3 h-3" /> Not viewed
                      </span>
                    )}
                    {/* Sharing alert — quote link being forwarded */}
                    {(q as any).sharingAlert && (
                      <span className="inline-flex items-center gap-1 text-amber-400 animate-pulse" title={`\u26a0\ufe0f Link shared \u2014 ${(q as any).uniqueIPs} unique IPs detected`}>
                        <AlertTriangle className="w-3 h-3" /> Shared
                      </span>
                    )}
                  </div>
                </button>

                {/* Quote card actions */}
                {(() => {
                  const nextStatuses = getNextStatuses(q.jobStatus as JobStatus, q.quoteType);
                  return (
                    <div className="border-t border-white/10">
                      {/* Email Template — FIRST item for agency quotes, impossible to miss */}
                      {q.quoteType !== 'homeowner' && (
                        <div className="px-4 pt-3 pb-2">
                          <EmailTemplateButton
                            clientName={q.agentName || q.clientName}
                            quoteLink={`${window.location.origin}/quote/${q.slug}`}
                            propertyAddress={q.propertyAddress || undefined}
                            tiers={q.tierSummaries}
                            product={q.productSummary || undefined}
                            onCopied={() => {
                              markEmailedMutation.mutate({ password, slug: q.slug });
                              refetch();
                            }}
                          />
                        </div>
                      )}
                      {/* Single option: show standard button */}
                      {nextStatuses.length === 1 && (() => {
                        const nextStatus = ALL_STATUS_CONFIGS.find((s) => s.value === nextStatuses[0]);
                        return nextStatus ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(q.slug, nextStatus.value, q.acceptedTotal ?? undefined, q.depositPercent, q.tierSummaries, q.pricingMode); }}
                            disabled={updateStatusMutation.isPending}
                            className={`w-full px-4 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${nextStatus.bg} ${nextStatus.color} hover:opacity-90 disabled:opacity-50 border-b border-white/10`}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                            Mark as {nextStatus.label}
                          </button>
                        ) : null;
                      })()}
                      {/* Multiple options: show buttons side-by-side (homeowner at accepted) */}
                      {nextStatuses.length > 1 && (
                        <div className="flex gap-2 p-2 border-b border-white/10">
                          {nextStatuses.map((status) => {
                            const config = ALL_STATUS_CONFIGS.find((s) => s.value === status);
                            return config ? (
                              <button
                                key={status}
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(q.slug, status, q.acceptedTotal ?? undefined, q.depositPercent, q.tierSummaries, q.pricingMode); }}
                                disabled={updateStatusMutation.isPending}
                                className={`flex-1 px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${config.bg} ${config.color} hover:opacity-90 disabled:opacity-50 rounded`}
                              >
                                <ChevronRight className="w-3 h-3" />
                                {config.label}
                              </button>
                            ) : null;
                          })}
                        </div>
                      )}
                      {/* Copy Link & Template Messages */}
                      <div className="px-4 py-2 border-b border-white/10 space-y-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = `${window.location.origin}/quote/${q.slug}`;
                            navigator.clipboard.writeText(url).then(() => {
                              toast.success(`Quote link copied — paste into your message to ${q.clientName || 'the client'}`);
                            }).catch(() => {
                              toast.error('Could not copy — please copy manually: ' + url);
                            });
                          }}
                          className="w-full py-2 rounded-lg text-sm font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors flex items-center justify-center gap-2"
                        >
                          <ClipboardCopy className="w-4 h-4" />
                          Copy Quote Link
                        </button>
                        <TemplateMessageButtons
                          clientName={q.quoteType !== 'homeowner' ? (q.agentName || q.clientName) : q.clientName}
                          quoteLink={`${window.location.origin}/quote/${q.slug}`}
                          quoteSlug={q.slug}
                          phone={q.agentPhone || undefined}
                          scheduledDate={q.scheduledDate ? new Date(q.scheduledDate) : null}
                          jobStatus={q.jobStatus}
                          propertyAddress={q.propertyAddress || undefined}
                          expiresAt={q.expiresAt ? new Date(q.expiresAt) : null}
                          balanceOwing={(() => {
                            // Only show balance for accepted quotes that haven't been paid in full.
                            if (!q.acceptedTotal || q.jobStatus === 'draft' || q.jobStatus === 'quote_sent') return null;
                            if (q.jobStatus === "paid_in_full") return null;
                            const total = q.acceptedTotal;
                            if (!total) return null;
                            const discount = q.discountAmount ?? 0;
                            const paid = q.depositPaidAmount ?? 0;
                            return Math.max(0, total - discount - paid);
                          })()}
                        />
                      </div>
                      {/* Trigger Acceptance Email — for accepted quotes */}
                      {q.jobStatus === "accepted" && q.acceptedAgentEmail && (
                        <div className="px-4 py-2 border-t border-white/10">
                          <button
                            onClick={async () => {
                              if (!confirm("Send acceptance email to " + (q.acceptedAgentName || q.clientName) + "?")) return;
                              try {
                                await triggerAcceptanceEmailMutation.mutateAsync({ password, slug: q.slug });
                                toast.success("Acceptance email sent");
                                refetch();
                              } catch (err: any) {
                                toast.error(err.message || "Failed to send acceptance email");
                              }
                            }}
                            disabled={triggerAcceptanceEmailMutation.isPending}
                            className="w-full py-2 rounded-lg text-xs font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {triggerAcceptanceEmailMutation.isPending ? "Sending..." : "Send Acceptance Email"}
                          </button>
                        </div>
                      )}
                      {/* Google Review Request — homeowner completed/paid_in_full only */}
                      {q.quoteType === "homeowner" && (q.jobStatus === "completed" || q.jobStatus === "paid_in_full") && (
                        <div className="px-4 py-2 border-t border-white/5">
                          {(!q.reviewStatus || q.reviewStatus === "none") && (
                            <button
                              onClick={async () => {
                                if (!confirm("Send a Google review request to this customer? They'll get an email and SMS offering $100 off for a review.")) return;
                                try {
                                  const res = await requestReviewMutation.mutateAsync({ password, slug: q.slug });
                                  toast.success(`Review request sent${res.emailSent ? " (email)" : ""}${res.smsSent ? " (SMS)" : ""}`);
                                  refetch();
                                } catch (err: any) {
                                  toast.error(err.message || "Failed to send review request");
                                }
                              }}
                              disabled={requestReviewMutation.isPending}
                              className="w-full py-2 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Star className="w-3.5 h-3.5" />
                              {requestReviewMutation.isPending ? "Sending..." : "Request Google Review ($100 off)"}
                            </button>
                          )}
                          {q.reviewStatus === "requested" && (
                            <div className="flex items-center gap-2">
                              <span className="flex-1 text-xs text-amber-400 flex items-center gap-1.5">
                                <Star className="w-3 h-3" /> Review requested{q.reviewRequestedAt ? ` ${new Date(q.reviewRequestedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : ""}
                              </span>
                              <button
                                onClick={async () => {
                                  if (!confirm("Confirm the customer has left a Google review? This will apply a $100 credit to their invoice.")) return;
                                  try {
                                    await markReviewReceivedMutation.mutateAsync({ password, slug: q.slug });
                                    toast.success("Review received — $100 credit applied!");
                                    refetch();
                                  } catch (err: any) {
                                    toast.error(err.message || "Failed to mark review received");
                                  }
                                }}
                                disabled={markReviewReceivedMutation.isPending}
                                className="py-1.5 px-3 rounded-lg text-xs font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                {markReviewReceivedMutation.isPending ? "Applying..." : "Review Received"}
                              </button>
                            </div>
                          )}
                          {q.reviewStatus === "received" && (
                            <span className="text-xs text-green-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3" /> Review received — credit pending
                            </span>
                          )}
                          {q.reviewStatus === "credit_applied" && (
                            <span className="text-xs text-green-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3" /> ✓ $100 Google Review credit applied
                            </span>
                          )}
                        </div>
                      )}
                      {/* Reactivate Quote — for expired or cancelled quotes */}
                      {(() => {
                        const isExpired = q.expiresAt && new Date(q.expiresAt) < new Date();
                        const isCancelled = q.jobStatus === "cancelled";
                        if (!isExpired && !isCancelled) return null;
                        return (
                          <div className="px-4 py-2 border-t border-white/10">
                            <button
                              onClick={async () => {
                                if (!confirm("Reactivate this quote? Expiry will be reset to 10 days from now.")) return;
                                try {
                                  await reactivateQuoteMutation.mutateAsync({ password, slug: q.slug });
                                  toast.success("Quote reactivated");
                                  refetch();
                                } catch (err: any) {
                                  toast.error(err.message || "Failed to reactivate quote");
                                }
                              }}
                              className="w-full py-2 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reactivate Quote
                            </button>
                          </div>
                        );
                      })()}
                      <div className="px-4 py-2 flex items-center gap-2">
                        <button
                          onClick={() => onEditQuote(q.slug)}
                          className="flex-1 py-1.5 rounded-lg text-xs text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDuplicate(q.slug, q.quoteNumber)}
                          className="flex-1 py-1.5 rounded-lg text-xs text-white/50 hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Duplicate
                        </button>
                        <a
                          href={`/quote/${q.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1.5 rounded-lg text-xs text-white/50 hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                        {q.jobStatus !== "quote_sent" && q.jobStatus !== "draft" && (
                          <InvoiceDownloadButton password={password} quoteSlug={q.slug} quoteNumber={q.quoteNumber} />
                        )}
                        <StatusDropdown
                          currentStatus={q.jobStatus as JobStatus}
                          quoteType={q.quoteType}
                          onSelect={(newStatus) => handleStatusChange(q.slug, newStatus, q.acceptedTotal ?? undefined, q.depositPercent, q.tierSummaries, q.pricingMode)}
                          disabled={updateStatusMutation.isPending}
                        />
                        <button
                          onClick={() => handleDelete(q.slug, q.quoteNumber)}
                          className="py-1.5 px-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
            })}
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
      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-amber-500/50 focus:outline-none"
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
    <div className="mb-4 rounded-xl bg-zinc-800/30 border border-white/5 overflow-hidden">
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
              <span className="text-white/35">· Last viewed {formatRelativeTime(new Date(lastViewedAt as string))}</span>
            )}
          </div>
        ) : (
          <span className="text-sm text-white/30 flex-1">Not yet viewed by client</span>
        )}
        {viewCount > 0 && (
          <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        )}
        {analytics?.sharingAlert && (
          <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5" /> SHARED
          </span>
        )}
      </button>

      {/* Expanded analytics */}
      {expanded && viewCount > 0 && (
        <div className="px-4 pb-4 border-t border-white/5">
          {isLoading ? (
            <div className="py-4 text-center text-white/30 text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading analytics...</div>
          ) : analytics ? (
            <div className="mt-3 space-y-3">
              {/* Summary stats */}
              <div className="flex gap-4 text-xs">
                <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <span className="text-cyan-400 font-semibold">{analytics.uniqueIPs}</span>
                  <span className="text-white/40 ml-1">unique IP{analytics.uniqueIPs !== 1 ? 's' : ''}</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-zinc-700/50 border border-white/10">
                  <span className="text-white/70 font-semibold">{analytics.visitors.length}</span>
                  <span className="text-white/40 ml-1">visitor{analytics.visitors.length !== 1 ? 's' : ''}</span>
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
                    <div key={i} className="rounded-lg border border-white/10 bg-zinc-800/40 px-3 py-2.5">
                      {/* IP + meta row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-mono text-xs text-white/70">
                          {v.ipAddress === 'unknown' ? '—' : v.ipAddress}
                        </span>
                        {(v.city || v.country) && (
                          <span className="text-[11px] text-white/40">
                            {v.city ? `${v.city}, ${v.country}` : v.country}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          v.deviceType === 'mobile' ? 'bg-purple-500/20 text-purple-300' :
                          v.deviceType === 'tablet' ? 'bg-blue-500/20 text-blue-300' :
                          v.deviceType === 'bot' ? 'bg-red-500/20 text-red-300' :
                          'bg-zinc-600/50 text-white/60'
                        }`}>{v.deviceType || 'desktop'}</span>
                        <span className="ml-auto text-[11px] text-white/40">
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
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
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
    const addons = [...config.addons];
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
    updateConfig({ addons: config.addons.filter((_, i) => i !== idx) });
  };

  const updateScope = (
    idx: number,
    field: keyof ScopeItemConfig,
    value: string
  ) => {
    const scopeOfWorks = [...config.scopeOfWorks];
    scopeOfWorks[idx] = { ...scopeOfWorks[idx]!, [field]: value };
    updateConfig({ scopeOfWorks });
  };

  const addScope = () => {
    updateConfig({
      scopeOfWorks: [...config.scopeOfWorks, { title: "", description: "" }],
    });
  };

  const removeScope = (idx: number) => {
    updateConfig({
      scopeOfWorks: config.scopeOfWorks.filter((_, i) => i !== idx),
    });
  };

  const updateTerm = (idx: number, value: string) => {
    const terms = [...config.terms];
    terms[idx] = value;
    updateConfig({ terms });
  };

  const addTerm = () => {
    updateConfig({ terms: [...config.terms, ""] });
  };

  const removeTerm = (idx: number) => {
    updateConfig({ terms: config.terms.filter((_, i) => i !== idx) });
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
      const isSingle = config.pricingMode === "single";
      const selectedTier = config.tiers?.[0];
      if (!isSingle && !selectedTier) {
        toast.error("No tiers found in quote");
        return;
      }
      const selectedColour = isSingle ? null : (selectedTier?.colours?.[0] ?? null);
      const input = {
        quoteSlug: slug,
        tierName: isSingle ? (config.product?.productName ?? "Carpet") : selectedTier!.name,
        productName: isSingle ? (config.product?.productName ?? "") : selectedTier!.productName,
        manufacturer: isSingle ? (config.product?.manufacturer ?? "") : selectedTier!.manufacturer,
        fibre: isSingle ? (config.product?.fibre ?? "") : (selectedTier!.fibre ?? ""),
        pileType: isSingle ? (config.product?.pileType ?? "") : (selectedTier!.pileType ?? ""),
        colourName: isSingle ? (config.product?.colourName ?? "Default") : (selectedColour?.name || "Default"),
        colourCode: isSingle ? "" : (selectedColour?.id || ""),
        basePrice: isSingle ? (config.product?.price ?? 0) : selectedTier!.price,
        addons: config.addons || [],
        grandTotal: (isSingle ? (config.product?.price ?? 0) : selectedTier!.price) + (config.addons?.reduce((sum, a) => sum + a.price, 0) || 0),
        allTiers: isSingle ? undefined : config.tiers?.map(t => ({
          name: t.name,
          productName: t.productName,
          manufacturer: t.manufacturer,
          fibre: t.fibre,
          pileType: t.pileType,
          price: t.price,
          depositPercent: config.depositPercent,
        })),
      };
      // Open the PDF via the direct server endpoint — no blob URLs needed.
      // The server streams the file with Content-Type: application/pdf and
      // Content-Disposition: inline so every browser (including mobile Safari)
      // opens it natively without showing a raw blob URL in the share sheet.
      window.open(`/api/quote/${slug}/pdf`, "_blank");
      toast.success("PDF opened");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to export PDF");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/5 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white/50" />
            </button>
            <div>
              <h1
                className="text-lg text-white leading-tight"
                
              >
                {quoteData?.quoteNumber || "Quote Editor"}
              </h1>
              <p className="text-xs text-white/40">
                {config.client.name || "No client"} ·{" "}
                {config.property.address || "No address"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors border border-white/20"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition-colors"
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
            className="flex-1 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-sm text-white/60 hover:border-white hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" /> Copy Quote Link
          </button>
          <a
            href={`/quote/${slug}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-sm text-white/60 hover:border-white hover:text-white transition-colors flex items-center justify-center gap-2"
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
            className="flex-1 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-sm text-white/60 hover:border-white hover:text-white transition-colors flex items-center justify-center gap-2"
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
            <p className="text-xs text-white/30 text-center mt-1.5">Resets to Draft — new 10-day expiry</p>
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
                <p className="text-xs text-white/50 mb-3">The customer link will show a blocked page. You can restore the status manually if needed.</p>
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
                    className="flex-1 px-3 py-2.5 rounded-lg bg-white/[0.06] text-white/60 text-sm font-medium hover:text-white transition-colors"
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
                clientName={agentFields.name || config.client.name}
                quoteLink={`${window.location.origin}/quote/${slug}`}
                propertyAddress={config.property?.address || undefined}
                tiers={config.tiers}
                product={config.product}
                onCopied={() => {
                  markEmailedMutation.mutate({ password, slug });
                  refetchQuote();
                }}
              />
            </div>
          )}
          <TemplateMessageButtons
            clientName={(config.quoteType === 'agent' || config.quoteType === 'real_estate' || config.quoteType === 'agency_single') ? (agentFields.name || config.client.name) : config.client.name}
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
                    <p className="text-xs text-white/40 truncate">
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
                  <span className="text-xs text-white/30 flex-shrink-0">Final stage</span>
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
                              isCurrent ? s.color : isPast ? "text-white/60" : "text-white/20"
                            }`} />
                          </div>
                          <span className={`text-[9px] leading-tight text-center max-w-[44px] ${
                            isCurrent ? s.color : isFuture ? "text-white/20" : "text-white/40"
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
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Agent Notes</p>
                  <p className="text-sm text-white/70 whitespace-pre-wrap">{quoteData.acceptedNotes}</p>
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
              value={config.quoteNumber}
              onChange={(v) => updateConfig({ quoteNumber: v })}
            />
            <Field
              label="Issue Date"
              value={config.issueDate}
              onChange={(v) => updateConfig({ issueDate: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Valid Days"
              value={config.validDays}
              onChange={(v) => updateConfig({ validDays: parseInt(v) || 10 })}
              type="number"
            />
            {/* Deposit % only applies to homeowner quotes — agents and real_estate are invoiced after the job */}
            {config.quoteType === "homeowner" && (
              <Field
                label="Deposit % (0 = full payment on completion)"
                value={config.depositPercent}
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
            <label className="block text-xs text-white/50 mb-1">Discount / Credit ($)</label>
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
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-amber-500/30 text-white text-sm focus:border-amber-400 focus:outline-none placeholder-white/20"
            />
            {discountAmount > 0 && (
              <p className="text-xs text-amber-400/70 mt-1">
                Balance reduced by ${discountAmount.toLocaleString()} — save quote to apply
              </p>
            )}
          </div>
          {/* Expiry Date */}
          <div className="mt-2">
            <label className="block text-xs text-white/50 mb-1.5">Expiry Date</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={expiryInput}
                onChange={(e) => setExpiryInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none"
              />
              <button
                onClick={handleSaveExpiry}
                disabled={savingExpiry}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-xs hover:bg-white/10 disabled:opacity-50 transition-colors"
              >
                {savingExpiry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Set"}
              </button>
              {expiryInput && (
                <button
                  onClick={() => { setExpiryInput(""); }}
                  className="px-3 py-2 rounded-lg bg-white/[0.04] text-white/50 text-xs hover:bg-white/10 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            {quoteData?.expiresAt && (() => {
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
                <p className="text-xs text-white/40 mt-1">{daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining</p>
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
                  ...config.client,
                  name: displayName,
                  type: contact.agency || config.client.type,
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
              value={config.client.name}
              onChange={(v) =>
                updateConfig({ client: { ...config.client, name: v } })
              }
            />
            {/* Quote Type — switchable dropdown */}
            <div>
              <label className="block text-xs text-white/50 mb-1">Quote Type</label>
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
                      ...config.client,
                      type: newType === "homeowner" ? "Residential" : "Real Estate Agency",
                    },
                  });
                }}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none"
              >
                <option value="homeowner">Homeowner</option>
                <option value="real_estate">Real Estate Agency (3-Tier)</option>
                <option value="agency_single">Agency — Single Product</option>
              </select>
            </div>
          </div>
          <Field
            label="Property Address"
            value={config.property.address}
            onChange={(v) =>
              updateConfig({
                property: { ...config.property, address: v },
              })
            }
          />
          {/* Full Address removed — Property Address is the single source of truth */}
          <Field
            label="Areas"
            value={config.scope}
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
          // For agency quotes: Agent Name IS the property manager — relabel and remove separate PM field
          const nameLabel = isHomeowner ? "Homeowner Name" : "Property Manager";
          const emailLabel = isHomeowner ? "Homeowner Email" : "Agent Email";
          const phoneLabel = isHomeowner ? "Homeowner Phone" : "Agent Phone";
          const emailErrorMsg = isHomeowner ? "Enter a homeowner email first" : "Enter an agent email first";
          const sentMsg = isHomeowner ? "✓ Quote link email was sent to this homeowner" : "✓ Quote link email was sent to this agent";
          const sendBtnLabel = isHomeowner ? "Email Quote Link to Homeowner" : "Email Quote Link to Agent";
          const resendBtnLabel = "Resend Quote Link Email";
          return (
            <Section title={contactLabel} defaultOpen={true}>
              <p className="text-xs text-white/40 mb-3">{contactDesc}</p>
              <div className="space-y-2 mb-3">
                <Field
                  label={nameLabel}
                  value={agentFields.name}
                  onChange={(v) => setAgentFields(f => ({ ...f, name: v }))}
                />
                {/* Property Manager field removed — Agent Name is relabelled to Property Manager for agency quotes */}
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
                className="w-full py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-white/70 hover:border-white hover:text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
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
                className="w-full mt-2 py-2 rounded-xl bg-zinc-900 border border-white/10 text-sm text-white/50 hover:border-white/30 hover:text-white/80 transition-colors flex items-center justify-center gap-2"
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
                  className="w-4 h-4 rounded border-white/20 bg-zinc-900 text-white cursor-pointer"
                />
                <label className="text-sm text-white/70">Enable room-by-room pricing</label>
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
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none"
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
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none"
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
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-dashed border-white/20 text-white/50 hover:border-white/40 hover:text-white/70 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Room
                  </button>
                  {(config.rooms?.length ?? 0) > 0 && (
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Total from rooms (inc GST):</span>
                        <span className="text-white font-semibold">${(config.rooms?.reduce((sum, r) => sum + r.price, 0) || 0).toLocaleString()}</span>
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
          {config.addons.map((addon, idx) => (
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
            className="w-full py-2 rounded-lg border border-dashed border-white/15 text-white/50 text-sm hover:border-white hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </Section>

        {/* Scope of Works */}
        {/* Customer-facing Description — flowing scope text shown on the quote page.
            When set, it REPLACES the titled "Scope of Works" list on the customer page. */}
        <Section title="Customer Description" defaultOpen={true}>
          <p className="text-white/40 text-xs mb-2">
            Shown to the customer as a flowing description on the quote page. One line per row.
            When filled in, this replaces the titled “Scope of Works” list on the customer-facing page.
            Leave blank to fall back to the generated scope.
          </p>
          <textarea
            value={(config.description ?? []).join("\n")}
            onChange={(e) => {
              const lines = e.target.value.split("\n");
              updateConfig({ description: lines });
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            placeholder={"e.g.\nSupply & Installation of new carpet to bedrooms, lounge and hallway.\nSupply & Installation on new Dunlop Springtred Ultimate underlay.\nUplift and disposal of existing carpet and underlay."}
            rows={5}
            className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none resize-none overflow-hidden placeholder:text-white/25"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                const generated = generateDefaultDescription(config, {
                  tiered: config.pricingMode !== "single"
                    && (config.quoteType === "agent" || config.quoteType === "real_estate"),
                });
                updateConfig({ description: generated });
              }}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/70 border border-white/15 hover:bg-white/10 hover:text-white transition-colors"
            >
              Generate from quote
            </button>
            {(config.description?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => updateConfig({ description: [] })}
                className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </Section>

        <Section title="Scope of Works">
          {/* Quick-pick library panel */}
          <ScopeLibraryPicker
            onSelect={(title, description) => {
              updateConfig({
                scopeOfWorks: [...config.scopeOfWorks, { title, description }],
              });
            }}
            existingTitles={config.scopeOfWorks.map((s) => s.title)}
          />

          {/* Drag-and-drop sortable list — works on desktop (pointer) and mobile (touch) */}
          <DndContext
            sensors={scopeSensors}
            collisionDetection={closestCenter}
            onDragEnd={(event: DragEndEvent) => {
              const { active, over } = event;
              if (!over || active.id === over.id) return;
              const oldIndex = config.scopeOfWorks.findIndex((_, i) => `scope-${i}` === active.id);
              const newIndex = config.scopeOfWorks.findIndex((_, i) => `scope-${i}` === over.id);
              if (oldIndex !== -1 && newIndex !== -1) {
                updateConfig({ scopeOfWorks: arrayMove(config.scopeOfWorks, oldIndex, newIndex) });
              }
            }}
          >
            <SortableContext
              items={config.scopeOfWorks.map((_, i) => `scope-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {config.scopeOfWorks.map((item, idx) => (
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
            className="w-full py-2 rounded-lg border border-dashed border-white/15 text-white/50 text-sm hover:border-white hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Custom Item
          </button>
        </Section>

        {/* Customer Notes */}
        <Section title="Customer Notes">
          <p className="text-white/40 text-xs mb-2">Visible to the customer below the scope of works. Leave blank to hide.</p>
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
            className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none resize-none overflow-hidden placeholder:text-white/25"
          />
        </Section>

        {/* Terms */}
        <Section title="Payment Terms">
          {config.terms.map((term, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                value={term}
                onChange={(e) => updateTerm(idx, e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-white focus:outline-none"
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
            className="w-full py-2 rounded-lg border border-dashed border-white/15 text-white/50 text-sm hover:border-white hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Term
          </button>
        </Section>

        {/* Payment Terms */}
        <Section title="Payment Terms" defaultOpen>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Payment Due (days)</label>
              <PaymentTermsInput
                value={paymentTermsDays}
                onChange={(v) => setPaymentTermsDays(Math.max(1, v))}
              />
              <p className="text-[10px] text-white/30 mt-1">Used for overdue detection and shown on invoice. Default: 30 days (agents). Use 7 days for homeowners.</p>
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
              <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">Insurance Assessment Only</span>
            </label>
            {isInsuranceAssessment && (
              <>
                <p className="text-xs text-amber-400/60">Accept button will be hidden on the client-facing page. This quote is for insurance assessment purposes only.</p>
                <div>
                  <p className="text-[11px] font-medium text-white/40 uppercase tracking-widest mb-2">Linked Quote (optional)</p>
                  <select
                    value={linkedQuoteSlug}
                    onChange={(e) => setLinkedQuoteSlug(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                  >
                    <option value="">None — no linked quote</option>
                    {(allQuotes || []).filter(q => q.slug !== slug && !q.isInsuranceAssessment).map(q => (
                      <option key={q.slug} value={q.slug}>
                        {q.quoteNumber} — {q.clientName || q.propertyAddress || "Untitled"}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-white/30 mt-1">Link to the full replacement quote so clients can navigate to it</p>
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
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm focus:border-amber-500/50 focus:outline-none resize-none placeholder:text-white/25"
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
            <p className="text-[10px] text-white/25 mt-1.5">🔒 Private — only visible in admin panel</p>
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
                <h3 className="text-lg font-semibold text-white">Record Deposit Received</h3>
                <p className="text-xs text-white/40">Enter the actual amount paid by the client</p>
              </div>
            </div>
            {quoteData?.acceptedTotal && (
              <p className="text-xs text-white/40 mb-2">
                Quote total: ${quoteData.acceptedTotal.toLocaleString()}
                {quoteData.config?.depositPercent ? ` · ${quoteData.config.depositPercent}% deposit = $${Math.round(quoteData.acceptedTotal * quoteData.config.depositPercent / 100).toLocaleString()}` : ''}
              </p>
            )}
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">$</span>
              <input
                type="number"
                min="1"
                step="1"
                value={editorDepositAmountInput}
                onChange={(e) => setEditorDepositAmountInput(e.target.value)}
                placeholder="e.g. 1250"
                className="w-full pl-7 pr-4 py-3 rounded-xl bg-zinc-800/60 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditorDepositModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-sm text-white/60 hover:text-white transition-colors"
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
                <h3 className="text-lg font-semibold text-white">Which Tier Did They Choose?</h3>
                <p className="text-xs text-white/40">Select the tier the client accepted</p>
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
                      : "bg-zinc-800/50 border-white/10 text-white/70 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{tier.name}</span>
                    <span className="text-sm text-white/50">${tier.price.toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditorTierAcceptModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-sm text-white/60 hover:text-white transition-colors"
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
                <h3 className="text-lg font-semibold text-white">Schedule Installation</h3>
                <p className="text-xs text-white/40">Set the install date for this job</p>
              </div>
            </div>
            <input
              type="date"
              value={editorScheduleDateInput}
              onChange={(e) => setEditorScheduleDateInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/60 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-400 transition-colors mb-4 [color-scheme:dark]"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setEditorScheduleModal(false); setPendingScheduleStatus(null); }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-sm text-white/60 hover:text-white transition-colors"
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
    return <div className="min-h-screen bg-zinc-900 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-4 bg-zinc-800/50 rounded-xl border border-white/10 p-4 space-y-3">
          <h3 className="text-sm font-medium text-white">{editingId ? "Edit Contact" : "New Contact"}</h3>
          <Field label="Contact Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Eliana" />
          <Field label="Company / Agency" value={form.agency} onChange={(v) => setForm({ ...form, agency: v })} placeholder="e.g. Coronis" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="john@example.com" />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="0400 000 000" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors">
              {editingId ? "Update" : "Add Contact"}
            </button>
            <button onClick={resetForm} className="px-4 py-2.5 rounded-lg bg-white/[0.04] text-white/50 text-sm hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="w-full mb-4 py-3 rounded-xl border border-dashed border-white/15 text-white/50 text-sm hover:border-white hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add New Contact
        </button>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input type="text" placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-white focus:outline-none" />
      </div>

      {/* Contacts List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookUser className="w-12 h-12 text-white/40 mx-auto mb-3" />
          <p className="text-white/50 mb-1">{search ? "No contacts match" : "No contacts yet"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="bg-zinc-800/50 rounded-xl border border-white/10 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {c.name && c.agency ? `${c.name} — ${c.agency}` : c.name || c.agency || "(no name)"}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {c.email && <span className="text-white/40 text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                    {c.phone && <span className="text-white/40 text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"><FileText className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteClick(c.id, c.name)} className="p-1.5 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-zinc-800 border border-white/10 rounded-xl">
          <AlertDialogTitle className="text-white">Delete Contact?</AlertDialogTitle>
          <AlertDialogDescription className="text-white/60">
            Are you sure you want to delete <span className="font-semibold text-white">"{deleteConfirmData?.name || 'this contact'}"</span>? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end mt-6">
            <AlertDialogCancel onClick={handleDeleteCancel} className="bg-zinc-700 hover:bg-zinc-600 text-white border-0 rounded-lg">Cancel</AlertDialogCancel>
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
        className="w-full py-2 rounded-lg border border-dashed border-white/15 text-white/50 text-xs hover:border-white hover:text-white transition-colors flex items-center justify-center gap-1.5"
      >
        <BookUser className="w-3.5 h-3.5" /> Load from Contacts
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#1A1F28] border border-white/10 rounded-xl shadow-xl max-h-80 overflow-y-auto">
          <div className="sticky top-0 bg-[#1A1F28] p-2 border-b border-white/10">
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-white focus:outline-none"
              autoFocus
            />
          </div>
          {/* On-the-fly new contact form */}
          {showNewForm ? (
            <div className="p-3 space-y-2 border-b border-white/10">
              <p className="text-xs font-medium text-white">Quick Add Contact</p>
              <input
                placeholder="Contact Name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-white focus:outline-none"
              />
              <input
                placeholder="Company / Agency"
                value={newContact.agency}
                onChange={(e) => setNewContact({ ...newContact, agency: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-white focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="px-2 py-1.5 rounded bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-white focus:outline-none"
                />
                <input
                  placeholder="Phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="px-2 py-1.5 rounded bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-white focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateAndSelect}
                  className="flex-1 py-1.5 rounded bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors"
                >
                  Create & Use
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-3 py-1.5 rounded bg-white/[0.04] text-white/50 text-xs hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewForm(true)}
              className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/10 transition-colors border-b border-white/10 flex items-center gap-1.5"
            >
              <UserPlus className="w-3 h-3" /> Add New Contact
            </button>
          )}
          {filtered.length === 0 ? (
            <p className="text-white/40 text-xs text-center py-4">No contacts found</p>
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
                className="w-full px-3 py-2 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-0"
              >
                <p className="text-white text-xs font-medium">
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
          className="flex-shrink-0 mt-5 p-2 -ml-1 text-white/25 hover:text-white/60 cursor-grab active:cursor-grabbing touch-none"
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
          <p className="text-white/30 text-[10px] mb-2 px-1">Tap to add to scope of works</p>
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
                    added ? "text-green-400" : "text-white/70 group-hover:text-amber-400"
                  }`}>
                    {added && <Check className="w-3 h-3 flex-shrink-0" />}
                    <span>{item.text}</span>
                  </div>
                  {item.description && (
                    <p className={`text-[10px] mt-0.5 leading-snug ${
                      added ? "text-green-400/60" : "text-white/35"
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
    return <div className="min-h-screen bg-zinc-900 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="mb-4">
        <p className="text-white/40 text-xs">Saved scope of work items for quick-pick in the quote editor. Each item has a title and optional description.</p>
      </div>

      {/* Add new item */}
      {adding ? (
        <div className="mb-4 bg-zinc-800/50 rounded-xl border border-white/10 p-4 space-y-3">
          <p className="text-sm font-medium text-white">New Library Item</p>
          <div className="space-y-2">
            <input
              autoFocus
              type="text"
              placeholder="Title — e.g. Diamond grind substrate"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setAdding(false); setNewTitle(''); setNewDesc(''); } }}
              className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-white focus:outline-none"
            />
            <input
              type="text"
              placeholder="Description — e.g. Grind and prepare concrete substrate prior to installation"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewTitle(''); setNewDesc(''); } }}
              className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-white focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={!newTitle.trim() || createMutation.isPending} className="flex-1 py-2.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Item
            </button>
            <button onClick={() => { setAdding(false); setNewTitle(''); setNewDesc(''); }} className="px-4 py-2.5 rounded-lg bg-white/[0.04] text-white/50 text-sm hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full mb-4 py-3 rounded-xl border border-dashed border-white/15 text-white/50 text-sm hover:border-white hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Library Item
        </button>
      )}

      {/* Items list */}
      {(items || []).length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-white/40 mx-auto mb-3" />
          <p className="text-white/50 mb-1">No library items yet</p>
          <p className="text-white/30 text-xs">Add common scope of work items to speed up quoting</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(items || []).map((item) => (
            <div key={item.id} className="bg-zinc-800/50 rounded-xl border border-white/10 px-4 py-3 flex items-start gap-3">
              <GripVertical className="w-4 h-4 text-white/20 flex-shrink-0 mt-1" />
              {editingId === item.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditingId(null); }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/20 text-white text-sm focus:border-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(item.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-white/20 text-white text-sm placeholder:text-white/30 focus:border-white focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(item.id)} disabled={!editTitle.trim() || updateMutation.isPending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 disabled:opacity-40 transition-colors">
                      {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-white/50 text-xs hover:text-white transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 font-medium">{item.text}</p>
                    {item.description && (
                      <p className="text-xs text-white/40 mt-0.5 leading-snug">{item.description}</p>
                    )}
                  </div>
                  <button onClick={() => { setEditingId(item.id); setEditTitle(item.text); setEditDesc(item.description ?? ""); }} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(item.id, item.text)} className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
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
          className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-white">{monthName}</h2>
        <button
          onClick={goToNextMonth}
          className="w-10 h-10 rounded-xl bg-zinc-800/50 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-white/30 py-1">{d}</div>
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
                      ? "bg-white text-black font-bold ring-2 ring-white"
                      : isToday
                        ? "bg-zinc-800 text-white font-semibold border border-white/20"
                        : hasJobs
                          ? "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                          : "text-white/50 hover:bg-zinc-800/50"
                  }`}
                >
                  <span className={isSelected ? "text-black" : ""}>{day}</span>
                  {hasJobs && (
                    <div className="flex gap-0.5">
                      {jobs.slice(0, 3).map((_, ji) => (
                        <div
                          key={ji}
                          className={`w-1 h-1 rounded-full ${isSelected ? "bg-black/60" : "bg-purple-400"}`}
                        />
                      ))}
                      {jobs.length > 3 && (
                        <span className={`text-[8px] ${isSelected ? "text-black/60" : "text-purple-400"}`}>+</span>
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
              <h3 className="text-sm font-semibold text-white/60 mb-3">
                {formatAESTDate(new Date(year, month - 1, selectedDay), { weekday: "long", day: "numeric", month: "long" })}
                {selectedJobs.length > 0 && (
                  <span className="ml-2 text-purple-400">({selectedJobs.length} job{selectedJobs.length !== 1 ? "s" : ""})</span>
                )}
              </h3>
              {selectedJobs.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-zinc-800/30 py-8 text-center">
                  <Calendar className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/30">No jobs scheduled</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedJobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => onEditQuote(job.slug)}
                      className="w-full text-left rounded-xl border border-white/10 bg-zinc-800/30 p-4 hover:border-white/20 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">
                            {job.quoteNumber} · {job.clientName || "Unnamed"}
                          </p>
                          <p className="text-xs text-white/40 truncate mt-0.5">
                            {job.propertyAddress || "No address"}
                          </p>
                          {job.agentName && (
                            <p className="text-xs text-white/30 mt-0.5">{job.agentName}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <StatusBadge status={job.jobStatus as JobStatus} />
                          {job.acceptedTotal && (
                            <span className="text-xs text-green-400 font-medium">
                              ${job.acceptedTotal.toLocaleString()}
                            </span>
                          )}
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
            <div className="mt-6 rounded-xl border border-white/10 bg-zinc-800/30 p-4">
              <p className="text-xs text-white/40 mb-1">Monthly Summary</p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-2xl font-bold text-white">{(calendarJobs || []).length}</p>
                  <p className="text-xs text-white/40">Jobs</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    ${(calendarJobs || []).reduce((sum, j) => sum + (j.acceptedTotal || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-white/40">Revenue</p>
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
  // Xero removed — Saasu syncs automatically on job completion
  return null;
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

  const formatPrice = (n: number) => "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 0 });

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

  // Summary stats
  const invoices = invoicesList || [];
  const overdueCount = invoices.filter(isOverdue).length;
  const totalOutstanding = invoices
    .filter((i) => i.paymentStatus !== "paid_in_full")
    .reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPaid = invoices
    .filter((i) => i.paymentStatus === "paid_in_full")
    .reduce((sum, i) => sum + i.totalAmount, 0);
  const depositsPaid = invoices
    .filter((i) => i.paymentStatus === "deposit_paid")
    .reduce((sum, i) => sum + i.depositAmount, 0);

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
      <div className="max-w-2xl mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-400">{overdueCount} overdue invoice{overdueCount !== 1 ? "s" : ""}</p>
            <p className="text-[10px] text-red-400/60">Unpaid for 30+ days — reminder emails are sent automatically</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-zinc-800/50 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Outstanding</span>
          </div>
          <p className="text-lg font-semibold text-red-400">{formatPrice(totalOutstanding)}</p>
        </div>
        <div className="bg-zinc-800/50 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Banknote className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Deposits</span>
          </div>
          <p className="text-lg font-semibold text-amber-400">{formatPrice(depositsPaid)}</p>
        </div>
        <div className="bg-zinc-800/50 border border-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CircleCheckBig className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider">Paid</span>
          </div>
          <p className="text-lg font-semibold text-emerald-400">{formatPrice(totalPaid)}</p>
        </div>
      </div>

      {/* Payment Status Filter */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        <button
          onClick={() => setPaymentFilter("all")}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            paymentFilter === "all" ? "bg-white/10 border-white/20 text-white" : "border-white/10 text-white/40 hover:text-white/60"
          }`}
        >
          All ({invoices.length})
        </button>
        {PAYMENT_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setPaymentFilter(paymentFilter === s.value ? "all" : s.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              paymentFilter === s.value ? `${s.bg} ${s.border} ${s.color}` : "border-white/10 text-white/40 hover:text-white/60"
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
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Direct Invoice
        </button>
      </div>

      {/* Direct Invoice Modal */}
      {showDirectInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h2 className="text-base font-semibold text-white">Create Direct Invoice</h2>
                <p className="text-xs text-white/40 mt-0.5">For jobs confirmed via phone or text — no quote needed</p>
              </div>
              <button onClick={() => setShowDirectInvoiceModal(false)} className="text-white/40 hover:text-white/70 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {/* Client Details */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Client Details</p>
                <input
                  type="text"
                  placeholder="Client / Agent Name *"
                  value={directForm.recipientName}
                  onChange={(e) => setDirectForm((f) => ({ ...f, recipientName: e.target.value }))}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                />
                <input
                  type="email"
                  placeholder="Email Address *"
                  value={directForm.recipientEmail}
                  onChange={(e) => setDirectForm((f) => ({ ...f, recipientEmail: e.target.value }))}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={directForm.recipientPhone}
                  onChange={(e) => setDirectForm((f) => ({ ...f, recipientPhone: e.target.value }))}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                />
                <input
                  type="text"
                  placeholder="Property Address *"
                  value={directForm.propertyAddress}
                  onChange={(e) => setDirectForm((f) => ({ ...f, propertyAddress: e.target.value }))}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Line Items</p>
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
                      className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
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
                      className="w-24 bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                    />
                    {lineItems.length > 1 && (
                      <button
                        onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                        className="text-white/30 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setLineItems([...lineItems, { description: "", amount: "" }])}
                  className="flex items-center gap-1.5 text-xs text-amber-400/70 hover:text-amber-400 transition-colors mt-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add line item
                </button>
              </div>

              {/* Total Preview */}
              {lineItems.some((li) => parseFloat(li.amount) > 0) && (
                <div className="bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 flex justify-between items-center">
                  <span className="text-xs text-white/50">Total (inc. GST)</span>
                  <span className="text-base font-semibold text-amber-400">
                    ${lineItems.reduce((sum, li) => sum + (parseFloat(li.amount) || 0), 0).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Payment Terms */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-white/50 whitespace-nowrap">Payment terms</label>
                <select
                  value={directForm.paymentTermsDays}
                  onChange={(e) => setDirectForm((f) => ({ ...f, paymentTermsDays: parseInt(e.target.value) }))}
                  className="bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setShowDirectInvoiceModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white/70 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSendDirectInvoice}
                disabled={sendingDirect}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingDirect ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendingDirect ? "Sending..." : "Send Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No invoices yet</p>
          <p className="text-white/25 text-xs mt-1">Invoices are auto-generated when jobs are marked as completed</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <div key={inv.id} className="bg-zinc-800/50 border border-white/10 rounded-xl p-4">
              {/* Header Row */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{inv.invoiceNumber}</span>
                    <span className="text-xs text-white/30">·</span>
                    <span className="text-xs text-white/40">Ref: {inv.quoteNumber}</span>
                  </div>
                  <p className="text-xs text-white/50 mt-0.5">{inv.recipientName}</p>
                  {inv.propertyAddress && (
                    <p className="text-xs text-white/30 mt-0.5 truncate max-w-[280px]">{inv.propertyAddress}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">{formatPrice(inv.totalAmount)}</p>
                  <PaymentStatusBadge status={inv.paymentStatus} />
                  {isOverdue(inv) && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-medium mt-0.5">
                      <Clock className="w-2.5 h-2.5" /> Overdue
                    </span>
                  )}
                </div>
              </div>

              {/* Details Row */}
              <div className="flex items-center gap-3 text-xs text-white/30 mb-3">
                <span>Deposit: {formatPrice(inv.depositAmount)}</span>
                <span>·</span>
                <span>Balance: {formatPrice(inv.totalAmount - inv.depositAmount)}</span>
                <span>·</span>
                <span className="text-amber-400/60">{inv.paymentTermsDays ?? 30} day terms</span>
                <span>·</span>
                <span>{formatAESTDate(new Date(inv.createdAt), { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>

              {/* Actions Row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* PDF Download */}
                {inv.pdfUrl && (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-white/10"
                  >
                    <Download className="w-3 h-3" /> PDF
                  </a>
                )}

                {/* Send Email */}
                <button
                  onClick={() => handleSendEmail(inv.id)}
                  disabled={sendingEmailId === inv.id || !inv.recipientEmail}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  title={inv.recipientEmail ? `Send to ${inv.recipientEmail}` : "No email address"}
                >
                  {sendingEmailId === inv.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  {inv.emailSent ? "Resend" : "Email"}
                </button>
                {inv.emailSent === 1 && inv.emailSentAt && (
                  <span className="text-[10px] text-emerald-400/60">
                    Sent {formatAESTDate(new Date(inv.emailSentAt), { day: "numeric", month: "short" })}
                  </span>
                )}

                {/* Saasu Sync Indicator */}
                {(inv as any).xeroInvoiceId ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-medium">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Saasu
                  </span>
                ) : (
                  <XeroSyncButton password={password} invoiceId={inv.id} onSynced={() => refetch()} />
                )}

                {/* Payment Status Dropdown */}
                <div className="ml-auto relative">
                  <select
                    value={inv.paymentStatus}
                    onChange={(e) => handlePaymentStatusChange(inv.id, e.target.value as PaymentStatus)}
                    className="appearance-none bg-zinc-700/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 cursor-pointer hover:bg-zinc-700 transition-colors pr-6"
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <ChevronRight className="w-3 h-3 text-white/30 absolute right-1.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                </div>
              </div>
            </div>
          ))}
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
      <h2 className="text-lg font-semibold text-white mb-4">Saasu Integration</h2>
      <p className="text-xs text-white/40 mb-6">
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
            <p className="text-xs text-white/40">Saasu File ID configured</p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mt-4 space-y-3">
        <h3 className="text-sm font-medium text-white/60">How It Works</h3>
        <div className="space-y-2">
          {[
            { step: "1", text: "When a job is marked Completed, a sales invoice is auto-created in Saasu" },
            { step: "2", text: "Contact is looked up by email/company — created if not found" },
            { step: "3", text: "If a deposit was already paid, it’s recorded as a partial payment" },
            { step: "4", text: "Invoice summary uses quote code + property address for easy reference" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-white/40 flex-shrink-0 mt-0.5">
                {item.step}
              </span>
              <p className="text-xs text-white/40">{item.text}</p>
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
          <span className="text-sm font-semibold text-white">Notification History</span>
          {entries.length > 0 && (
            <span className="text-xs bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full">{entries.length}</span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="text-white/30 hover:text-white/60 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      {isLoading ? (
        <div className="px-4 py-4 flex items-center gap-2 text-white/30 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : entries.length === 0 ? (
        <div className="px-4 py-4 flex items-center gap-2 text-white/30 text-sm">
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
                  <span className="text-xs font-medium text-white/80">
                    {triggerLabels[entry.statusTrigger] ?? entry.statusTrigger}
                  </span>
                  <span className="text-xs text-white/30 uppercase tracking-wide">{entry.channel}</span>
                  {!entry.success && (
                    <span className="text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">Failed</span>
                  )}
                </div>
                <div className="text-xs text-white/35 mt-0.5 truncate">
                  {entry.recipientEmail || entry.recipientPhone || "—"}
                  {entry.recipientName ? ` · ${entry.recipientName}` : ""}
                </div>
                {entry.errorMessage && (
                  <div className="text-xs text-red-400/70 mt-0.5 truncate">{entry.errorMessage}</div>
                )}
              </div>
              <div className="text-xs text-white/25 flex-shrink-0 mt-0.5">
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
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" /> Notification Log
          </h2>
          <p className="text-xs text-white/35 mt-0.5">Every SMS and email the system has attempted to send</p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-white/30 hover:text-white/60 transition-colors p-2"
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
          className="flex-1 px-3 py-2 rounded-xl bg-zinc-800/60 border border-white/10 text-white text-sm placeholder-white/25 focus:outline-none focus:border-amber-400/50"
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
            className="px-3 py-2 rounded-xl bg-zinc-800/60 border border-white/10 text-white/50 hover:text-white text-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Summary stats */}
      {!isLoading && entries.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-zinc-800/40 border border-white/8 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-white">{entries.length}</p>
            <p className="text-xs text-white/35">Total</p>
          </div>
          <div className="rounded-xl bg-emerald-900/20 border border-emerald-500/15 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-emerald-400">{entries.filter(e => e.success).length}</p>
            <p className="text-xs text-white/35">Delivered</p>
          </div>
          <div className="rounded-xl bg-red-900/20 border border-red-500/15 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-red-400">{entries.filter(e => !e.success).length}</p>
            <p className="text-xs text-white/35">Failed</p>
          </div>
        </div>
      )}

      {/* Log table */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-white/30 text-sm py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading notifications...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <BellOff className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-white/30 text-sm">
            {appliedFilter ? `No notifications found for ${appliedFilter}` : "No notifications logged yet"}
          </p>
          <p className="text-white/20 text-xs mt-1">Notifications will appear here as quotes are processed</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="divide-y divide-white/5">
            {entries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 flex items-start gap-3 hover:bg-white/2 transition-colors">
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
                    <span className="text-xs font-semibold text-amber-400">{entry.quoteNumber}</span>
                    <span className="text-xs font-medium text-white/80">
                      {triggerLabels[entry.statusTrigger] ?? entry.statusTrigger}
                    </span>
                    <span className="text-xs text-white/30 uppercase tracking-wide">{entry.channel}</span>
                    {!entry.success && (
                      <span className="text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">Failed</span>
                    )}
                  </div>
                  <div className="text-xs text-white/35 mt-0.5 truncate">
                    {entry.recipientEmail || entry.recipientPhone || "—"}
                    {entry.recipientName ? ` · ${entry.recipientName}` : ""}
                  </div>
                  {entry.errorMessage && (
                    <div className="text-xs text-red-400/70 mt-0.5 truncate">{entry.errorMessage}</div>
                  )}
                </div>
                <div className="text-xs text-white/25 flex-shrink-0 mt-0.5 text-right">
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
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-white/40 text-sm">
        Agency not found.
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "text-white/30",
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
        className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
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
              <p className="text-white/50 text-sm mt-0.5">{data.contactPerson}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-3">
              {data.email && (
                <a href={`mailto:${data.email}`} className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs transition-colors">
                  <Mail className="w-3.5 h-3.5" /> {data.email}
                </a>
              )}
              {data.phone && (
                <a href={`tel:${data.phone}`} className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs transition-colors">
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
          <p className="text-white/40 text-xs mb-1">Total Revenue</p>
          <p className="text-white font-bold text-xl">{fmt(data.revenue.totalQuoted)}</p>
          <p className="text-white/30 text-xs mt-0.5">{data.quotes.length} quote{data.quotes.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl border border-white/10 p-4">
          <p className="text-white/40 text-xs mb-1">Outstanding</p>
          <p className={`font-bold text-xl ${data.revenue.outstanding > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {fmt(data.revenue.outstanding)}
          </p>
          <p className="text-white/30 text-xs mt-0.5">{data.invoices.length} invoice{data.invoices.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl border border-white/10 p-4">
          <p className="text-white/40 text-xs mb-1">Total Invoiced</p>
          <p className="text-white font-semibold text-lg">{fmt(data.revenue.totalInvoiced)}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl border border-white/10 p-4">
          <p className="text-white/40 text-xs mb-1">Total Paid</p>
          <p className="text-emerald-400 font-semibold text-lg">{fmt(data.revenue.totalPaid)}</p>
        </div>
      </div>

      {/* Quotes */}
      <div>
        <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Quotes</h3>
        {data.quotes.length === 0 ? (
          <p className="text-white/30 text-sm">No quotes yet.</p>
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
                      <span className={`text-xs font-medium ${statusColors[q.jobStatus || "draft"] || "text-white/40"}`}>
                        {statusLabels[q.jobStatus || "draft"] || q.jobStatus}
                      </span>
                    </div>
                    {q.propertyAddress && (
                      <p className="text-white/40 text-xs mt-0.5 truncate">{q.propertyAddress}</p>
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
                    <p className="text-white/25 text-xs">
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
          <h3 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Invoices</h3>
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
                      <p className="text-white/40 text-xs mt-0.5">{inv.propertyAddress}</p>
                      <p className="text-white/25 text-xs mt-0.5">
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
                          className="inline-flex items-center gap-1 text-white/30 hover:text-white text-xs mt-1 transition-colors"
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
            <p className="text-white/40 text-xs">Agencies</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl border border-white/10 p-3 text-center">
            <p className="text-white font-bold text-lg">{totalQuotes}</p>
            <p className="text-white/40 text-xs">Quotes</p>
          </div>
          <div className="bg-zinc-800/50 rounded-xl border border-white/10 p-3 text-center">
            <p className="text-white font-bold text-lg">{fmt(totalRevenue)}</p>
            <p className="text-white/40 text-xs">Revenue</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Search agencies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-800/50 border border-white/10 text-white text-sm placeholder:text-white/30 focus:border-white/30 focus:outline-none"
        />
      </div>

      {/* Agency list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm">
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
                        <p className="text-white/40 text-xs mt-0.5">{agency.contactPerson}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {agency.totalRevenue > 0 ? (
                        <p className="text-white font-semibold text-sm">{fmt(agency.totalRevenue)}</p>
                      ) : null}
                      <p className="text-white/30 text-xs">
                        {agency.quoteCount} quote{agency.quoteCount !== 1 ? "s" : ""}
                        {agency.acceptedCount > 0 ? ` · ${agency.acceptedCount} accepted` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {agency.email && (
                      <span className="flex items-center gap-1 text-white/30 text-xs">
                        <Mail className="w-3 h-3" /> {agency.email}
                      </span>
                    )}
                    {agency.lastActivityAt && (
                      <span className="text-white/20 text-xs">
                        {formatRelativeTime(new Date(agency.lastActivityAt))}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 flex-shrink-0 mt-1 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Export ─────────────────────────────────────────────────────────────────────
type AdminView = "dashboard" | "calendar" | "contacts" | "library" | "invoices" | "xero" | "notifications" | "agencies";;

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

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Tab Header */}
      <div className="sticky top-0 z-50 bg-white/5 backdrop-blur border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4">
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex flex-col items-start">
              <img
                src={LOGO_WHITE_PNG}
                alt="Bell Carpets"
                className="h-5"
              />
              <p className="text-[7px] tracking-[0.2em] text-white/40 uppercase font-light mt-0.5">RESIDENTIAL | COMMERCIAL | PROJECTS</p>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/70 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
            >
              <Lock className="w-3 h-3" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
          {/* Tab bar — horizontally scrollable on mobile, min-width per tab so items never jam */}
          <div className="overflow-x-auto -mb-px scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="flex min-w-max">
              <button
                onClick={() => setView("dashboard")}
                className={`min-w-[72px] px-3 py-3 text-xs font-medium flex flex-col items-center gap-1 border-b-2 transition-colors ${
                  view === "dashboard" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Quotes</span>
              </button>
              <button
                onClick={() => setView("calendar")}
                className={`min-w-[72px] px-3 py-3 text-xs font-medium flex flex-col items-center gap-1 border-b-2 transition-colors ${
                  view === "calendar" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Calendar</span>
              </button>
              <button
                onClick={() => setView("contacts")}
                className={`min-w-[72px] px-3 py-3 text-xs font-medium flex flex-col items-center gap-1 border-b-2 transition-colors ${
                  view === "contacts" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                <BookUser className="w-4 h-4" />
                <span>Contacts</span>
              </button>
              <button
                onClick={() => setView("invoices")}
                className={`min-w-[72px] px-3 py-3 text-xs font-medium flex flex-col items-center gap-1 border-b-2 transition-colors ${
                  view === "invoices" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Invoices</span>
              </button>
              <button
                onClick={() => setView("library")}
                className={`min-w-[72px] px-3 py-3 text-xs font-medium flex flex-col items-center gap-1 border-b-2 transition-colors ${
                  view === "library" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Library</span>
              </button>
              <button
                onClick={() => setView("xero")}
                className={`min-w-[72px] px-3 py-3 text-xs font-medium flex flex-col items-center gap-1 border-b-2 transition-colors ${
                  view === "xero" ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Saasu</span>
              </button>
              <button
                onClick={() => setView("agencies")}
                className={`min-w-[72px] px-3 py-3 text-xs font-medium flex flex-col items-center gap-1 border-b-2 transition-colors ${
                  view === "agencies" ? "border-purple-400 text-purple-400" : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Agencies</span>
              </button>
              <button
                onClick={() => setView("notifications")}
                className={`min-w-[72px] px-3 py-3 text-xs font-medium flex flex-col items-center gap-1 border-b-2 transition-colors ${
                  view === "notifications" ? "border-amber-400 text-amber-400" : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>Notifs</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Content */}
      {view === "dashboard" && <QuotesDashboard password={password} onEditQuote={setEditingSlug} />}
      {view === "calendar" && <CalendarView password={password} onEditQuote={setEditingSlug} />}
      {view === "contacts" && <ContactsManager password={password} />}
      {view === "invoices" && <InvoicesTab password={password} />}
      {view === "library" && <ScopeLibraryManager />}
      {view === "xero" && <XeroSettings password={password} />}
      {view === "notifications" && <NotificationLogView />}
      {view === "agencies" && <AgenciesTab password={password} onEditQuote={(slug) => { setEditingSlug(slug); setView("dashboard"); }} />}
    </div>
  );
}
