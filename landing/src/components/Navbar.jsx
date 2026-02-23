import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Navbar = () => {
    const navRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                start: 'top -50',
                end: 99999,
                toggleClass: {
                    className: 'scrolled',
                    targets: navRef.current
                }
            });
        });
        return () => ctx.revert();
    }, []);

    return (
        <div className="fixed top-0 left-0 right-0 z-40 flex justify-center w-full pointer-events-none p-4">
            <nav
                ref={navRef}
                className="pointer-events-auto flex items-center justify-between px-6 py-4 border border-transparent transition-all duration-300 w-full max-w-[1400px] text-foreground bg-transparent [&.scrolled]:bg-background/90 [&.scrolled]:backdrop-blur-md [&.scrolled]:border-borderline [&.scrolled]:shadow-xl [&.scrolled]:rounded-xl"
            >
                <div className="font-mono font-bold text-lg tracking-tight flex items-center gap-2">
                    <div className="w-4 h-4 bg-accent rounded-sm"></div>
                    [MCP_LAUNCHER]
                </div>
                <div className="hidden md:flex items-center gap-8 font-mono text-sm text-foreground/70">
                    <a href="#features" className="hover:text-accent transition-colors">./features</a>
                    <a href="#philosophy" className="hover:text-accent transition-colors">./pipeline</a>
                    <a href="#protocol" className="hover:text-accent transition-colors">./docs</a>
                </div>
                <button className="relative overflow-hidden border border-accent bg-accent/10 px-6 py-2 font-mono font-bold text-sm text-accent transition-all hover:bg-accent hover:text-background duration-200">
                    &gt;_ deploy
                </button>
            </nav>
        </div>
    );
};

export default Navbar;
