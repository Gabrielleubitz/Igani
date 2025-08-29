import React from 'react';
import { motion } from 'framer-motion';
import { Star, TrendingUp, Users, Zap } from 'lucide-react';

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CEO, TechFlow",
    content: "Igani transformed our outdated site into a modern, fast platform. Our conversion rate increased by 40% in the first month.",
    avatar: "SC"
  },
  {
    name: "Marcus Rodriguez",
    role: "Founder, GreenEvents",
    content: "The team delivered exactly what we needed on time and budget. The live preview feature saved us countless revision rounds.",
    avatar: "MR"
  },
  {
    name: "Dr. Emily Watson",
    role: "Director, HealthConnect",
    content: "Professional, responsive, and results-driven. Our nonprofit now has a website that truly represents our mission.",
    avatar: "EW"
  }
];

const clientLogos = [
  "TechFlow", "GreenEvents", "HealthConnect", "DataViz", "EcoShop", "LearnHub"
];

const metrics = [
  {
    icon: Zap,
    value: "2.3s",
    label: "Avg. Load Time",
    color: "text-green-400"
  },
  {
    icon: TrendingUp,
    value: "40%",
    label: "Conversion Lift",
    color: "text-blue-400"
  },
  {
    icon: Users,
    value: "15k+",
    label: "Monthly Visitors",
    color: "text-purple-400"
  }
];

export function Proof() {
  return (
    <section className="py-20 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Testimonials */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            What Our Clients Say
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Real results from real projects. Here's what our clients have to say about working with Igani.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              viewport={{ once: true, margin: "-100px" }}
              className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-300"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="text-white font-semibold">{testimonial.name}</h4>
                  <p className="text-slate-400 text-sm">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed mb-4">
                "{testimonial.content}"
              </p>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Client Logos */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h3 className="text-2xl font-semibold text-white mb-8">
            Trusted by Industry Leaders
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {clientLogos.map((logo, index) => (
              <motion.div
                key={logo}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center justify-center"
              >
                <div className="text-slate-400 hover:text-white transition-colors duration-300 font-medium text-lg">
                  {logo}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h3 className="text-2xl font-semibold text-white mb-8">
            Measurable Results
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className={`w-16 h-16 mx-auto rounded-2xl bg-slate-800/50 border border-slate-700/30 flex items-center justify-center mb-4`}>
                  <metric.icon className={`w-8 h-8 ${metric.color}`} />
                </div>
                <div className={`text-4xl font-bold ${metric.color} mb-2`}>
                  {metric.value}
                </div>
                <p className="text-slate-300 font-medium">
                  {metric.label}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
