import Mailjet from 'node-mailjet';

// Initialize Mailjet client
const mailjet = new Mailjet({
  apiKey: import.meta.env.VITE_MAILJET_API_KEY || '',
  apiSecret: import.meta.env.VITE_MAILJET_API_SECRET || ''
});

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  projectType: string;
  message: string;
}

// Component prompts and code for the thank you email
const componentPrompts = {
  evervault: `PROMPT:
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
\`\`\``,

  particle: `PROMPT:
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
\`\`\``,

  robot: `PROMPT:
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
\`\`\``
};

export async function sendThankYouEmail(formData: ContactFormData) {
  try {
    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: 'noreply@igani.com',
              Name: 'Igani Team'
            },
            To: [
              {
                Email: formData.email,
                Name: `${formData.firstName} ${formData.lastName}`
              }
            ],
            Subject: 'Thank you for contacting Igani! 🚀',
            HTMLPart: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Thank You - Igani</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
                  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                  .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center; }
                  .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
                  .header p { margin: 10px 0 0; opacity: 0.9; font-size: 16px; }
                  .content { padding: 40px 30px; }
                  .greeting { font-size: 18px; margin-bottom: 20px; color: #1e293b; }
                  .message-box { background: #f1f5f9; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 6px; }
                  .component-section { margin: 30px 0; }
                  .component-title { font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 15px; display: flex; align-items: center; }
                  .component-title::before { content: '🎨'; margin-right: 8px; }
                  .code-block { background: #1e293b; color: #e2e8f0; padding: 20px; border-radius: 8px; font-family: 'Monaco', 'Menlo', monospace; font-size: 12px; line-height: 1.5; overflow-x: auto; margin: 15px 0; }
                  .footer { background: #1e293b; color: white; padding: 30px; text-align: center; }
                  .footer a { color: #0ea5e9; text-decoration: none; }
                  .cta-button { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Thank You, ${formData.firstName}! 🎉</h1>
                    <p>We've received your message and will get back to you soon</p>
                  </div>
                  
                  <div class="content">
                    <div class="greeting">
                      Hi ${formData.firstName},
                    </div>
                    
                    <p>Thank you for reaching out to us about your <strong>${formData.projectType}</strong> project! We're excited to learn more about your vision and help bring it to life.</p>
                    
                    <div class="message-box">
                      <strong>Your Message:</strong><br>
                      "${formData.message}"
                    </div>
                    
                    <p>Our team will review your request and get back to you within 24 hours. In the meantime, we thought you might enjoy the interactive component code from our website!</p>
                    
                    <div class="component-section">
                      <div class="component-title">Interactive Components - Prompts & Code</div>
                      <p>Here are the prompts and code for the interactive components you saw on our website:</p>
                      
                      <h3>🔮 Evervault Card Component</h3>
                      <div class="code-block">${componentPrompts.evervault.replace(/\n/g, '<br>').replace(/`/g, '&#96;')}</div>
                      
                      <h3>⚛️ Particle Text Effect</h3>
                      <div class="code-block">${componentPrompts.particle.replace(/\n/g, '<br>').replace(/`/g, '&#96;')}</div>
                      
                      <h3>🤖 3D Interactive Robot</h3>
                      <div class="code-block">${componentPrompts.robot.replace(/\n/g, '<br>').replace(/`/g, '&#96;')}</div>
                    </div>
                    
                    <p>Feel free to use these components in your own projects! If you need help implementing them or want to discuss custom solutions, just reply to this email.</p>
                    
                    <a href="https://igani-website-showca-foq3.bolt.host" class="cta-button">Visit Our Website</a>
                  </div>
                  
                  <div class="footer">
                    <p><strong>Igani</strong> - Crafting Digital Experiences</p>
                    <p>Questions? Reply to this email or visit our <a href="https://igani-website-showca-foq3.bolt.host">website</a></p>
                  </div>
                </div>
              </body>
              </html>
            `,
            TextPart: `
Hi ${formData.firstName},

Thank you for contacting Igani about your ${formData.projectType} project!

Your message: "${formData.message}"

We'll get back to you within 24 hours. In the meantime, here are the interactive component codes from our website:

EVERVAULT CARD COMPONENT:
${componentPrompts.evervault}

PARTICLE TEXT EFFECT:
${componentPrompts.particle}

3D INTERACTIVE ROBOT:
${componentPrompts.robot}

Best regards,
The Igani Team

Visit our website: https://igani-website-showca-foq3.bolt.host
            `
          }
        ]
      });

    const result = await request;
    return { success: true, data: result.body };
  } catch (error) {
    console.error('Error sending thank you email:', error);
    return { success: false, error };
  }
}

export async function sendNotificationEmail(formData: ContactFormData) {
  try {
    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: 'noreply@igani.com',
              Name: 'Igani Website'
            },
            To: [
              {
                Email: 'gabrielleubitz@gmail.com',
                Name: 'Gabriel'
              }
            ],
            Subject: `🔔 New Contact Form Submission - ${formData.projectType}`,
            HTMLPart: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>New Contact Form Submission</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
                  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                  .header { background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; }
                  .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
                  .content { padding: 30px; }
                  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
                  .info-item { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #0ea5e9; }
                  .info-label { font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                  .info-value { color: #1e293b; font-size: 16px; margin-top: 5px; }
                  .message-section { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
                  .message-title { font-weight: 600; color: #92400e; margin-bottom: 10px; }
                  .message-text { color: #451a03; line-height: 1.6; }
                  .timestamp { color: #64748b; font-size: 14px; text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
                  .cta-button { display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🔔 New Contact Form Submission</h1>
                  </div>
                  
                  <div class="content">
                    <p>You have received a new contact form submission on your Igani website:</p>
                    
                    <div class="info-grid">
                      <div class="info-item">
                        <div class="info-label">Name</div>
                        <div class="info-value">${formData.firstName} ${formData.lastName}</div>
                      </div>
                      <div class="info-item">
                        <div class="info-label">Email</div>
                        <div class="info-value">${formData.email}</div>
                      </div>
                    </div>
                    
                    <div class="info-item" style="margin: 20px 0;">
                      <div class="info-label">Project Type</div>
                      <div class="info-value">${formData.projectType}</div>
                    </div>
                    
                    <div class="message-section">
                      <div class="message-title">📝 Message:</div>
                      <div class="message-text">${formData.message}</div>
                    </div>
                    
                    <p>A thank you email with interactive component codes has been automatically sent to the client.</p>
                    
                    <a href="mailto:${formData.email}?subject=Re: Your inquiry about ${formData.projectType}" class="cta-button">Reply to Client</a>
                    
                    <div class="timestamp">
                      Received: ${new Date().toLocaleString()}
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `,
            TextPart: `
New Contact Form Submission

Name: ${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Project Type: ${formData.projectType}

Message:
${formData.message}

Received: ${new Date().toLocaleString()}

A thank you email with interactive component codes has been sent to the client.
            `
          }
        ]
      });

    const result = await request;
    return { success: true, data: result.body };
  } catch (error) {
    console.error('Error sending notification email:', error);
    return { success: false, error };
  }
}