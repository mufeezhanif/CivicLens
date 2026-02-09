import React from 'react';

const Step = ({ number, title, description, icon, isLast }) => (
  <div className="relative flex gap-6">
    {/* Timeline line */}
    {!isLast && (
      <div className="absolute left-6 top-16 w-0.5 h-full bg-gradient-to-b from-primary to-secondary/30" />
    )}
    
    {/* Step number */}
    <div className="relative z-10 shrink-0 w-12 h-12 bg-linear-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/25">
      {number}
    </div>
    
    {/* Content */}
    <div className="flex-1 pb-12">
      <div className="bg-white rounded-2xl p-6 shadow-lg shadow-primary/5 border border-primary/10 hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-background rounded-xl flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
            <p className="text-foreground/70">{description}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const HowItWorks = () => {
  const steps = [
    {
      number: 1,
      title: 'Citizen Reports Issue',
      description: 'Citizens submit complaints via web, mobile, voice call, or WhatsApp. Location is auto-captured with GPS.',
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      number: 2,
      title: 'AI Processes & Classifies',
      description: 'NLP analyzes the complaint, categorizes it (Roads, Water, etc.), detects duplicates, and assigns severity scores.',
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      number: 3,
      title: 'Dashboard Visualization',
      description: 'Issues appear on live heatmap with clustering. Admins see priorities, trends, and area-wise analysis.',
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      number: 4,
      title: 'Track Resolution',
      description: 'Follow status from "Reported → In Progress → Resolved" with blockchain-verified tracking for transparency.',
      icon: (
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-gradient-to-b from-background to-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Illustration */}
          <div className="relative order-2 lg:order-1">
            <div className="relative bg-linear-to-br from-primary/5 to-secondary/5 rounded-3xl p-8">
              {/* Workflow illustration */}
              <svg viewBox="0 0 400 400" className="w-full h-auto">
                {/* Background circles */}
                <circle cx="200" cy="200" r="180" fill="none" stroke="#16653420" strokeWidth="2" strokeDasharray="10 10" className="animate-spin-slow" style={{ transformOrigin: 'center' }} />
                <circle cx="200" cy="200" r="140" fill="none" stroke="#22C55E20" strokeWidth="2" strokeDasharray="10 10" className="animate-spin-slow-reverse" style={{ transformOrigin: 'center' }} />
                
                {/* Center hub */}
                <circle cx="200" cy="200" r="60" fill="url(#hubGradient)" />
                <text x="200" y="195" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">CivicLens</text>
                <text x="200" y="215" textAnchor="middle" fill="white" fontSize="10" opacity="0.8">Hub</text>
                
                {/* Connection nodes */}
                {/* Citizen */}
                <g className="animate-pulse" style={{ animationDelay: '0s' }}>
                  <circle cx="200" cy="40" r="30" fill="#166534" />
                  <path d="M200 25 a1 1 0 0 1 0 10 a1 1 0 0 1 0 -10 M190 45 h20 M200 35 v15" stroke="white" strokeWidth="2" fill="none" />
                  <text x="200" y="85" textAnchor="middle" fill="#166534" fontSize="11" fontWeight="600">Citizens</text>
                </g>
                
                {/* AI */}
                <g className="animate-pulse" style={{ animationDelay: '0.5s' }}>
                  <circle cx="360" cy="200" r="30" fill="#22C55E" />
                  <path d="M350 190 h20 M350 200 h20 M350 210 h20" stroke="white" strokeWidth="2" fill="none" />
                  <text x="360" y="245" textAnchor="middle" fill="#22C55E" fontSize="11" fontWeight="600">AI Engine</text>
                </g>
                
                {/* Dashboard */}
                <g className="animate-pulse" style={{ animationDelay: '1s' }}>
                  <circle cx="200" cy="360" r="30" fill="#166534" />
                  <rect x="185" y="345" width="30" height="20" rx="2" stroke="white" strokeWidth="2" fill="none" />
                  <line x1="195" y1="365" x2="205" y2="365" stroke="white" strokeWidth="2" />
                  <text x="200" y="320" textAnchor="middle" fill="#166534" fontSize="11" fontWeight="600">Dashboard</text>
                </g>
                
                {/* Resolution */}
                <g className="animate-pulse" style={{ animationDelay: '1.5s' }}>
                  <circle cx="40" cy="200" r="30" fill="#EAB308" />
                  <path d="M30 200 l8 8 l15 -15" stroke="white" strokeWidth="3" fill="none" />
                  <text x="40" y="245" textAnchor="middle" fill="#EAB308" fontSize="11" fontWeight="600">Resolution</text>
                </g>
                
                {/* Connection lines */}
                <path d="M200 70 L200 140" stroke="#16653440" strokeWidth="2" strokeDasharray="5 5">
                  <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
                </path>
                <path d="M260 200 L330 200" stroke="#22C55E40" strokeWidth="2" strokeDasharray="5 5">
                  <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
                </path>
                <path d="M200 260 L200 330" stroke="#16653440" strokeWidth="2" strokeDasharray="5 5">
                  <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
                </path>
                <path d="M140 200 L70 200" stroke="#EAB30840" strokeWidth="2" strokeDasharray="5 5">
                  <animate attributeName="stroke-dashoffset" from="10" to="0" dur="1s" repeatCount="indefinite" />
                </path>
                
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="hubGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#166534" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Right - Steps */}
          <div className="order-1 lg:order-2">
            <span className="inline-block bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              The{' '}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-secondary">
                Issue Resolution Workflow
              </span>
            </h2>
            <p className="text-lg text-foreground/70 mb-10">
              Here's how a complaint moves through the system from submission 
              to resolution.
            </p>

            {/* Steps */}
            <div className="space-y-2">
              {steps.map((step, index) => (
                <Step
                  key={index}
                  number={step.number}
                  title={step.title}
                  description={step.description}
                  icon={step.icon}
                  isLast={index === steps.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
