import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Palette, Code, Rocket, Headphones } from 'lucide-react';

const processSteps = [
  {
    icon: FileText,
    title: 'Brief',
    description: 'We discuss your goals, target audience, and project requirements to create a clear roadmap.',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Palette,
    title: 'Mock',
    description: 'We design wireframes and mockups, getting your feedback before moving to development.',
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: Code,
    title: 'Build',
    description: 'Our developers bring the design to life with clean, fast, and responsive code.',
    color: 'from-green-500 to-green-600'
  },
  {
    icon: Rocket,
    title: 'Launch',
    description: 'We deploy your site and ensure everything works perfectly across all devices.',
    color: 'from-orange-500 to-orange-600'
  }
];

export function Process() {
  return (
    <section className="py-20 bg-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Our Process
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            From concept to launch, we follow a proven 4-step process that ensures your project succeeds
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {processSteps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              viewport={{ once: true, margin: "-100px" }}
              className="text-center group"
            >
              <div className="relative mb-6">
                <div className={`
                  w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${step.color} 
                  flex items-center justify-center text-white shadow-lg
                  group-hover:scale-110 transition-transform duration-300
                `}>
                  <step.icon className="w-8 h-8" />
                </div>
                {index < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-br from-slate-600 to-transparent transform translate-x-4" />
                )}
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-3">
                {step.title}
              </h3>
              
              <p className="text-slate-300 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* 30-day support highlight */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center space-x-3 bg-slate-700/50 backdrop-blur-sm rounded-2xl px-8 py-6 border border-slate-600/30">
            <Headphones className="w-8 h-8 text-blue-400" />
            <div>
              <h3 className="text-xl font-semibold text-white">30-Day Support</h3>
              <p className="text-slate-300">We're here to help after launch with any questions or adjustments</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
