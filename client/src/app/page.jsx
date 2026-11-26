'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { landingSampleData } from '@/data/landingSample';
import {
  Button,
  ScoreBar,
  CountdownRing,
  Accordion,
} from '@/components/ui';
import {
  Wrench,
  Snowflake,
  Truck,
  ArrowRight,
  ShieldCheck,
  FileText,
  CheckSquare,
  AlertCircle,
  CreditCard,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, role } = useAuth();

  // Hero interactive state
  const [selectedService, setSelectedService] = useState('plumbing');
  const [countdown, setCountdown] = useState(60);
  const [offerAccepted, setOfferAccepted] = useState(false);

  // Hero panel state sequence:
  // Starts with "Offer sent, 60 seconds to respond" + CountdownRing.
  // After 4s, transitions once (no loop) to "Offer accepted. Carlos is on the way, ETA 4 min" with no countdown.
  // Respects prefers-reduced-motion by showing the final state directly.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setOfferAccepted(true);
      return;
    }

    const timer = setTimeout(() => {
      setOfferAccepted(true);
    }, 4000);

    const interval = setInterval(() => {
      setCountdown((c) => Math.max(c - 1, 0));
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleBookClick = () => {
    router.push(`/book?category=${selectedService}`);
  };

  const servicesData = landingSampleData.servicesCatalogue;

  return (
    <div className="w-full text-ink">
      {/* SECTION 1: HERO (Concrete Background, Work-Order Ticket Stands Out) */}
      <section className="bg-concrete border-b border-line pt-8 pb-16 lg:pt-14 lg:pb-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            
            {/* Left Column (7 cols on desktop) */}
            <div className="lg:col-span-7 space-y-6 min-w-0">
              <h1 className="font-headline font-extrabold text-3xl sm:text-4xl lg:text-[44px] text-ink leading-[1.12] tracking-tight break-words">
                The right technician, not just the nearest one.
              </h1>
              
              <p className="text-base sm:text-lg text-ink/80 leading-relaxed max-w-xl">
                Plumbing, AC repair and urgent delivery. We match by skill, parts in the van and your deadline, then track the job live until it's done.
              </p>

              {/* Service Picker */}
              <div className="space-y-3 pt-2">
                <span className="block text-xs font-semibold text-ink/70">
                  What do you need help with?
                </span>
                <div className="grid grid-cols-3 gap-2 max-w-md">
                  <button
                    type="button"
                    onClick={() => setSelectedService('plumbing')}
                    className={`py-2 px-2 sm:px-3 rounded-control text-xs sm:text-sm font-semibold border transition-colors flex items-center justify-center gap-1.5 sm:gap-2 ${
                      selectedService === 'plumbing'
                        ? 'bg-ink text-white border-ink'
                        : 'bg-white text-ink border-line hover:bg-concrete'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" strokeWidth={1.75} />
                    <span className="truncate">Plumbing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedService('hvac')}
                    className={`py-2 px-2 sm:px-3 rounded-control text-xs sm:text-sm font-semibold border transition-colors flex items-center justify-center gap-1.5 sm:gap-2 ${
                      selectedService === 'hvac'
                        ? 'bg-ink text-white border-ink'
                        : 'bg-white text-ink border-line hover:bg-concrete'
                    }`}
                  >
                    <Snowflake className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" strokeWidth={1.75} />
                    <span className="truncate">AC & HVAC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedService('delivery')}
                    className={`py-2 px-2 sm:px-3 rounded-control text-xs sm:text-sm font-semibold border transition-colors flex items-center justify-center gap-1.5 sm:gap-2 ${
                      selectedService === 'delivery'
                        ? 'bg-ink text-white border-ink'
                        : 'bg-white text-ink border-line hover:bg-concrete'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" strokeWidth={1.75} />
                    <span className="truncate">Delivery</span>
                  </button>
                </div>
              </div>

              {/* Actions: Primary CTA is the ONLY amber button in the viewport */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Button variant="primary" size="lg" onClick={handleBookClick} rightIcon={ArrowRight}>
                  Book a technician
                </Button>
                <Link
                  href="/register?role=technician"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-ink/80 hover:text-ink transition-colors"
                >
                  Become a technician
                </Link>
              </div>
            </div>

            {/* Right Column: Work-Order Ticket Panel (5 cols on desktop, stands out on concrete) */}
            <div className="lg:col-span-5 min-w-0 w-full">
              <div className="bg-white rounded-panel border border-line overflow-hidden">
                {/* Ink header strip with ticket number */}
                <div className="bg-ink text-white px-4 py-2.5 flex items-center justify-between">
                  <span className="font-headline font-bold text-sm tracking-tight text-white">
                    {landingSampleData.heroDispatch.ticketNumber}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-control bg-white/10 text-white font-semibold">
                    {landingSampleData.heroDispatch.badge}
                  </span>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  {/* Ticket Details */}
                  <div className="space-y-1">
                    <h3 className="font-headline font-bold text-base sm:text-lg text-ink">
                      {landingSampleData.heroDispatch.requestTitle}
                    </h3>
                    <div className="text-sm text-ink/80 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{landingSampleData.heroDispatch.jobDetail}</span>
                      <span className="font-semibold text-ink">{landingSampleData.heroDispatch.slaWindow}</span>
                    </div>
                  </div>

                  {/* Top Match Card (Carlos M.) */}
                  <div className="p-3.5 rounded-control border border-ink bg-white space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-control bg-amber text-ink flex items-center justify-center text-xs font-bold font-headline flex-shrink-0">
                          {landingSampleData.heroDispatch.technicians[0].initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-ink leading-tight">
                            {landingSampleData.heroDispatch.technicians[0].name}
                          </div>
                          <div className="text-xs text-ink/70">
                            Score: {landingSampleData.heroDispatch.technicians[0].score}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-control bg-ink text-white font-semibold flex-shrink-0">
                        Best match
                      </span>
                    </div>

                    {/* ScoreBar factor bars for top match */}
                    <div className="space-y-2 pt-2 border-t border-line/60">
                      {landingSampleData.heroDispatch.technicians[0].factorScores.map((factor, idx) => (
                        <ScoreBar
                          key={idx}
                          label={factor.label}
                          percentage={factor.percentage}
                          isTop={factor.isTop}
                        />
                      ))}
                    </div>

                    {/* Short chips instead of middle-dot joined string */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {landingSampleData.heroDispatch.technicians[0].chips.map((chip, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-control bg-concrete text-ink text-xs font-medium"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Second candidate (compact) */}
                  <div className="p-3 rounded-control border border-line bg-concrete/40 flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-control bg-concrete text-ink/70 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {landingSampleData.heroDispatch.technicians[1].initials}
                      </div>
                      <div className="text-sm font-medium text-ink truncate">
                        {landingSampleData.heroDispatch.technicians[1].name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-ink/60">
                        Score: {landingSampleData.heroDispatch.technicians[1].score}
                      </span>
                      <span className="px-2 py-0.5 rounded-control bg-concrete text-ink/70 text-xs font-medium">
                        9 min away
                      </span>
                    </div>
                  </div>

                  {/* Coherent single state line: CountdownRing when pending, then clean message when accepted */}
                  <div className="pt-3 border-t border-line flex items-center gap-3">
                    {!offerAccepted ? (
                      <>
                        <CountdownRing seconds={countdown} totalSeconds={60} size={28} strokeWidth={3} />
                        <span className="text-sm font-semibold text-ink">
                          Offer sent, 60 seconds to respond
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-status-success flex-shrink-0" />
                        <span className="text-sm font-semibold text-ink">
                          Offer accepted. Carlos is on the way, ETA 4 min
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Below-the-fold edge truth line (short chips, no middle-dots) */}
          <div className="mt-12 pt-6 border-t border-line/70 flex flex-wrap justify-center items-center gap-2">
            <span className="px-3 py-1 rounded-control bg-white border border-line text-xs sm:text-sm font-medium">
              Live tracking
            </span>
            <span className="px-3 py-1 rounded-control bg-white border border-line text-xs sm:text-sm font-medium">
              Upfront estimates
            </span>
            <span className="px-3 py-1 rounded-control bg-white border border-line text-xs sm:text-sm font-medium">
              Quotes approved before work starts
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 2: SERVICES (White Background, Asymmetric Layout) */}
      <section id="services" className="bg-white border-b border-line py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-xl space-y-2">
            <h2 className="font-headline font-bold text-2xl sm:text-3xl text-ink">
              What we can help with
            </h2>
            <p className="text-base text-ink/70">
              Plumbing, AC and HVAC repair, and urgent package delivery with verified technicians.
            </p>
          </div>

          {/* Asymmetric 12-col grid: items-start so Plumbing card hugs its content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left large Plumbing panel (6 cols) */}
            <div className="lg:col-span-6 min-w-0 bg-concrete rounded-panel border border-line p-6 sm:p-8 space-y-5">
              <Wrench className="w-6 h-6 text-ink" strokeWidth={1.75} />

              <div className="space-y-1.5">
                <h3 className="font-headline font-bold text-xl text-ink">
                  {servicesData.plumbing.category}
                </h3>
                <p className="text-base text-ink/70 leading-relaxed">
                  {servicesData.plumbing.description}
                </p>
              </div>

              <ul className="space-y-2.5 pt-3 border-t border-line text-base text-ink/80">
                {servicesData.plumbing.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Action link directly under list: no empty vertical gap */}
              <div className="pt-2">
                <Link
                  href="/book?category=plumbing"
                  className="inline-flex items-center text-base font-bold text-ink hover:text-ink/80 underline underline-offset-4"
                >
                  <span>{servicesData.plumbing.actionText}</span>
                </Link>
              </div>
            </div>

            {/* Right stacked panels (6 cols): HVAC top, Delivery bottom */}
            <div className="lg:col-span-6 min-w-0 flex flex-col gap-6">
              
              {/* HVAC Card */}
              <div className="bg-concrete rounded-panel border border-line p-6 sm:p-7 space-y-4">
                <Snowflake className="w-6 h-6 text-ink" strokeWidth={1.75} />

                <div className="space-y-1">
                  <h3 className="font-headline font-bold text-lg text-ink">
                    {servicesData.hvac.category}
                  </h3>
                  <p className="text-base text-ink/70">
                    {servicesData.hvac.description}
                  </p>
                </div>

                <div className="text-sm text-ink/80 space-y-1.5 pt-2 border-t border-line/60">
                  {servicesData.hvac.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-1">
                  <Link
                    href="/book?category=hvac"
                    className="inline-flex items-center text-sm font-bold text-ink hover:text-ink/80 underline underline-offset-4"
                  >
                    <span>{servicesData.hvac.actionText}</span>
                  </Link>
                </div>
              </div>

              {/* Delivery Card */}
              <div className="bg-concrete rounded-panel border border-line p-6 sm:p-7 space-y-4">
                <Truck className="w-6 h-6 text-ink" strokeWidth={1.75} />

                <div className="space-y-1">
                  <h3 className="font-headline font-bold text-lg text-ink">
                    {servicesData.delivery.category}
                  </h3>
                  <p className="text-base text-ink/70">
                    {servicesData.delivery.description}
                  </p>
                </div>

                <div className="text-sm text-ink/80 space-y-1.5 pt-2 border-t border-line/60">
                  {servicesData.delivery.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-1">
                  <Link
                    href="/book?category=delivery"
                    className="inline-flex items-center text-sm font-bold text-ink hover:text-ink/80 underline underline-offset-4"
                  >
                    <span>{servicesData.delivery.actionText}</span>
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS (Concrete Background, Single Row on Desktop) */}
      <section id="how-it-works" className="bg-concrete border-b border-line py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-xl space-y-2">
            <h2 className="font-headline font-bold text-2xl sm:text-3xl text-ink">
              How it works
            </h2>
            <p className="text-base text-ink/70">
              From your request to a finished job, in four steps.
            </p>
          </div>

          {/* Desktop single horizontal row joined by route line */}
          <div className="hidden md:block relative">
            {/* Inline SVG Route Connector Line */}
            <div className="absolute top-5 left-12 right-12 h-0.5 bg-line -z-0" />

            <div className="grid grid-cols-4 gap-8 relative z-10">
              {/* Step 1 */}
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-control bg-ink text-white font-headline font-bold text-sm flex items-center justify-center">
                  1
                </div>
                <h3 className="font-headline font-bold text-base text-ink">
                  Tell us what's wrong
                </h3>
                <p className="text-base text-ink/70 leading-relaxed">
                  Describe the job and drop a pin where you need help.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-control bg-ink text-white font-headline font-bold text-sm flex items-center justify-center">
                  2
                </div>
                <h3 className="font-headline font-bold text-base text-ink">
                  We find the right pro
                </h3>
                <p className="text-base text-ink/70 leading-relaxed">
                  We check skills, parts in stock, distance and your deadline, then send the job to the best match.
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-control bg-ink text-white font-headline font-bold text-sm flex items-center justify-center">
                  3
                </div>
                <h3 className="font-headline font-bold text-base text-ink">
                  Track them live
                </h3>
                <p className="text-base text-ink/70 leading-relaxed">
                  Watch your technician arrive on the map with a live ETA.
                </p>
              </div>

              {/* Step 4 (Consistent ink marker style) */}
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-control bg-ink text-white font-headline font-bold text-sm flex items-center justify-center">
                  4
                </div>
                <h3 className="font-headline font-bold text-base text-ink">
                  Approve, pay, rate
                </h3>
                <p className="text-base text-ink/70 leading-relaxed">
                  Approve the final quote or price, pay after the work is verified, and leave a rating.
                </p>
              </div>
            </div>
          </div>

          {/* Mobile vertical version */}
          <div className="md:hidden space-y-6 relative pl-6 border-l-2 border-line">
            <div className="space-y-1 relative">
              <span className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-control bg-ink text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h3 className="font-headline font-bold text-base text-ink">Tell us what's wrong</h3>
              <p className="text-base text-ink/70">Describe the job and drop a pin where you need help.</p>
            </div>

            <div className="space-y-1 relative">
              <span className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-control bg-ink text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="font-headline font-bold text-base text-ink">We find the right pro</h3>
              <p className="text-base text-ink/70">We check skills, parts in stock, distance and your deadline, then send the job to the best match.</p>
            </div>

            <div className="space-y-1 relative">
              <span className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-control bg-ink text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h3 className="font-headline font-bold text-base text-ink">Track them live</h3>
              <p className="text-base text-ink/70">Watch your technician arrive on the map with a live ETA.</p>
            </div>

            <div className="space-y-1 relative">
              <span className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-control bg-ink text-white text-xs font-bold flex items-center justify-center">
                4
              </span>
              <h3 className="font-headline font-bold text-base text-ink">Approve, pay, rate</h3>
              <p className="text-base text-ink/70">Approve the final quote or price, pay after the work is verified, and leave a rating.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: SHOWPIECE: NEAREST ISN'T ALWAYS RIGHT (White Background) */}
      <section id="why-matching" className="bg-white border-b border-line py-16 lg:py-24">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Statement: Display Headline & Single Sentence Example */}
            <div className="lg:col-span-5 min-w-0 space-y-6">
              <h2 className="font-headline font-extrabold text-4xl sm:text-5xl lg:text-[56px] text-ink leading-[1.08] tracking-tight">
                Nearest isn't always right.
              </h2>
              <p className="text-lg sm:text-xl text-ink/80 leading-relaxed max-w-md">
                A plumber two kilometres away without the right valve can't fix your leak.
              </p>
            </div>

            {/* Right Showpiece Weights Chart */}
            <div className="lg:col-span-7 min-w-0 bg-white rounded-panel border border-line p-6 sm:p-8 space-y-6">
              <div className="space-y-4">
                {landingSampleData.matchingFactors.map((factor, idx) => {
                  // Scaled relative to the largest factor (30% fills the track)
                  const scaledWidth = (factor.percentage / 30) * 100;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-base">
                        <span className={`font-semibold ${factor.isTop ? 'text-ink font-bold' : 'text-ink/80'}`}>
                          {factor.label}
                        </span>
                        <span className="font-bold tabular-nums text-ink text-base">
                          {factor.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-concrete rounded-control h-4 overflow-hidden border border-line/60">
                        <div
                          className={`h-full rounded-control transition-all duration-300 ${
                            factor.isTop ? 'bg-amber' : 'bg-ink'
                          }`}
                          style={{ width: `${scaledWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-sm text-ink/70 pt-4 border-t border-line leading-relaxed">
                We score every eligible technician on these six factors. Anyone missing a hard requirement (skills, parts, availability) is never offered the job.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 5: BUILT TO BE TRUSTED (Concrete Background, Single Column of 5 Rows) */}
      <section className="bg-concrete border-b border-line py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-xl space-y-2">
            <h2 className="font-headline font-bold text-2xl sm:text-3xl text-ink">
              Built to be trusted
            </h2>
            <p className="text-base text-ink/70">
              Clear operational practices enforced across every booking.
            </p>
          </div>

          {/* Single column of 5 rows with bold lead-in and one line each, 16px text */}
          <div className="max-w-3xl divide-y divide-line bg-white rounded-panel border border-line px-6 py-2">
            {landingSampleData.trustPractices.map((practice, idx) => {
              const IconComponent =
                practice.icon === 'ShieldCheck' ? ShieldCheck :
                practice.icon === 'FileText' ? FileText :
                practice.icon === 'CheckSquare' ? CheckSquare :
                practice.icon === 'AlertCircle' ? AlertCircle :
                CreditCard;

              return (
                <div key={idx} className="py-4 sm:py-5 flex items-start gap-4">
                  <IconComponent className="w-5 h-5 text-ink flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <p className="text-base text-ink leading-relaxed">
                    <strong className="font-bold text-ink mr-1.5">{practice.lead}</strong>
                    <span className="text-ink/80">{practice.description}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 6: FOR TECHNICIANS (Ink Background, White Text, Amber Button) */}
      <section id="for-technicians" className="bg-ink text-white border-b border-line py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Content (7 cols) */}
            <div className="lg:col-span-7 min-w-0 space-y-6">
              <h2 className="font-headline font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white leading-tight">
                Get jobs that fit your skills and your van.
              </h2>
              <p className="text-base text-white/80 leading-relaxed max-w-xl">
                Set your service area and availability, keep your parts stock up to date, and receive offers matched to what you can actually fix. See your earnings for every job.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link href="/register?role=technician">
                  <Button variant="primary" size="lg">
                    Join as a technician
                  </Button>
                </Link>
                <a
                  href="#faq"
                  className="inline-flex items-center justify-center px-3 py-2 text-sm font-semibold text-white/80 hover:text-white"
                >
                  How verification works
                </a>
              </div>
            </div>

            {/* Right Compact Example Offer Screen (5 cols) */}
            <div className="lg:col-span-5 min-w-0">
              <div className="bg-white text-ink rounded-panel p-5 space-y-4 border border-line">
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <span className="text-xs font-semibold text-ink/60">
                    Incoming job offer
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-control bg-concrete text-ink font-bold">
                    {landingSampleData.technicianOfferExample.badge}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-headline font-bold text-sm text-ink">
                    {landingSampleData.technicianOfferExample.serviceTitle}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-control bg-concrete text-ink/80 text-xs font-medium">
                      {landingSampleData.technicianOfferExample.distanceText}
                    </span>
                    <span className="px-2 py-0.5 rounded-control bg-concrete text-ink/80 text-xs font-medium">
                      Fits SLA target
                    </span>
                  </div>
                </div>

                {/* Offer notice: No currency numbers, shows real expectations */}
                <div className="p-3.5 rounded-control bg-concrete text-sm space-y-1.5 border border-line/60">
                  <div className="font-semibold text-ink leading-snug">
                    {landingSampleData.technicianOfferExample.noticeText}
                  </div>
                  <div className="text-xs text-ink/70">
                    Required: {landingSampleData.technicianOfferExample.requiredPart}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                  <span className="text-xs font-semibold text-ink/70">
                    Time to respond: 48s
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Decline
                    </Button>
                    <Button variant="primary" size="sm">
                      Accept job
                    </Button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 7: FOR OPERATORS (Concrete Background, Large Contrast KPI Cards) */}
      <section className="bg-concrete border-b border-line py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="max-w-xl space-y-2">
              <h2 className="font-headline font-bold text-2xl sm:text-3xl text-ink">
                Run dispatch from one board.
              </h2>
              <p className="text-base text-ink/70">
                Live dispatch board with candidate score breakdowns, automated SLA breach warnings before deadlines are missed, manual override, disputes and audit trails.
              </p>
            </div>
            <Link href="/admin/dashboard">
              <Button variant="outline" size="md" rightIcon={ArrowRight}>
                Admin log in
              </Button>
            </Link>
          </div>

          {/* Four large KPI cards in white with 1px border on concrete background */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {landingSampleData.operatorKpis.metrics.map((kpi, idx) => (
              <div key={idx} className="p-6 rounded-panel bg-white border border-line space-y-3">
                <div className="flex justify-between items-center gap-1">
                  <span className="text-sm font-semibold text-ink/75">{kpi.label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-control bg-concrete text-ink border border-line flex-shrink-0">
                    {landingSampleData.operatorKpis.badge}
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-headline font-extrabold text-ink tabular-nums">
                  {kpi.value}
                </div>
                <div className="text-xs text-ink/60">{kpi.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 8: FAQ (White Background, 2-col Layout on Desktop) */}
      <section id="faq" className="bg-white border-b border-line py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Left Column: Heading and intro */}
            <div className="lg:col-span-4 min-w-0 space-y-3">
              <h2 className="font-headline font-bold text-2xl sm:text-3xl text-ink">
                Frequently asked questions
              </h2>
              <p className="text-base text-ink/70 leading-relaxed">
                Straight answers about how dispatch, quotes and test payments work.
              </p>
            </div>

            {/* Right Column: Accordion filling full remaining width */}
            <div className="lg:col-span-8 min-w-0 bg-concrete rounded-panel border border-line p-6 sm:p-7">
              <Accordion items={landingSampleData.faqs} defaultOpenId="faq-1" />
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 9: FINAL CTA (Signal Amber Band, Left-Aligned Text) */}
      <section className="bg-amber py-14 lg:py-16 border-b border-line">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-left">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-headline font-extrabold text-2xl sm:text-3xl lg:text-4xl text-ink">
              Need someone today?
            </h2>
            <p className="text-base sm:text-lg text-ink/85 leading-relaxed">
              Book a qualified pro in minutes or sign up to take jobs in your service area.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-start items-start sm:items-center gap-3 pt-1">
            <Button
              variant="secondary"
              size="lg"
              onClick={handleBookClick}
              rightIcon={ArrowRight}
            >
              Book a technician
            </Button>
            <Link href="/register?role=technician">
              <button
                type="button"
                className="px-5 py-2.5 rounded-control border-2 border-ink text-ink font-semibold text-base hover:bg-ink/10 transition-colors"
              >
                Become a technician
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
