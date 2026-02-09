/**
 * About Page
 * Information about CivicLens platform
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar, Footer } from '../components/landing';

// Icons
const Icons = {
  Target: () => (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  MultiChannel: () => (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  Tracking: () => (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Map: () => (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  Dashboard: () => (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  AI: () => (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Heart: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  ),
};

const AboutPage = () => {
  const features = [
    { icon: Icons.MultiChannel, title: 'Multi-Channel Reporting', description: 'Report issues via web, WhatsApp, or voice notes—making it accessible to everyone regardless of technical expertise.', color: 'primary' },
    { icon: Icons.Tracking, title: 'Real-Time Tracking', description: 'Monitor the status of your complaints from submission to resolution with transparent updates at every step.', color: 'secondary' },
    { icon: Icons.Map, title: 'Geographic Insights', description: 'Visualize community issues on interactive maps with heatmaps showing problem hotspots in your area.', color: 'blue' },
    { icon: Icons.Dashboard, title: 'Efficient Management', description: 'Government officials can prioritize, assign, and manage complaints efficiently with our dashboard tools.', color: 'purple' },
  ];

  const values = [
    { icon: Icons.Users, title: 'Community First', description: 'Every feature is designed with citizens in mind' },
    { icon: Icons.Shield, title: 'Transparency', description: 'Open tracking and accountability at every level' },
    { icon: Icons.Heart, title: 'Accessibility', description: 'Multiple channels ensure no one is left behind' },
  ];

  const stats = [
    { value: '50K+', label: 'Issues Reported' },
    { value: '94%', label: 'Resolution Rate' },
    { value: '25+', label: 'Townships' },
    { value: '4.8', label: 'User Rating' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-secondary/5"></div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Icons.Target />About CivicLens
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Empowering Citizens to <br className="hidden md:block" />
                <span className="text-primary">Create Positive Change</span>
              </h1>
              <p className="text-xl text-foreground/60 max-w-3xl mx-auto leading-relaxed">
                CivicLens bridges the gap between communities and local government, making civic participation easier and more effective than ever.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-12">
              {stats.map((stat, i) => (
                <div key={i} className="bg-white rounded-2xl border border-foreground/10 p-6 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <p className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</p>
                  <p className="text-sm text-foreground/60 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 bg-white border-y border-foreground/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Our Mission</h2>
                <div className="space-y-4 text-foreground/70 leading-relaxed">
                  <p>
                    CivicLens is a citizen-centric platform designed to bridge the gap between 
                    communities and local government. We believe that every citizen should have 
                    a voice in shaping their community and easy access to report civic issues.
                  </p>
                  <p>
                    Our platform empowers citizens to report issues, track their resolution, 
                    and engage with local officials—all through an intuitive, accessible interface 
                    that works for everyone.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {values.map((value, i) => (
                  <div key={i} className="flex items-start gap-4 bg-linear-to-r from-background to-white rounded-xl border border-foreground/10 p-5 hover:shadow-lg transition-all">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                      <value.icon />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{value.title}</h3>
                      <p className="text-sm text-foreground/60">{value.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">What We Offer</h2>
              <p className="text-foreground/60 max-w-2xl mx-auto">
                Comprehensive tools for citizens and government to work together efficiently
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, i) => (
                <div key={i} className="bg-white rounded-2xl border border-foreground/10 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${
                    feature.color === 'primary' ? 'bg-primary/10 text-primary' :
                    feature.color === 'secondary' ? 'bg-secondary/10 text-secondary' :
                    feature.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                  }`}>
                    <feature.icon />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-foreground/60 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Approach Section */}
        <section className="py-16 bg-linear-to-br from-primary/5 to-secondary/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl border border-foreground/10 p-8 md:p-12 shadow-sm">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div className="order-2 lg:order-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Icons.AI />
                    </div>
                    <span className="text-sm font-semibold text-primary">AI-Powered</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Our Approach</h2>
                  <div className="space-y-4 text-foreground/70 leading-relaxed">
                    <p>
                      CivicLens combines modern technology with a deep understanding of civic 
                      engagement. By leveraging AI for complaint categorization, geospatial 
                      analysis for issue tracking, and multi-channel communication for 
                      accessibility, we make civic participation easier than ever.
                    </p>
                    <p>
                      We're committed to transparency, accountability, and continuous improvement 
                      based on user feedback and community needs.
                    </p>
                  </div>
                </div>
                <div className="order-1 lg:order-2 grid grid-cols-2 gap-4">
                  <div className="bg-linear-to-br from-primary/10 to-primary/5 rounded-2xl p-5 text-center">
                    <p className="text-2xl font-bold text-primary mb-1">AI</p>
                    <p className="text-xs text-foreground/60">Auto Categorization</p>
                  </div>
                  <div className="bg-linear-to-br from-secondary/10 to-secondary/5 rounded-2xl p-5 text-center">
                    <p className="text-2xl font-bold text-secondary mb-1">GIS</p>
                    <p className="text-xs text-foreground/60">Geospatial Analysis</p>
                  </div>
                  <div className="bg-linear-to-br from-blue-100 to-blue-50 rounded-2xl p-5 text-center">
                    <p className="text-2xl font-bold text-blue-600 mb-1">24/7</p>
                    <p className="text-xs text-foreground/60">WhatsApp Support</p>
                  </div>
                  <div className="bg-linear-to-br from-purple-100 to-purple-50 rounded-2xl p-5 text-center">
                    <p className="text-2xl font-bold text-purple-600 mb-1">Real</p>
                    <p className="text-xs text-foreground/60">Time Updates</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-linear-to-br from-primary to-primary/80 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Make a Difference?</h2>
                <p className="text-white/80 mb-8 text-lg max-w-2xl mx-auto">
                  Join thousands of citizens working together to improve their communities. Your voice matters.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Link to="/register" className="px-8 py-3.5 bg-white text-primary rounded-xl hover:bg-white/90 transition-all font-semibold inline-flex items-center gap-2 shadow-lg hover:shadow-xl">
                    Get Started<Icons.ArrowRight />
                  </Link>
                  <Link to="/map" className="px-8 py-3.5 border-2 border-white/30 text-white rounded-xl hover:bg-white/10 transition-all font-semibold inline-flex items-center gap-2">
                    <Icons.Map />View Issues Map
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
