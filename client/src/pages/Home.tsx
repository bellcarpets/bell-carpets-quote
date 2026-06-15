/**
 * Home — Landing page that redirects to /admin
 * In the multi-quote system, the main page redirects to the admin panel
 * where the owner can create, manage, and share individual quote links.
 */

import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/admin");
  }, [setLocation]);

  return null;
}
