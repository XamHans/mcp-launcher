import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Terminal, Database, Activity } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// --- Card 1: Diagnostic Shuffler --- //
const CodeGenerator = () => {
    const lines = [
        'FROM python:3.11-slim',
        'WORKDIR /app',
        'COPY requirements.txt .',
        'RUN pip install -r requirements.txt',
        'COPY . .',
        'CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]'
    ];

    const [visibleLines, setVisibleLines] = useState(1);

    useEffect(() => {
        const interval = setInterval(() => {
            setVisibleLines(v => (v < lines.length ? v + 1 : 1));
        }, 800);
        return () => clearInterval(interval);
    }, [lines.length]);

    return (
        <div className="w-full h-48 mt-8 bg-[#000000] border border-borderline rounded-md p-5 overflow-hidden shadow-inner flex flex-col font-mono text-xs">
            <div className="flex gap-2 mb-4 border-b border-borderline pb-3">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-foreground/40 ml-2">Dockerfile</span>
            </div>
            <div className="flex-1 flex flex-col gap-1 text-[#a3c9b1]">
                {lines.map((line, i) => (
                    <div key={i} className={`transition-opacity duration-200 ${i < visibleLines ? 'opacity-100' : 'opacity-0'} ${line.startsWith('FROM') || line.startsWith('WORKDIR') || line.startsWith('COPY') || line.startsWith('RUN') || line.startsWith('CMD') ? 'text-accent' : ''}`}>
                        <span className="text-foreground/30 mr-3">{i + 1}</span>
                        {line}
                    </div>
                ))}
                {visibleLines < lines.length && <span className="w-2 h-3 bg-accent animate-pulse mt-1 ml-6 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>}
            </div>
        </div>
    );
};

// --- Card 2: Telemetry Typewriter --- //
const TelemetryTypewriter = () => {
    const text = `[INFO] Container built successfully (2.4s)
[INFO] Pushing image to registry...
[OK] Image tagged as mcp-server:latest
[SYS] Provisioning Cloud Run service
[SYS] Binding port 8080...
[OK] External IP assigned: 34.120.x.x
[LIVE] Deployment sequence complete.`;

    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (index < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[index]);
                setIndex(index + 1);
            }, Math.random() * 20 + 10);
            return () => clearTimeout(timeout);
        } else {
            const timeout = setTimeout(() => {
                setDisplayedText('');
                setIndex(0);
            }, 3000);
            return () => clearTimeout(timeout);
        }
    }, [index, text]);

    return (
        <div className="mt-8 flex flex-col h-48 bg-[#000000] border border-borderline rounded-md p-5 overflow-hidden relative shadow-inner">
            <div className="flex items-center justify-between mb-4 border-b border-borderline pb-3">
                <div className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-accent" />
                    <span className="text-[10px] font-mono tracking-widest text-foreground/50 uppercase">Build_Logs</span>
                </div>
                <div className="text-[10px] font-mono text-accent animate-pulse">Running</div>
            </div>
            <div className="font-mono text-xs text-foreground/70 whitespace-pre-wrap flex-1 leading-relaxed">
                {displayedText}
                <span className="inline-block w-2 h-3 bg-accent ml-1 animate-pulse align-middle shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </div>
        </div>
    );
};

// --- Card 3: Cursor Protocol Scheduler --- //
const MetricsDashboard = () => {
    const [cpu, setCpu] = useState(4);
    const [mem, setMem] = useState(256);

    useEffect(() => {
        const int = setInterval(() => {
            setCpu(Math.floor(Math.random() * 20) + 2);
            setMem(Math.floor(Math.random() * 100) + 200);
        }, 1000);
        return () => clearInterval(int);
    }, []);

    return (
        <div className="mt-8 h-48 bg-[#000000] border border-borderline rounded-md p-5 flex flex-col justify-between overflow-hidden relative font-mono text-xs">
            <div className="flex items-center gap-2 mb-4 border-b border-borderline pb-3 text-foreground/50">
                <Database className="w-3 h-3" />
                <span className="text-[10px] uppercase tracking-widest">Live_Telemetry</span>
            </div>

            <div className="flex flex-col gap-4">
                <div>
                    <div className="flex justify-between text-foreground/60 mb-1">
                        <span>CPU_USAGE</span>
                        <span className="text-accent">{cpu}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-borderline rounded-full overflow-hidden">
                        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${cpu}%` }}></div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-foreground/60 mb-1">
                        <span>MEM_ALLOC</span>
                        <span className="text-[#3b82f6]">{mem}MB</span>
                    </div>
                    <div className="h-1.5 w-full bg-borderline rounded-full overflow-hidden">
                        <div className="h-full bg-[#3b82f6] transition-all duration-300" style={{ width: `${(mem / 512) * 100}%` }}></div>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-2 border-t border-borderline pt-3">
                    <span className="text-foreground/40">INTEGRATED_CLIENT</span>
                    <span className="px-2 py-1 bg-accent/20 text-accent border border-accent/30 rounded flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span> ONLINE</span>
                </div>
            </div>
        </div>
    );
};

// --- Features Main --- //
const Features = () => {
    const sectionRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.feature-card', {
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top 80%',
                },
                y: 30,
                opacity: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: 'power2.out'
            });
        }, sectionRef);
        return () => ctx.revert();
    }, []);

    return (
        <section id="features" ref={sectionRef} className="py-32 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto bg-background border-b border-borderline">
            <div className="mb-20 font-mono text-sm tracking-widest uppercase text-foreground/40 border-l border-accent pl-4">
        // Core_Capabilities
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* Card 1 */}
                <div className="feature-card bg-[#09090B] border border-borderline rounded-xl p-8 hover:border-foreground/30 transition-colors duration-300">
                    <h3 className="font-sans font-bold text-xl text-foreground mb-4 flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-accent" /> Auto_Container
                    </h3>
                    <p className="font-mono text-sm text-foreground/60 leading-relaxed min-h-[5rem]">
                        AI immediately parses your MCP logic, generating optimized Dockerfiles and Makefiles for seamless execution.
                    </p>
                    <CodeGenerator />
                </div>

                {/* Card 2 */}
                <div className="feature-card bg-[#09090B] border border-borderline rounded-xl p-8 hover:border-foreground/30 transition-colors duration-300">
                    <h3 className="font-sans font-bold text-xl text-foreground mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-accent" /> Deploy_Pipeline
                    </h3>
                    <p className="font-mono text-sm text-foreground/60 leading-relaxed min-h-[5rem]">
                        A frictionless UI/UX flow. Hit deploy and monitor the provisioning cluster build sequences in real time.
                    </p>
                    <TelemetryTypewriter />
                </div>

                {/* Card 3 */}
                <div className="feature-card bg-[#09090B] border border-borderline rounded-xl p-8 hover:border-foreground/30 transition-colors duration-300">
                    <h3 className="font-sans font-bold text-xl text-foreground mb-4 flex items-center gap-2">
                        <Database className="w-5 h-5 text-accent" /> Observability
                    </h3>
                    <p className="font-mono text-sm text-foreground/60 leading-relaxed min-h-[5rem]">
                        Live metric streams, log aggregation, and an integrated native testing client instantly bound to your instance.
                    </p>
                    <MetricsDashboard />
                </div>

            </div>
        </section>
    );
};

export default Features;
