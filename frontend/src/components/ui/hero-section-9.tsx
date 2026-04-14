"use client";

import * as React from "react"
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X, Cpu } from 'lucide-react'
import { SparklesText } from "./sparkles-text";

const menuItems = [
    { name: 'Features', href: '#features' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Test Upload', href: '/upload' },
]

export const HeroSection = () => {
    const [menuState, setMenuState] = React.useState(false)
    return (
        <div className="relative">
            <header>
                <nav
                    data-state={menuState && 'active'}
                    className="group fixed z-50 w-full border-b border-[var(--border-default)] bg-[var(--surface-primary)]/80 backdrop-blur-md md:relative lg:bg-transparent">
                    <div className="m-auto max-w-7xl px-6">
                        <div className="flex flex-wrap items-center justify-between py-4">
                            <div className="flex w-full justify-between lg:w-auto">
                                <Link
                                    href="/"
                                    aria-label="home"
                                    className="flex items-center space-x-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-info)] to-[var(--color-primary)] flex items-center justify-center shadow-lg">
                                        <Cpu size={18} className="text-white" />
                                    </div>
                                    <span className="font-bold text-lg text-[var(--text-primary)] tracking-tight">SentinelIQ</span>
                                </Link>

                                <button
                                    onClick={() => setMenuState(!menuState)}
                                    aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                                    className="relative z-20 block cursor-pointer p-2 lg:hidden text-[var(--text-primary)]">
                                    {menuState ? <X size={24} /> : <Menu size={24} />}
                                </button>
                            </div>

                            <div className="bg-[var(--surface-secondary)] group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-[var(--border-default)] p-6 shadow-2xl md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
                                <div className="lg:pr-4">
                                    <ul className="space-y-6 text-base lg:flex lg:gap-8 lg:space-y-0 lg:text-sm">
                                        {menuItems.map((item, index) => (
                                            <li key={index}>
                                                <Link
                                                    href={item.href}
                                                    className="text-[var(--text-secondary)] hover:text-[var(--color-primary)] font-medium duration-150">
                                                    <span>{item.name}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit lg:border-l lg:border-[var(--border-default)] lg:pl-6">
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                        className="border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                                        <Link href="/login">
                                            <span>Login</span>
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        size="sm"
                                        className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white">
                                        <Link href="/dashboard">
                                            <span>Start Dashboard</span>
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
            </header>

            <main>
                <div
                    aria-hidden
                    className="z-[2] absolute inset-0 pointer-events-none isolate contain-strict hidden lg:block">
                    {/* Background decorations have been ported to HeroGeometric. */}
                </div>

                <section className="relative overflow-hidden bg-transparent pt-20">
                    <div className="relative mx-auto max-w-5xl px-6 py-20 lg:py-24">
                        <div className="relative z-10 mx-auto max-w-3xl text-center">
                            <SparklesText text="Predictive Maintenance Reimagined" className="text-balance text-4xl font-extrabold md:text-5xl lg:text-6xl text-[var(--text-primary)]" />
                            
                            <p className="mx-auto my-8 max-w-2xl text-lg md:text-xl text-[var(--text-secondary)]">
                                Automate failure detection and calculate Remaining Useful Life (RUL) with NASA C-MAPSS trained TCN Models. Predict engine issues in real-time.
                            </p>

                            <Button
                                asChild
                                size="lg"
                                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-[0_0_24px_var(--accent-glow)] hover:shadow-lg transition-transform hover:-translate-y-1">
                                <Link href="/dashboard">
                                    <span className="font-bold">Start Monitoring Fleet</span>
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="mx-auto -mt-8 max-w-7xl relative z-10 [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]">
                        <div className="[perspective:1200px] px-4 md:px-0 mx-auto w-full flex justify-center">
                            <div className="group transition-transform duration-700 [transform:rotateX(15deg)] hover:[transform:rotateX(5deg)] w-full max-w-5xl">
                                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/50 backdrop-blur shadow-2xl p-2 md:p-4 hover:border-[var(--color-primary)]/50 transition-colors">
                                    <div className="rounded-xl overflow-hidden relative pb-[56.25%] bg-[var(--surface-tertiary)]">
                                        <img
                                            className="absolute inset-0 w-full h-full object-cover"
                                            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop"
                                            alt="Dashboard Preview"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-primary)] to-transparent opacity-80" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="p-4 px-8 rounded-full bg-[var(--surface-overlay)]/40 border border-[var(--border-emphasis)] backdrop-blur text-sm font-semibold tracking-wider text-[var(--text-primary)] uppercase">Live Telemetry Active</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                <section className="bg-transparent relative z-10 py-16">
                    <div className="m-auto max-w-5xl px-6">
                        <h2 className="text-center text-sm font-semibold tracking-widest text-[var(--text-tertiary)] uppercase">Powered by Industry Tech & Data</h2>
                        <div className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16 sm:gap-y-12 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                            <div className="font-bold text-xl text-[var(--text-primary)] tracking-tighter">NASA C-MAPSS</div>
                            <div className="font-bold text-xl text-[var(--text-primary)] tracking-tighter">PyTorch</div>
                            <div className="font-bold text-xl text-[var(--text-primary)] tracking-tighter">FastAPI</div>
                            <div className="font-bold text-xl text-[var(--text-primary)] tracking-tighter">Next.js</div>
                            <div className="font-bold text-xl text-[var(--text-primary)] tracking-tighter">PostgreSQL</div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}
