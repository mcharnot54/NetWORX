"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export default function MobileSidebarToggle() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    
    // Toggle mobile-open class on sidebar
    const sidebar = document.querySelector('.sidebar-navigation');
    if (sidebar) {
      sidebar.classList.toggle('mobile-open', !isMobileMenuOpen);
    }
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector('.sidebar-navigation');
      const toggle = document.querySelector('.mobile-sidebar-toggle');
      
      if (
        isMobileMenuOpen &&
        sidebar &&
        toggle &&
        !sidebar.contains(event.target as Node) &&
        !toggle.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
        sidebar.classList.remove('mobile-open');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <button
      className="mobile-sidebar-toggle"
      onClick={toggleMobileMenu}
      style={{
        position: "fixed",
        top: "130px",
        left: "1rem",
        width: "48px",
        height: "48px",
        backgroundColor: "#3b82f6",
        color: "white",
        border: "none",
        borderRadius: "12px",
        display: "none",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
        zIndex: 60,
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
      }}
    >
      {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      
      <style jsx>{`
        @media (max-width: 1024px) {
          .mobile-sidebar-toggle {
            display: flex !important;
          }
        }
      `}</style>
    </button>
  );
}
