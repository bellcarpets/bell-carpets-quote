/**
 * ConfidenceBadge — homeowner-only sign-off statement on the customer-facing quote page.
 * Simple one-line statement: "Bell Carpets — second-generation family business, Gold Coast since 1987."
 */
import { motion } from "framer-motion";

export default function ConfidenceBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="mt-16 text-center"
    >
      <p
        style={{
          fontSize: "0.9375rem",
          lineHeight: 1.75,
          fontWeight: 300,
          letterSpacing: "0.02em",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        Bell Carpets — second-generation family business, Gold Coast since 1987.
      </p>
    </motion.div>
  );
}
