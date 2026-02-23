import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Code2, Server, TerminalSquare } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const steps = [
    {
        id: '01',
        title: 'Code Analysis',
        desc: 'Deep AST parsing identifies dependencies and required runtime contexts automatically.',
        Icon: Code2,
    },
    {
        id: '02',
        title: 'Containerize',
        desc: 'Synthesizes immutable Docker images and deployment manifests out-of-the-box.',
        Icon: Server,
    },
    {
        id: '03',
        title: 'Expose Node',
        desc: 'Binds ports, injects live telemetry streams, and mounts testing client natively.',
        Icon: TerminalSquare,
    }
];

const Protocol = () => {
    const sectionRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const cards = gsap.utils.toArray('.protocol-card');

            ScrollTrigger.create({
                trigger: sectionRef.current,
                start: "top top",
                end: `+=${cards.length * 100}%`,
                pin: true,
                scrub: 1,
                animation: gsap.timeline()
                    // Card 1 to Card 2
                    .to(cards[0], { scale: 0.95, y: -40, opacity: 0.3, filter: 'grayscale(1)', duration: 1 })
                    .fromTo(cards[1], { y: '100%', opacity: 0 }, { y: '0%', opacity: 1, duration: 1 }, "<")
                    // Card 2 to Card 3
                    .to(cards[1], { scale: 0.95, y: -40, opacity: 0.3, filter: 'grayscale(1)', duration: 1 })
                    .to(cards[0], { scale: 0.9, y: -80, opacity: 0.1, duration: 1 }, "<")
                    .fromTo(cards[2], { y: '100%', opacity: 0 }, { y: '0%', opacity: 1, duration: 1 }, "<")
            });

        }, sectionRef);
        return () => ctx.revert();
    }, []);

    return (
        <section id="protocol" ref={sectionRef} className="relative h-screen w-full bg-background overflow-hidden flex items-center justify-center border-b border-borderline">
            <div className="absolute inset-0 max-w-6xl mx-auto px-6 flex items-center justify-center pointer-events-none">

                {steps.map((step, index) => {
                    const { id, title, desc, Icon } = step;

                    return (
                        <div
                            key={id}
                            className={`protocol-card absolute w-full max-w-4xl h-[60vh] bg-card border border-borderline rounded-lg flex flex-col md:flex-row overflow-hidden pointer-events-auto ${index > 0 ? 'opacity-0 translate-y-full' : ''}`}
                            style={{ zIndex: steps.length - index, boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}
                        >
                            {/* Graphic Side */}
                            <div className="w-full md:w-1/2 bg-[#000000] border-r border-borderline flex items-center justify-center p-12 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1)_0,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                <Icon className="w-32 h-32 text-accent/20 group-hover:text-accent/60 transition-colors duration-500" />
                                <div className="absolute top-4 left-4 font-mono text-[10px] text-foreground/30">BIN // {id}</div>
                            </div>

                            {/* Text Side */}
                            <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col justify-center bg-card">
                                <span className="font-mono text-accent text-xs mb-4 uppercase flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-accent"></span> Seq_0{id}
                                </span>
                                <h2 className="font-sans font-bold text-3xl md:text-5xl text-foreground mb-4 tracking-tight">
                                    {title}
                                </h2>
                                <p className="font-mono text-sm md:text-base text-foreground/60 leading-relaxed">
                                    {desc}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default Protocol;
