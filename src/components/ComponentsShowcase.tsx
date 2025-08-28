import React, { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Code2, Sparkles, Zap, MousePointer, Eye, Layers, Atom, Copy, Check } from 'lucide-react';

// Lazy load heavy components
const EvervaultCard = lazy(() => import('./ui/evervault-card').then(module => ({ default: module.EvervaultCard })));
const Icon = lazy(() => import('./ui/evervault-card').then(module => ({ default: module.Icon })));
const ParticleTextEffect = lazy(() => import('./ui/interactive-text-particle').then(module => ({ default: module.ParticleTextEffect })));
const InteractiveRobotSpline = lazy(() => import('./ui/interactive-3d-robot').then(module => ({ default: module.InteractiveRobotSpline })));

interface ComponentShowcaseProps {
  // We'll add component props here as you provide components from 21st.dev
}

export function ComponentsShowcase({}: ComponentShowcaseProps) {
  const [copiedStates, setCopiedStates] = React.useState<{[key: string]: boolean}>({});

  const copyToClipboard = async (text: string, componentId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [componentId]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [componentId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const evervaultPromptAndCode = `PROMPT:
"Create an interactive card component with a matrix-style hover effect. When the user hovers over the card, it should reveal encrypted text that animates and changes. The card should have a clean design with rounded corners and show a text in the center."

CODE:
\`\`\`tsx
"use client";
import { useMotionValue } from "framer-motion";
import React, { useState, useEffect } from "react";
import { useMotionTemplate, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const EvervaultCard = ({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) => {
  let mouseX = useMotionValue(0);
  let mouseY = useMotionValue(0);

  const [randomString, setRandomString] = useState("");

  useEffect(() => {
    let str = generateRandomString(1500);
    setRandomString(str);
  }, []);

  function onMouseMove({ currentTarget, clientX, clientY }: any) {
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);

    const str = generateRandomString(1500);
    setRandomString(str);
  }

  return (
    <div
      className={cn(
        "p-0.5  bg-transparent aspect-square  flex items-center justify-center w-full h-full relative",
        className
      )}
    >
      <div
        onMouseMove={onMouseMove}
        className="group/card rounded-3xl w-full relative overflow-hidden bg-transparent flex items-center justify-center h-full"
      >
        <CardPattern
          mouseX={mouseX}
          mouseY={mouseY}
          randomString={randomString}
        />
        <div className="relative z-10 flex items-center justify-center">
          <div className="relative h-24 w-24 rounded-full flex items-center justify-center text-white font-bold text-lg">
            <div className="absolute w-full h-full bg-white/[0.8] dark:bg-black/[0.8] blur-sm rounded-full" />
            <span className="dark:text-white text-black z-20">{text}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export function CardPattern({ mouseX, mouseY, randomString }: any) {
  let maskImage = useMotionTemplate\`radial-gradient(250px at \${mouseX}px \${mouseY}px, white, transparent)\`;
  let style = { maskImage, WebkitMaskImage: maskImage };

  return (
    <div className="pointer-events-none">
      <div className="absolute inset-0 rounded-2xl  [mask-image:linear-gradient(white,transparent)] group-hover/card:opacity-50"></div>
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500 to-blue-700 opacity-0  group-hover/card:opacity-100 backdrop-blur-xl transition duration-500"
        style={style}
      />
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 mix-blend-overlay  group-hover/card:opacity-100"
        style={style}
      >
        <p className="absolute inset-x-0 text-xs h-full break-words whitespace-pre-wrap text-white font-mono font-bold transition duration-500">
          {randomString}
        </p>
      </motion.div>
    </div>
  );
}

const characters =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const generateRandomString = (length: number) => {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
\`\`\`

USAGE:
\`\`\`tsx
<EvervaultCard text="HOVER" className="h-64 w-64" />
\`\`\``;

  const particlePromptAndCode = `PROMPT:
"Create an interactive particle text effect using HTML5 Canvas. The text should break into individual particles when the user moves their mouse over it. Each particle should scatter away from the cursor and then slowly return to its original position. The text should be rendered with a gradient and the particles should maintain the original colors."

CODE:
\`\`\`tsx
import React, { useEffect, useRef, useState } from 'react';

interface Pointer {
  x?: number;
  y?: number;
}

interface Particle {
  ox: number; oy: number; cx: number; cy: number;
  or: number; cr: number; pv: number; ov: number;
  f: number; rgb: number[];
}

interface TextBox {
  str: string; x?: number; y?: number; w?: number; h?: number;
}

export interface ParticleTextEffectProps {
  text?: string;
  colors?: string[];
  className?: string;
  animationForce?: number;
  particleDensity?: number;
}

const ParticleTextEffect: React.FC<ParticleTextEffectProps> = ({
  text = 'HOVER!',
  colors = ['ffad70', 'f7d297', 'edb9a1', 'e697ac', 'b38dca'],
  className = '',
  animationForce = 80,
  particleDensity = 4,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const pointerRef = useRef<Pointer>({});
  const hasPointerRef = useRef<boolean>(false);
  const interactionRadiusRef = useRef<number>(100);

  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });

  // ... (rest of the component implementation)

  return (
    <canvas
      ref={canvasRef}
      className={\`w-full h-full \${className} cursor-none\`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerEnter={handlePointerEnter}
    />
  );
};

export { ParticleTextEffect };
\`\`\`

USAGE:
\`\`\`tsx
<ParticleTextEffect
  text="HOVER"
  colors={['ff6b6b', 'feca57', '48dbfb', '1dd1a1']}
  animationForce={60}
  particleDensity={3}
/>
\`\`\``;

  const robotPromptAndCode = `PROMPT:
"Create an interactive 3D robot component using Spline. The component should load a 3D scene with a robot character that users can interact with by clicking and dragging to rotate, and scrolling to zoom. Include proper loading states and error handling."

CODE:
\`\`\`tsx
'use client';

import { Suspense, lazy } from 'react';
const Spline = lazy(() => import('@splinetool/react-spline'));

interface InteractiveRobotSplineProps {
  scene: string;
  className?: string;
}

export function InteractiveRobotSpline({ scene, className }: InteractiveRobotSplineProps) {
  return (
    <Suspense
      fallback={
        <div className={\`w-full h-full flex items-center justify-center bg-gray-900 text-white \${className}\`}>
          <svg className="animate-spin h-5 w-5 text-white mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z"></path>
          </svg>
          <span>Loading 3D Robot...</span>
        </div>
      }
    >
      <Spline
        scene={scene}
        className={className} 
      />
    </Suspense>
  );
}
\`\`\`

DEPENDENCIES:
\`\`\`bash
npm install @splinetool/react-spline
\`\`\`

USAGE:
\`\`\`tsx
<InteractiveRobotSpline
  scene="https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode"
  className="w-full h-full"
/>
\`\`\``;

  return (
    <section id="components" className="py-20 bg-slate-800 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex items-center justify-center space-x-2 mb-4"
          >
            <Code2 className="w-8 h-8 text-cyan-400" />
            <Sparkles className="w-6 h-6 text-cyan-500" />
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-white mb-4"
          >
            Interactive Components
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto px-4"
          >
            Explore cutting-edge UI components built with modern technologies. 
            Each component showcases advanced interactions, animations, and design patterns.
          </motion.p>
        </div>

        {/* Component Grid - We'll populate this with components from 21st.dev */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
          {/* EvervaultCard Demo */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="bg-slate-700/50 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-slate-600/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-700 rounded-lg flex items-center justify-center">
                  <MousePointer className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Evervault Card</h3>
                  <p className="text-sm text-slate-300">Interactive Hover Effect</p>
                </div>
              </div>
              <motion.button
                onClick={() => copyToClipboard(evervaultPromptAndCode, 'evervault')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 bg-slate-600/50 hover:bg-slate-600/70 text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-all duration-200 border border-slate-500/30"
                title="Copy prompt and code"
              >
                {copiedStates.evervault ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-xs">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </motion.button>
            </div>
            <p className="text-slate-300 mb-6">
              A stunning card component with matrix-style hover effects. Move your cursor over the card to reveal the encrypted text animation.
            </p>
            <div className="relative h-64 bg-slate-800/80 rounded-lg overflow-hidden border border-slate-600/30">
              <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading...</div>}>
                <Icon className="absolute h-4 w-4 -top-2 -left-2 text-cyan-400 z-30" />
                <Icon className="absolute h-4 w-4 -bottom-2 -left-2 text-cyan-400 z-30" />
                <Icon className="absolute h-4 w-4 -top-2 -right-2 text-cyan-400 z-30" />
                <Icon className="absolute h-4 w-4 -bottom-2 -right-2 text-cyan-400 z-30" />
                <EvervaultCard text="IGANI" className="absolute inset-0 rounded-lg" />
              </Suspense>
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs text-slate-400 text-center bg-slate-800/80 backdrop-blur-sm rounded px-2 py-1 border border-slate-600/30">
                  Hover to reveal the matrix effect
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="bg-slate-700/50 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-slate-600/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Atom className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Particle Text</h3>
                  <p className="text-sm text-slate-300">Interactive Canvas Effect</p>
                </div>
              </div>
              <motion.button
                onClick={() => copyToClipboard(particlePromptAndCode, 'particle')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 bg-slate-600/50 hover:bg-slate-600/70 text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-all duration-200 border border-slate-500/30"
                title="Copy prompt and code"
              >
                {copiedStates.particle ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-xs">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </motion.button>
            </div>
            <p className="text-slate-300 mb-6">
              A stunning particle text effect that responds to mouse movement. 
              Text breaks into particles that scatter and reform dynamically.
            </p>
            <div className="relative h-64 bg-slate-800/80 rounded-lg overflow-hidden border border-slate-600/30">
              <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading...</div>}>
                <Icon className="absolute h-4 w-4 -top-2 -left-2 text-orange-400 z-30" />
                <Icon className="absolute h-4 w-4 -bottom-2 -left-2 text-orange-400 z-30" />
                <Icon className="absolute h-4 w-4 -top-2 -right-2 text-orange-400 z-30" />
                <Icon className="absolute h-4 w-4 -bottom-2 -right-2 text-orange-400 z-30" />
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  <ParticleTextEffect
                    text="IGANI"
                    colors={['ff6b6b', 'feca57', '48dbfb', '1dd1a1', 'ff9ff3', 'f368e0']}
                    className="absolute top-0 left-0"
                    animationForce={40}
                    particleDensity={4}
                  />
                </div>
              </Suspense>
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs text-slate-400 text-center bg-slate-800/80 backdrop-blur-sm rounded px-2 py-1 border border-slate-600/30">
                  Move your cursor over the text to see particles scatter
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="bg-slate-700/50 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-slate-600/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">3D Robot Whobee</h3>
                  <p className="text-sm text-slate-300">Interactive Spline 3D</p>
                </div>
              </div>
              <motion.button
                onClick={() => copyToClipboard(robotPromptAndCode, 'robot')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 bg-slate-600/50 hover:bg-slate-600/70 text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-all duration-200 border border-slate-500/30"
                title="Copy prompt and code"
              >
                {copiedStates.robot ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-xs">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </motion.button>
            </div>
            <p className="text-slate-300 mb-6">
              Meet Whobee, an interactive 3D robot built with Spline. 
              Click and drag to rotate, scroll to zoom, and explore this amazing 3D character.
            </p>
            <div className="relative h-64 bg-slate-800/80 rounded-lg overflow-hidden border border-slate-600/30">
              <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">Loading 3D...</div>}>
                <Icon className="absolute h-4 w-4 -top-2 -left-2 text-purple-400 z-30" />
                <Icon className="absolute h-4 w-4 -bottom-2 -left-2 text-purple-400 z-30" />
                <Icon className="absolute h-4 w-4 -top-2 -right-2 text-purple-400 z-30" />
                <Icon className="absolute h-4 w-4 -bottom-2 -right-2 text-purple-400 z-30" />
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  <InteractiveRobotSpline
                    scene="https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode"
                    className="w-full h-full"
                  />
                </div>
              </Suspense>
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs text-slate-400 text-center bg-slate-800/80 backdrop-blur-sm rounded px-2 py-1 border border-slate-600/30">
                  Click and drag to rotate • Scroll to zoom
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="bg-slate-700/50 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-slate-600/50 max-w-2xl mx-auto"
          >
            <h3 className="text-2xl font-bold text-white mb-4">Interactive Component Library</h3>
            <p className="text-slate-300 mb-6">
              Experience cutting-edge React components with advanced animations and interactions. 
              Each component is fully functional and ready for integration. Click the copy button on any component to get the prompt and code!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="bg-cyan-500/20 text-cyan-300 px-4 py-2 rounded-lg text-sm font-medium border border-cyan-400/30">
                🎭 Matrix Effects
              </div>
              <div className="bg-orange-500/20 text-orange-300 px-4 py-2 rounded-lg text-sm font-medium border border-orange-400/30">
                ⚛️ Particle Physics
              </div>
              <div className="bg-green-500/20 text-green-300 px-4 py-2 rounded-lg text-sm font-medium border border-green-400/30">
                🎨 Framer Motion
              </div>
              <div className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg text-sm font-medium border border-purple-400/30">
                🤖 3D Interactive
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}