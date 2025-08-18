"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/data-processor", label: "Data Processor" },
  { href: "/multi-tab-upload", label: "📊 Multi-Tab Upload" },
  { href: "/test-enhanced-validation", label: "🔍 Enhanced Validation" },
  { href: "/missing-data-demo", label: "🧠 Missing Data AI" },
  { href: "/capacity-optimizer", label: "Capacity Optimizer" },
  { href: "/warehouse-optimizer", label: "Warehouse Optimizer" },
  { href: "/transport-optimizer", label: "Transport Optimizer" },
  { href: "/inventory-optimizer", label: "Inventory Optimizer" },
  { href: "/visualizer", label: "Results & Visualization" },
  { href: "/config", label: "Configuration" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="navigation">
      <ul className="nav-list">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`nav-item ${pathname === item.href ? "active" : ""}`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
