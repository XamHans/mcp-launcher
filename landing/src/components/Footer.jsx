import React from 'react';

const Footer = () => {
    return (
        <footer className="w-full bg-background border-t border-borderline px-6 md:px-12 py-12 md:py-20 mt-16 font-mono text-sm text-foreground/60">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="md:col-span-2 flex flex-col justify-between">
                    <div>
                        <h2 className="font-sans font-bold text-2xl mb-4 text-foreground">[MCP_LAUNCHER]</h2>
                        <p className="max-w-sm leading-relaxed mb-8">
                            Runtime orchestration protocol for seamless MCP deployments.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 border border-accent/20 bg-accent/5 px-4 py-2 rounded text-accent w-fit">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                        SYS.UP // 99.99% UPTIME
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <h4 className="font-bold text-foreground mb-2 uppercase text-xs">./core</h4>
                    <a href="#" className="hover:text-accent hover:translate-x-1 transition-all">Pipeline</a>
                    <a href="#" className="hover:text-accent hover:translate-x-1 transition-all">Telemetry Config</a>
                    <a href="#" className="hover:text-accent hover:translate-x-1 transition-all">Client Integrations</a>
                    <a href="#" className="hover:text-accent hover:translate-x-1 transition-all">Docker Registries</a>
                </div>

                <div className="flex flex-col gap-3">
                    <h4 className="font-bold text-foreground mb-2 uppercase text-xs">./sys</h4>
                    <a href="#" className="hover:text-accent hover:translate-x-1 transition-all">GCP Connect</a>
                    <a href="#" className="hover:text-accent hover:translate-x-1 transition-all">Security</a>
                    <a href="#" className="hover:text-accent hover:translate-x-1 transition-all">Data Egress</a>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-16 pt-6 border-t border-borderline flex flex-col md:flex-row justify-between items-center text-xs text-foreground/40">
                <p>EOF &copy; {new Date().getFullYear()} // MCP Launcher. Authorized personnel only.</p>
                <p className="mt-4 md:mt-0">Compiled on React 19 / GSAP 3.</p>
            </div>
        </footer>
    );
};

export default Footer;
