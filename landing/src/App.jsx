import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Philosophy from './components/Philosophy';
import Protocol from './components/Protocol';
import Footer from './components/Footer';

function App() {
  return (
    <div className="w-full min-h-screen bg-background text-foreground font-sans overflow-x-hidden selection:bg-accent selection:text-white">
      <Navbar />
      <Hero />
      <Features />
      <Philosophy />
      <Protocol />
      <Footer />
    </div>
  );
}

export default App;
