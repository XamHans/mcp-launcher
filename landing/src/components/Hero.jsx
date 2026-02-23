import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

// A sub-component for the animated background pipeline
const PipelineBackground = () => {
    const svgRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Animate the flow lines (stroke-dashoffset)
            gsap.to('.flow-line', {
                strokeDashoffset: -40,
                ease: 'none',
                duration: 1.5,
                repeat: -1,
            });

            // Pulse the nodes
            gsap.to('.pipeline-node', {
                scale: 1.2,
                opacity: 0.8,
                yoyo: true,
                repeat: -1,
                duration: 1,
                stagger: 0.2,
                ease: 'power1.inOut',
                transformOrigin: "center center"
            });

            // Floating particles around the grid
            gsap.to('.particle', {
                y: 'random(-50, 50)',
                x: 'random(-50, 50)',
                opacity: 'random(0.1, 0.5)',
                duration: 'random(2, 5)',
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });

        }, svgRef);
        return () => ctx.revert();
    }, []);

    return (
        <div className="absolute inset-0 z-0 overflow-hidden opacity-30 select-none pointer-events-none">
            <svg ref={svgRef} className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* We'll draw a cool diagonal/branching pipeline system */}
                <g stroke="#10B981" strokeWidth="2" fill="none" >
                    {/* Main Line */}
                    <path
                        className="flow-line"
                        d="M -100 200 L 300 200 L 400 300 L 700 300 L 800 150 L 1200 150 L 1400 350 L 2000 350"
                        strokeDasharray="10 10"
                        opacity="0.5"
                    />

                    {/* Branch 1 */}
                    <path
                        className="flow-line"
                        d="M 300 200 L 400 100 L 600 100 L 700 300"
                        strokeDasharray="10 10"
                        opacity="0.3"
                    />

                    {/* Branch 2 */}
                    <path
                        className="flow-line"
                        d="M 800 150 L 900 300 L 1100 300 L 1200 150"
                        strokeDasharray="10 10"
                        opacity="0.3"
                    />
                </g>

                {/* Nodes */}
                <g fill="#09090B" stroke="#10B981" strokeWidth="2">
                    {/* Main Nodes */}
                    <circle className="pipeline-node" cx="300" cy="200" r="8" />
                    <circle className="pipeline-node" cx="400" cy="300" r="10" fill="#10B981" />
                    <circle className="pipeline-node" cx="700" cy="300" r="12" />
                    <circle className="pipeline-node" cx="800" cy="150" r="8" />
                    <circle className="pipeline-node" cx="1200" cy="150" r="16" fill="#10B981" />
                    <circle className="pipeline-node" cx="1400" cy="350" r="10" />

                    {/* Branch Nodes */}
                    <circle className="pipeline-node" cx="400" cy="100" r="6" />
                    <circle className="pipeline-node" cx="600" cy="100" r="6" />
                    <circle className="pipeline-node" cx="900" cy="300" r="6" />
                    <circle className="pipeline-node" cx="1100" cy="300" r="6" />
                </g>

                {/* Node Labels */}
                <g fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="monospace" textAnchor="middle">
                    <text x="300" y="225">GIT_PUSH</text>
                    <text x="400" y="325">AST_PARSE</text>
                    <text x="700" y="325">BUILD_IMG</text>
                    <text x="800" y="130">REGISTRY</text>
                    <text x="1200" y="185">CLOUD_RUN</text>
                    <text x="1400" y="380">TELEMETRY</text>

                    <text x="500" y="90">LINT_TEST</text>
                    <text x="1000" y="320">ENV_CHECK</text>
                </g>

                {/* Ambient Particles */}
                <g fill="#10B981">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <circle
                            key={i}
                            className="particle"
                            cx={Math.random() * 2000}
                            cy={Math.random() * 1000}
                            r={Math.random() * 3}
                            opacity="0"
                        />
                    ))}
                </g>
            </svg>
        </div>
    );
};

const Hero = () => {
    const heroRef = useRef(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.hero-elem', {
                y: 30,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: 'power2.out',
                delay: 0.1
            });
        }, heroRef);
        return () => ctx.revert();
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText('npx mcp-launcher');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);

        // Visual feedback / Intense pulse
        gsap.to('.pipeline-node', {
            scale: 2,
            fill: '#fff',
            duration: 0.1,
            yoyo: true,
            repeat: 1
        });

        // Speed up the flow lines briefly
        gsap.to('.flow-line', {
            strokeDashoffset: "-=200",
            duration: 0.5,
            ease: "power2.out"
        });
    };

    return (
        <section ref={heroRef} className="relative min-h-[100dvh] w-full flex flex-col justify-center pt-24 md:pt-32 pb-16 md:pb-24 px-6 md:px-12 lg:px-24 rounded-b-[2rem] border-b border-borderline bg-background">

            {/* Animated CI/CD Pipeline Background */}
            <PipelineBackground />

            {/* Heavy Gradient Overlay to ensure text pops */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/80 to-background/20 pointer-events-none rounded-b-[2rem]"></div>

            {/* Content */}
            <div className="relative z-20 max-w-4xl text-foreground">
                <div className="hero-elem font-mono text-accent text-sm md:text-base tracking-widest uppercase mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    Terminal &gt; MCP Launcher &gt; ONLINE MCP SERVER
                </div>

                <h1 className="hero-elem font-sans font-bold text-5xl md:text-7xl lg:text-[7rem] leading-[0.9] tracking-tighter mb-8 text-foreground drop-shadow-lg">
                    Deploy MCP <br />
                    <span className="text-foreground/40">In 5 Minutes.</span>
                </h1>

                <p className="hero-elem font-mono text-base md:text-lg text-foreground/60 max-w-xl mb-12 leading-relaxed">
                    AI analyzes your source, generates Dockerfiles & Makefiles, and spins up a realtime telemetry pipeline automatically.
                </p>

                <div className="flex flex-col w-full max-w-lg mt-8 gap-4 px-2 md:px-0 mx-auto md:mx-0">
                    {/* Terminal CTA */}
                    <div
                        onClick={handleCopy}
                        className="hero-cta w-full rounded-xl overflow-hidden bg-[#000000] border border-borderline shadow-[0_0_40px_rgba(16,185,129,0.15)] transition-all hover:shadow-[0_0_60px_rgba(16,185,129,0.3)] group cursor-pointer"
                    >
                        {/* Terminal Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-borderline bg-background">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                            </div>
                            <div className="font-mono text-[10px] text-foreground/40 font-bold tracking-widest uppercase">bash ~ spin_it_up</div>
                        </div>
                        {/* Terminal Body */}
                        <div className="p-6 relative">
                            <div className="font-mono text-xl md:text-2xl text-accent flex items-center gap-3">
                                <span className="text-foreground/40 select-none">$</span>
                                <span className="tracking-tight">npx mcp-launcher</span>
                                <span className="w-3 h-6 bg-accent animate-pulse block ml-1"></span>
                            </div>

                            <div className={`absolute right-6 top-1/2 -translate-y-1/2 transition-opacity duration-300 pointer-events-none ${copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <span className={`font-mono text-xs px-2 py-1 rounded transition-colors ${copied ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-foreground/10 text-foreground'}`}>
                                    {copied ? 'Copied!' : 'Click to Copy'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Secondary GitHub CTA */}
                    <a href="https://github.com/mcp-launcher/mcp-launcher" target="_blank" rel="noopener noreferrer" className="hero-cta group flex items-center justify-center gap-3 w-full px-6 py-4 rounded-xl border border-transparent hover:border-borderline bg-transparent hover:bg-white/5 transition-all duration-300">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-foreground/40 group-hover:text-foreground transition-colors" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        <span className="font-sans font-medium text-sm text-foreground/40 group-hover:text-foreground transition-colors mt-0.5">Explore on GitHub</span>
                        <span className="font-mono text-[10px] text-foreground/30 group-hover:text-foreground/50 border border-transparent group-hover:border-foreground/10 px-2 py-0.5 rounded-full mt-0.5 transition-all">Open Source</span>
                    </a>
                </div>
            </div>
        </section>
    );
};

export default Hero;
