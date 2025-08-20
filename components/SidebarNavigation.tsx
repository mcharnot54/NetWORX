"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Upload,
  FileSpreadsheet,
  Package,
  BarChart3,
  Brain,
  FolderOpen,
  Rocket,
  BarChart2,
  Target,
  Warehouse,
  Truck,
  PackageCheck,
  MapPin,
  Clock,
  Settings,
  Home,
} from "lucide-react";

const navItems = [
  { 
    href: "/", 
    label: "Dashboard", 
    icon: Home,
    category: "main"
  },
  { 
    href: "/data-processor", 
    label: "Data Processor", 
    icon: Database,
    category: "data"
  },
  { 
    href: "/excel-upload", 
    label: "S3 Excel Upload", 
    icon: Upload,
    category: "data"
  },
  { 
    href: "/inventory-upload", 
    label: "Inventory Upload", 
    icon: Package,
    category: "data"
  },
  { 
    href: "/multi-tab-upload", 
    label: "Multi-Tab Upload", 
    icon: FileSpreadsheet,
    category: "data"
  },
  { 
    href: "/test-enhanced-validation", 
    label: "Enhanced Validation", 
    icon: BarChart3,
    category: "data"
  },
  { 
    href: "/missing-data-demo", 
    label: "Missing Data AI", 
    icon: Brain,
    category: "data"
  },
  { 
    href: "/optimizer/import", 
    label: "Data Import Wizard", 
    icon: FolderOpen,
    category: "optimizer"
  },
  { 
    href: "/optimizer", 
    label: "Network Optimizer", 
    icon: Rocket,
    category: "optimizer"
  },
  { 
    href: "/optimizer/scenarios", 
    label: "Scenario Sweep", 
    icon: BarChart2,
    category: "optimizer"
  },
  { 
    href: "/capacity-optimizer", 
    label: "Capacity Optimizer", 
    icon: Target,
    category: "optimizer"
  },
  { 
    href: "/warehouse-optimizer", 
    label: "Warehouse Optimizer", 
    icon: Warehouse,
    category: "optimizer"
  },
  { 
    href: "/transport-optimizer", 
    label: "Transport Optimizer", 
    icon: Truck,
    category: "optimizer"
  },
  { 
    href: "/inventory-optimizer", 
    label: "Inventory Optimizer", 
    icon: PackageCheck,
    category: "optimizer"
  },
  { 
    href: "/visualizer", 
    label: "Results & Visualization", 
    icon: MapPin,
    category: "analysis"
  },
  { 
    href: "/timeout-debug", 
    label: "Timeout Debug", 
    icon: Clock,
    category: "analysis"
  },
  { 
    href: "/config", 
    label: "Configuration", 
    icon: Settings,
    category: "config"
  },
];

const categoryLabels = {
  main: "Main",
  data: "Data Management",
  optimizer: "Optimization",
  analysis: "Analysis & Reporting",
  config: "Configuration",
};

interface SidebarNavigationProps {
  className?: string;
}

export default function SidebarNavigation({ className = "" }: SidebarNavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const groupedItems = navItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  return (
    <aside 
      className={`sidebar-navigation ${isCollapsed ? "collapsed" : ""} ${className}`}
      style={{
        width: isCollapsed ? "80px" : "280px",
        minWidth: isCollapsed ? "80px" : "280px",
        height: "calc(100vh - 140px)", // Account for banner height
        position: "fixed",
        top: "140px", // Position below fixed banner
        left: "0",
        backgroundColor: "white",
        borderRight: "3px solid #3b82f6",
        boxShadow: "4px 0 12px rgba(59, 130, 246, 0.15)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 40,
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="sidebar-toggle"
        style={{
          position: "absolute",
          top: "16px",
          right: isCollapsed ? "16px" : "16px",
          width: "32px",
          height: "32px",
          backgroundColor: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.2s ease",
          zIndex: 50,
          boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
        }}
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* Navigation Content */}
      <div 
        style={{
          padding: isCollapsed ? "60px 8px 20px" : "60px 16px 20px",
          height: "100%",
        }}
      >
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} style={{ marginBottom: "24px" }}>
            {!isCollapsed && (
              <h3
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                  paddingLeft: "12px",
                }}
              >
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h3>
            )}
            
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <li key={item.href} style={{ marginBottom: "4px" }}>
                    <Link
                      href={item.href}
                      className="sidebar-nav-item"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: isCollapsed ? "0" : "12px",
                        padding: isCollapsed ? "12px 8px" : "12px 16px",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        transition: "all 0.2s ease",
                        color: isActive ? "#1e40af" : "#374151",
                        backgroundColor: isActive ? "#eff6ff" : "transparent",
                        border: isActive ? "1px solid #bfdbfe" : "1px solid transparent",
                        justifyContent: isCollapsed ? "center" : "flex-start",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "#f8fafc";
                          e.currentTarget.style.color = "#1f2937";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#374151";
                        }
                      }}
                      title={isCollapsed ? item.label : ""}
                    >
                      <Icon 
                        size={20} 
                        style={{
                          flexShrink: 0,
                          color: isActive ? "#3b82f6" : "currentColor",
                        }} 
                      />
                      {!isCollapsed && (
                        <span style={{ 
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {item.label}
                        </span>
                      )}
                      
                      {/* Active indicator */}
                      {isActive && (
                        <div
                          style={{
                            position: "absolute",
                            right: "0",
                            top: "0",
                            bottom: "0",
                            width: "3px",
                            backgroundColor: "#3b82f6",
                            borderRadius: "0 4px 4px 0",
                          }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
