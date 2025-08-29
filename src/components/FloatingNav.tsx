import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Folder, Box, Info, Mail, ChevronLeft, ChevronRight } from 'lucide-react';

const menuItems = [
  {
    icon: Home,
    label: "Home",
    name: "Home",
    url: "#home",
    gradient: "radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(8,145,178,0.06) 50%, rgba(14,116,144,0) 100%)",
    iconColor: "text-cyan-400",
  },
  {
    icon: Folder,
    label: "Portfolio",
    name: "Portfolio",
    url: "#portfolio",
    gradient: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
    iconColor: "text-blue-400",
  },
  {
    icon: Box,
    label: "Components",
    name: "Components",
    url: "#components",
    gradient: "radial-gradient(circle, rgba(147,51,234,0.15) 0%, rgba(126,34,206,0.06) 50%, rgba(107,33,168,0) 100%)",
    iconColor: "text-purple-400",
  },
  {
    icon: Info,
    label: "About",
    name: "About",
    url: "#about",
    gradient: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.06) 50%, rgba(21,128,61,0) 100%)",
    iconColor: "text-green-400",
  },
  {
    icon: Mail,
    label: "Contact",
    name: "Contact",
    url: "#contact",
    gradient: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(234,88,12,0.06) 50%, rgba(194,65,12,0) 100%)",
    iconColor: "text-orange-400",
  },
];

export function FloatingNav() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeItem, setActiveItem] = useState("Home");

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.getElementById('home');
      if (heroSection) {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        const scrollPosition = window.scrollY + 100;
        setIsVisible(scrollPosition > heroBottom);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'portfolio', 'components', 'about', 'contact'];
      const scrollPosition = window.scrollY + 100;
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveItem(section.charAt(0).toUpperCase() + section.slice(1));
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleItemClick = (label: string) => {
    setActiveItem(label);
    const sectionId = label.toLowerCase();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ duration: 0.3 }}
        className="fixed right-6 top-1/2 transform -translate-y-1/2 z-50 floating-nav"
      >
        <div className="relative">
          {/* Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="
              w-12 h-12 bg-slate-800/60 backdrop-blur-xl rounded-xl
              border border-slate-600/30 text-slate-300 hover:text-white
              flex items-center justify-center
              hover:bg-slate-700/80 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
              shadow-sm hover:shadow-md shadow-black/20
              active:scale-95 hover:scale-105
            "
          >
            {isExpanded ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>

          {/* Navigation Menu */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="absolute right-16 top-0 bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-600/30 p-3 shadow-lg shadow-black/20"
              >
                <div className="space-y-2">
                  {menuItems.map((item, index) => (
                    <motion.button
                      key={item.label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      onClick={() => handleItemClick(item.label)}
                      className={`
                        group relative w-full text-left px-4 py-3 rounded-xl font-medium text-sm tracking-tight
                        transition-all duration-300 ease-out
                        ${activeItem === item.label
                          ? 'bg-slate-700/80 text-white shadow-lg shadow-black/20 scale-[1.02]'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300"
                          style={{
                            background: item.gradient
                          }}
                        >
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="whitespace-nowrap">{item.label}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
