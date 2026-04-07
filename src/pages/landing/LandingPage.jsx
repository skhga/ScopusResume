import React from 'react';
import { Link } from 'react-router-dom';
import { Target, Sparkles, Search, BarChart3, Download, Globe, ArrowRight } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

const features = [
  { icon: Target, title: 'ATS Optimization', desc: 'Get past applicant tracking systems with keyword-optimized resumes.' },
  { icon: Sparkles, title: 'AI Rewriting', desc: 'Transform plain descriptions into powerful, quantified achievement statements.' },
  { icon: Search, title: 'Job Match Analysis', desc: 'Analyze any job description and tailor your resume to match.' },
  { icon: BarChart3, title: 'Real-Time Scoring', desc: 'Live ATS score, readability, and impact scores as you edit.' },
  { icon: Download, title: 'Multi-Format Export', desc: 'Download as PDF, DOCX, or plain text ready for any portal.' },
  { icon: Globe, title: 'Multilingual Support', desc: 'Translate your resume into French, Spanish, or German.' },
];

const steps = [
  { num: '1', title: 'Input Your Info', desc: 'Fill in your experience, education, and skills through our guided builder.' },
  { num: '2', title: 'AI Optimizes', desc: 'Our AI rewrites bullet points, injects keywords, and scores your resume.' },
  { num: '3', title: 'Download & Apply', desc: 'Export your ATS-optimized resume and start landing interviews.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">Build ATS-Optimized Resumes <span className="text-brand-600">with AI</span></h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">Stop getting filtered out. ScopusResume helps fresh graduates and job seekers craft resumes that pass ATS systems and impress recruiters.</p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/signup" className="btn-primary text-base px-8 py-3 inline-flex items-center justify-center">Get Started Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
              <a href="#how-it-works" className="btn-secondary text-base px-8 py-3 inline-flex items-center justify-center">See How It Works</a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Everything You Need to Land Interviews</h2>
            <p className="mt-4 text-lg text-gray-600">Powerful AI tools designed for job seekers.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-xl border border-gray-200 hover:shadow-md transition">
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4"><Icon className="h-6 w-6 text-brand-600" /></div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 text-base">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600">Three simple steps to your best resume.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="text-center p-8">
                <div className="w-14 h-14 bg-brand-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">{num}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">What Job Seekers Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Sarah K.', role: 'Software Engineer', text: 'I went from 0 callbacks to 5 interviews in two weeks after optimizing my resume with ScopusResume.' },
              { name: 'James L.', role: 'Marketing Graduate', text: 'The AI rewriting turned my basic bullet points into impressive achievement statements. Game changer!' },
              { name: 'Priya M.', role: 'International Student', text: 'The translation feature helped me apply to jobs in France. I landed my first role abroad!' },
            ].map(t => (
              <div key={t.name} className="p-6 bg-gray-50 rounded-xl">
                <div className="flex items-center mb-3">{[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-lg">&#9733;</span>)}</div>
                <p className="text-gray-700 mb-4 italic">"{t.text}"</p>
                <p className="font-semibold text-gray-900">{t.name}</p>
                <p className="text-sm text-gray-500">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-brand-600">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Land More Interviews?</h2>
          <p className="text-brand-100 text-lg mb-8">Join thousands of job seekers building better resumes with AI.</p>
          <Link to="/signup" className="inline-flex items-center bg-white text-brand-700 font-semibold px-8 py-3 rounded-lg hover:bg-brand-50 transition">Start Building for Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
