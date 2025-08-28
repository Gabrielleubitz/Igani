"use client";

import { Code, Palette, Zap, Globe, Smartphone, Search } from "lucide-react";
import { motion } from "framer-motion";
import { GlowingEffect } from "./glowing-effect";
import { cn } from "@/lib/utils";

export function ServicesGrid() {
  return (
    <div className="w-full py-20 bg-slate-800">
      <div className="text-center mb-12">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4"
        >
          Our Services
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto px-4"
        >
          Comprehensive web development solutions tailored to your business needs
        </motion.p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          viewport={{ once: true }}
        >
          <ServiceCard
            icon={<Code className="h-4 w-4" />}
            title="Custom Development"
            description="Tailored web applications built with cutting-edge technologies and best practices."
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <ServiceCard
            icon={<Palette className="h-4 w-4" />}
            title="Premium Design"
            description="Beautiful, user-centric designs that convert visitors into customers."
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <ServiceCard
            icon={<Zap className="h-4 w-4" />}
            title="Performance Optimization"
            description="Lightning-fast websites optimized for speed, SEO, and user experience."
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <ServiceCard
            icon={<Globe className="h-4 w-4" />}
            title="E-commerce Solutions"
            description="Complete online stores with payment processing and inventory management."
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <ServiceCard
            icon={<Smartphone className="h-4 w-4" />}
            title="Mobile-First Design"
            description="Responsive websites that look perfect on all devices."
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <ServiceCard
            icon={<Search className="h-4 w-4" />}
            title="SEO & Analytics"
            description="Search engine optimization and detailed analytics to grow your business."
          />
        </motion.div>
      </div>
    </div>
  );
}

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}

const ServiceCard = ({ icon, title, description }: ServiceCardProps) => {
  return (
    <div className="min-h-[16rem]">
      <div className="relative h-full rounded-2xl border border-slate-600/50 p-3 bg-slate-700/30">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <div className="relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border border-slate-600/30 bg-slate-800/80 backdrop-blur-sm p-6 shadow-lg">
          <div className="flex flex-col gap-4">
            <div className="w-fit rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-3">
              <div className="text-cyan-400">
                {icon}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white leading-tight">
                {title}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};