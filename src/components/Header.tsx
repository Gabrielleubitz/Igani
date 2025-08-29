import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X, Settings, Home, Folder, Box, Info, Mail } from 'lucide-react';
import { NavBar } from './ui/tubelight-navbar';
import IganiMark from './IganiMark'; // Add this import

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

interface HeaderProps {
  onAdminToggle: () => void;
}

export default function Header({ onAdminToggle }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeItem, setActiveItem] = useState("Home");

  const location = useLocation();

  // Hide navigation on preview page
  const isPreviewPage = location.pathname === '/preview';

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'portfolio', 'components', 'about', 'contact'];
      const scrollPosition = window.scrollY + 100;
      const isScrolled = window.scrollY > 20;

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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Don't render header on preview page
  if (isPreviewPage) {
    return null;
  }

  return (
    <header className="relative z-[100] transition-all duration-500 ease-out">
      <div 
        className="bg-slate-900/95 border-b border-slate-600/50 shadow-lg shadow-black/20 backdrop-blur-2xl transition-all duration-500 ease-out"
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 relative z-[110]">
            
            {/* Logo */}
            <div className="flex items-center space-x-3 group cursor-pointer">
              <IganiMark 
                size={40}
                variant="both"
                animateOnHover={true}
                className="transition-all duration-500 ease-out group-hover:scale-110"
                ariaLabel="Igani logo"
              />
              <span className="text-xl font-medium text-white tracking-tight transition-all duration-500 ease-out group-hover:translate-x-1">
                Igani
              </span>
            </div>

            {/* Desktop Navigation - Glow Menu */}
            <div className="hidden lg:flex items-center justify-center flex-1 mx-8">
              <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-600/30 p-1 shadow-lg shadow-black/20">
                <NavBar
                  items={menuItems}
                  activeItem={activeItem}
                  onItemClick={handleItemClick}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                className="
                  group relative overflow-hidden
                  bg-blue-600 hover:bg-blue-700
                  backdrop-blur-xl rounded-xl px-6 py-2.5
                  border border-blue-500/50 hover:border-blue-400/50
                  text-white font-medium
                  transition-all duration-300 ease-out
                  shadow-lg hover:shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40
                  hover:scale-105 active:scale-95
                "
              >
                Book a 15-min call
              </button>
              <button
                onClick={onAdminToggle}
                className="
                  group relative overflow-hidden
                  bg-slate-800/60 hover:bg-slate-700/80
                  backdrop-blur-xl rounded-xl px-4 py-2.5
                  border border-slate-600/30 hover:border-slate-500/50
                  text-slate-300 hover:text-white
                  transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                  shadow-sm hover:shadow-md shadow-black/20
                  active:scale-95 hover:scale-105
                "
                title="Admin Panel"
              >
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 transition-all duration-700 ease-out group-hover:rotate-180" />
                  <span className="hidden sm:inline font-medium text-sm tracking-tight transition-all duration-500 ease-out group-hover:translate-x-0.5">Admin</span>
                </div>
              </button>

              {/* Mobile menu button */}
              <button
                onClick={toggleMenu}
                className="
                  lg:hidden group relative overflow-hidden
                  bg-slate-800/60 hover:bg-slate-700/80
                  backdrop-blur-xl rounded-xl p-2.5
                  border border-slate-600/30 hover:border-slate-500/50
                  text-slate-300 hover:text-white
                  transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                  shadow-sm hover:shadow-md shadow-black/20
                  active:scale-95 hover:scale-105
                "
              >
                <div className="relative w-5 h-5">
                  <Menu className={`absolute inset-0 w-5 h-5 transition-all duration-700 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] ${isMenuOpen ? 'opacity-0 rotate-180 scale-50' : 'opacity-100 rotate-0 scale-100'}`} />
                  <X className={`absolute inset-0 w-5 h-5 transition-all duration-700 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] ${isMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-50'}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          <div className={`
            lg:hidden overflow-hidden transition-all duration-500 ease-out
            ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
          `}>
            <div className="border-t border-slate-600/30 bg-slate-800/60 backdrop-blur-xl mx-4 mb-4 rounded-2xl shadow-xl shadow-black/20">
              <div className="p-4 space-y-2">
                {menuItems.map((item, index) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      handleItemClick(item.label);
                      setIsMenuOpen(false);
                    }}
                    className={`
                      group w-full text-left px-4 py-3 rounded-xl font-medium text-sm tracking-tight
                      transition-all duration-300 ease-out
                      ${activeItem === item.label
                        ? 'bg-slate-700/80 text-white shadow-lg shadow-black/20 scale-[1.02]'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }
                    `}
                    style={{
                      transitionDelay: `${index * 50}ms`
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`
                        transition-all duration-300 text-base
                        ${activeItem === item.label ? item.iconColor : 'grayscale group-hover:grayscale-0'}
                      `}>
                        {React.createElement(item.icon)}
                      </span>
                      <span className="transition-all duration-300">{item.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export { Header };