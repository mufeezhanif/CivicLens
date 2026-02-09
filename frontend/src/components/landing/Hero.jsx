import React from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-linear-to-br from-background via-background to-secondary/10">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating circles */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-secondary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#16653410_1px,transparent_1px),linear-gradient(to_bottom,#16653410_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              Smart City Management Platform
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6 animate-slide-up">
              Centralized Platform for{' '}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-secondary">
                Urban Issue Management
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-foreground/70 mb-8 max-w-xl mx-auto lg:mx-0 animate-slide-up-delayed">
              CivicLens is a unified system where citizens report urban issues and city administrators 
              monitor, prioritize, and resolve them with full transparency.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up-delayed-2">
              <Link to="/citizen/report" className="group bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 flex items-center justify-center gap-2">
                Report an Issue
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link to="/login" className="group border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Admin Dashboard
              </Link>
            </div>

            {/* Key Capabilities */}
            <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-primary/10 animate-fade-in-delayed">
              <div>
                <div className="text-2xl md:text-3xl font-bold text-primary">5</div>
                <div className="text-sm text-foreground/60">Issue Categories</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-primary">AI</div>
                <div className="text-sm text-foreground/60">Classification</div>
              </div>
              <div>
                <div className="text-2xl md:text-3xl font-bold text-primary">Live</div>
                <div className="text-sm text-foreground/60">Heatmap Tracking</div>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Illustration */}
          <div className="relative animate-float">
            <div className="relative w-full max-w-lg mx-auto">
              {/* Main dashboard mockup */}
              <div className="bg-white rounded-2xl shadow-2xl shadow-primary/10 p-4 border border-primary/10">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-background rounded-lg h-6" />
                </div>
                
                {/* Map placeholder */}
                <div className="relative bg-linear-to-br from-secondary/20 to-primary/20 rounded-xl h-48 mb-4 overflow-hidden">
                  {/* Grid lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#16653420_1px,transparent_1px),linear-gradient(to_bottom,#16653420_1px,transparent_1px)] bg-[size:2rem_2rem]" />
                  
                  {/* Heatmap dots */}
                  <div className="absolute top-8 left-12 w-8 h-8 bg-red-500/50 rounded-full blur-md animate-pulse" />
                  <div className="absolute top-16 right-16 w-12 h-12 bg-orange-500/50 rounded-full blur-md animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute bottom-12 left-1/3 w-10 h-10 bg-yellow-500/50 rounded-full blur-md animate-pulse" style={{ animationDelay: '1s' }} />
                  <div className="absolute bottom-8 right-8 w-6 h-6 bg-secondary/50 rounded-full blur-md animate-pulse" style={{ animationDelay: '1.5s' }} />
                  
                  {/* Location pins */}
                  <svg className="absolute top-6 left-10 w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  </svg>
                  <svg className="absolute top-20 right-20 w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  </svg>
                  <svg className="absolute bottom-16 left-1/4 w-6 h-6 text-accent" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  </svg>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-red-600">23</div>
                    <div className="text-xs text-red-600/70">Urgent</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-amber-600">156</div>
                    <div className="text-xs text-amber-600/70">In Progress</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-600">892</div>
                    <div className="text-xs text-green-600/70">Resolved</div>
                  </div>
                </div>
              </div>

              {/* Floating notification cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-3 border border-primary/10 animate-bounce-slow">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">New Issue</div>
                    <div className="text-xs text-foreground/60">Road damage reported</div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-2 -left-4 bg-white rounded-xl shadow-lg p-3 border border-primary/10 animate-bounce-slow" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Resolved</div>
                    <div className="text-xs text-foreground/60">Water leak fixed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
