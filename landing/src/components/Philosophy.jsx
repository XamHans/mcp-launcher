import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Philosophy = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const revealItems = gsap.utils.toArray('.reveal-line');

            revealItems.forEach((elem) => {
                gsap.from(elem, {
                    y: 40,
                    opacity: 0,
                    duration: 0.8,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: elem,
                        start: 'top 85%',
                    }
                });
            });

        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            id="philosophy"
            ref={containerRef}
            className="relative w-full py-32 md:py-48 bg-[#050505] border-y border-borderline overflow-hidden mx-auto my-12"
        >
            {/* Grid Background overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 font-mono">
                <div className="mb-20">
                    <p className="reveal-line text-lg md:text-xl text-foreground/40 leading-relaxed">
                        &gt; `Legacy deployments are blocked by:`
                    </p>
                    <p className="reveal-line text-lg md:text-xl text-foreground/70 leading-relaxed mt-2 p-4 bg-red-900/10 border-l-2 border-red-500 rounded text-red-400">
                        ERR: Manual provisioning, opaque configs, isolated debug loops.
                    </p>
                </div>

                <div className="mt-12">
                    <p className="reveal-line font-bold text-xl md:text-3xl text-foreground mb-4">
                        &gt; `System overrides with:`
                    </p>
                    <div className="reveal-line font-sans font-bold text-4xl md:text-6xl lg:text-7xl leading-[1.1] text-accent mt-6">
                        <span className="text-foreground border border-borderline bg-background px-4 rounded-md">Automated</span>
                        <br /> Pipeline Orchestration.
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Philosophy;
