/**
 * Contact Page
 * Contact form and information
 */

import React, { useState } from 'react';
import { Navbar, Footer } from '../components/landing';
import { Button, Input, Textarea, Alert } from '../components/ui';

// Icons
const Icons = {
  Mail: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Location: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  WhatsApp: () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
  Send: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  Question: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
};

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitStatus({ type: 'success', message: 'Your message has been sent successfully!' });
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const contactInfo = [
    { icon: Icons.Mail, title: 'Email', value: 'support@civiclens.org', link: 'mailto:support@civiclens.org', color: 'primary' },
    { icon: Icons.WhatsApp, title: 'WhatsApp', value: '+92 XXX XXXXXXX', subtitle: 'Report issues directly', color: 'secondary' },
    { icon: Icons.Clock, title: 'Office Hours', value: 'Mon-Fri: 9AM - 5PM', subtitle: 'Sat: 10AM - 2PM', color: 'amber' },
    { icon: Icons.Location, title: 'Address', value: 'City Council Office', subtitle: 'Main Street, City Center', color: 'blue' },
  ];

  const faqs = [
    { q: 'How do I report an issue?', a: 'You can report via our website, WhatsApp, or voice notes—making it accessible to everyone.' },
    { q: 'How long does resolution take?', a: 'Resolution time varies by issue type, typically 3-14 days depending on complexity.' },
    { q: 'Can I track my complaint?', a: 'Yes! Login to your dashboard to track all your reports in real-time.' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Icons.Mail />Get in Touch
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Contact <span className="text-primary">Us</span>
            </h1>
            <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
              Have questions or need assistance? We'd love to hear from you. Our team is here to help.
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {contactInfo.map((item, i) => (
              <div key={i} className="bg-white rounded-2xl border border-foreground/10 p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  item.color === 'primary' ? 'bg-primary/10 text-primary' : 
                  item.color === 'secondary' ? 'bg-secondary/10 text-secondary' : 
                  item.color === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                } group-hover:scale-110 transition-transform`}>
                  <item.icon />
                </div>
                <h3 className="text-sm font-semibold text-foreground/50 mb-1">{item.title}</h3>
                {item.link ? (
                  <a href={item.link} className="text-foreground font-semibold hover:text-primary transition-colors">{item.value}</a>
                ) : (
                  <p className="text-foreground font-semibold">{item.value}</p>
                )}
                {item.subtitle && <p className="text-sm text-foreground/50 mt-1">{item.subtitle}</p>}
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-foreground/10 overflow-hidden shadow-sm">
                <div className="bg-linear-to-r from-primary/5 to-secondary/5 px-6 py-5 border-b border-foreground/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary"><Icons.Send /></div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Send us a Message</h2>
                      <p className="text-sm text-foreground/60">We'll get back to you within 24 hours</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {submitStatus && (
                    <div className="mb-6 rounded-xl border-2 border-secondary/30 bg-secondary/10 px-4 py-3 flex items-center gap-3">
                      <div className="p-1.5 rounded-full bg-secondary/20 text-secondary"><Icons.Check /></div>
                      <p className="text-sm font-medium text-foreground">{submitStatus.message}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Your Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe"
                          className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Email Address</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com"
                          className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Subject</label>
                      <input type="text" name="subject" value={formData.subject} onChange={handleChange} required placeholder="How can we help?"
                        className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all" />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Message</label>
                      <textarea name="message" value={formData.message} onChange={handleChange} required rows={5} placeholder="Tell us more about your inquiry..."
                        className="w-full rounded-xl border-2 border-foreground/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all resize-none" />
                    </div>

                    <button type="submit" className="w-full px-8 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm hover:shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2">
                      <Icons.Send />Send Message
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-foreground/10 overflow-hidden shadow-sm sticky top-24">
                <div className="bg-linear-to-r from-amber-50 to-primary/5 px-6 py-5 border-b border-foreground/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600"><Icons.Question /></div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Quick Help</h2>
                      <p className="text-sm text-foreground/60">Frequently asked questions</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-5 space-y-4">
                  {faqs.map((faq, i) => (
                    <div key={i} className="rounded-xl border border-foreground/10 bg-linear-to-r from-background to-white p-4 hover:shadow-md transition-all">
                      <p className="font-semibold text-foreground text-sm mb-2">{faq.q}</p>
                      <p className="text-foreground/60 text-sm">{faq.a}</p>
                    </div>
                  ))}
                </div>

                {/* WhatsApp CTA */}
                <div className="m-5 mt-0 rounded-xl bg-linear-to-br from-secondary/10 to-secondary/5 border border-secondary/20 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-secondary/20 text-secondary"><Icons.WhatsApp /></div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">Quick Report via WhatsApp</p>
                      <p className="text-xs text-foreground/50">Fastest way to report issues</p>
                    </div>
                  </div>
                  <a href="https://wa.me/92XXXXXXXXX" target="_blank" rel="noopener noreferrer" 
                    className="block w-full px-4 py-2.5 rounded-lg bg-secondary text-white font-semibold text-sm text-center hover:bg-secondary/90 transition-all">
                    Start Chat
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
