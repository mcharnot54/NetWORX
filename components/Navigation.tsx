"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/data-processor", label: "Data Processor" },
  { href: "/warehouse-optimizer", label: "Warehouse Optimizer" },
  { href: "/inventory-optimizer", label: "Inventory Optimizer" },
  { href: "/transport-optimizer", label: "Transport Optimizer" },
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
