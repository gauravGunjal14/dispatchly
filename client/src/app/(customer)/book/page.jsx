'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { DEFAULT_MAP_CENTER } from '@/lib/config';
import { Button, StatusPill } from '@/components/ui';
import { 
  Wrench, 
  Snowflake, 
  Truck, 
  Clock, 
  MapPin, 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft,
  Check,
  AlertCircle,
  FileText
} from 'lucide-react';

const BrandMap = dynamic(() => import('@/components/map/BrandMap'), { ssr: false });

function BookingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'Plumbing');
  const [loadingServices, setLoadingServices] = useState(true);

  // Form Details
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [contactPhone, setContactPhone] = useState(user?.phone || '+91 98200 00101');
  const [location, setLocation] = useState(DEFAULT_MAP_CENTER.coordinates);
  const [address, setAddress] = useState('Andheri West, Link Road, Mumbai 400053');
  const [landmark, setLandmark] = useState('');

  // Delivery-specific details
  const [pickupLocation, setPickupLocation] = useState(DEFAULT_MAP_CENTER.coordinates);
  const [pickupAddress, setPickupAddress] = useState('Andheri West, Link Road, Mumbai');
  const [dropoffLocation, setDropoffLocation] = useState(DEFAULT_MAP_CENTER.dropoffCoordinates);
  const [dropoffAddress, setDropoffAddress] = useState('Bandra Kurla Complex, Mumbai');
  const [packageWeightKg, setPackageWeightKg] = useState(5);
  const [packageDescription, setPackageDescription] = useState('');

  // Estimate & State
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [idempotencyKey] = useState(() => 'idemp_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now());

  // Fetch Services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const res = await apiClient('/services');
        if (res.success && res.data) {
          const fetchedServices = res.data.services || [];
          setServices(fetchedServices);

          // Pre-select the first fixed-price (or non-quotation) service matching the category
          const matched =
            fetchedServices.find(
              (s) => s.category.toLowerCase() === selectedCategory.toLowerCase() && s.pricingType === 'fixed'
            ) ||
            fetchedServices.find(
              (s) => s.category.toLowerCase() === selectedCategory.toLowerCase() && s.pricingType !== 'quotation'
            ) ||
            null;
          if (!selectedService) {
            setSelectedService(matched);
          }
        }
      } catch (err) {
        setErrorMessage(err.message || 'Failed to load services catalogue');
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  // Recalculate price estimate when stepping into step 4 or changing service/priority
  useEffect(() => {
    if (!selectedService) return;

    const fetchEstimate = async () => {
      try {
        setEstimating(true);
        const res = await apiClient('/bookings/estimate', {
          method: 'POST',
          body: JSON.stringify({
            serviceId: selectedService._id,
            priority,
            pickupLocation: {
              type: 'Point',
              coordinates: pickupLocation,
              address: pickupAddress,
            },
            dropoffLocation: {
              type: 'Point',
              coordinates: dropoffLocation,
              address: dropoffAddress,
            },
          }),
        });
        if (res.success) {
          setEstimate(res.data.estimate);
        }
      } catch (err) {
        console.error('Estimate failed', err);
      } finally {
        setEstimating(false);
      }
    };

    fetchEstimate();
  }, [selectedService, priority, pickupLocation, dropoffLocation]);

  const handleSelectService = (service) => {
    setSelectedService(service);
  };

  const handleSubmitBooking = async () => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const isDelivery = selectedService.category.toLowerCase() === 'delivery';

      const payload = {
        serviceId: selectedService._id,
        description,
        priority,
        contactPhone,
        location: {
          type: 'Point',
          coordinates: isDelivery ? pickupLocation : location,
          address: isDelivery ? pickupAddress : address,
          landmark,
        },
        ...(isDelivery && {
          pickupLocation: {
            type: 'Point',
            coordinates: pickupLocation,
            address: pickupAddress,
          },
          dropoffLocation: {
            type: 'Point',
            coordinates: dropoffLocation,
            address: dropoffAddress,
          },
          packageWeightKg: Number(packageWeightKg),
          packageDescription,
        }),
        idempotencyKey,
      };

      const res = await apiClient('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data?.booking) {
        router.push(`/bookings/${res.data.booking._id}`);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to confirm booking');
      setSubmitting(false);
    }
  };

  const filteredServices = services.filter(
    (s) => s.category.toLowerCase() === selectedCategory.toLowerCase()
  );

  const stepsList = [
    { number: 1, title: 'Service' },
    { number: 2, title: 'Job details' },
    { number: 3, title: 'Location' },
    { number: 4, title: 'Confirmation' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 text-ink">
      {/* Stepper Header */}
      <div className="space-y-4 pb-4 border-b border-line">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="space-y-0.5">
            <h1 className="font-headline font-bold text-2xl sm:text-3xl text-ink">
              Book a service
            </h1>
            <p className="text-sm text-ink/70">
              Matched by technician skill, parts in stock, and arrival deadline.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-control bg-concrete text-ink font-semibold self-start sm:self-auto">
            Step {step} of 4: {stepsList[step - 1].title}
          </span>
        </div>

        {/* Stepper Indicators */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {stepsList.map((s) => {
            const isCompleted = step > s.number;
            const isCurrent = step === s.number;
            return (
              <div
                key={s.number}
                className={`py-2 px-3 rounded-control border text-left transition ${
                  isCurrent
                    ? 'bg-ink text-white border-ink'
                    : isCompleted
                    ? 'bg-concrete text-ink border-line'
                    : 'bg-white text-ink/70 border-line'
                }`}
              >
                <div className="text-[11px] font-mono">
                  {isCompleted ? 'Done' : `0${s.number}`}
                </div>
                <div className="text-xs font-semibold truncate mt-0.5">
                  {s.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-control bg-status-danger-tint border border-status-danger/30 text-status-danger-text text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-status-danger" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main 2-column Grid: Form (8 cols) + Sticky Summary Panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Form Steps */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          
          {/* STEP 1: SERVICE SELECTION */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Category Selector Tabs */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-ink">
                  Select service category
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'Plumbing', label: 'Plumbing', icon: Wrench },
                    { id: 'HVAC', label: 'AC and HVAC', icon: Snowflake },
                    { id: 'Delivery', label: 'Urgent delivery', icon: Truck },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(id);
                        const matched =
                          services.find((s) => s.category.toLowerCase() === id.toLowerCase() && s.pricingType === 'fixed') ||
                          services.find((s) => s.category.toLowerCase() === id.toLowerCase() && s.pricingType !== 'quotation') ||
                          null;
                        setSelectedService(matched);
                      }}
                      className={`p-3.5 rounded-control border text-left flex flex-col items-start gap-2 transition ${
                        selectedCategory.toLowerCase() === id.toLowerCase()
                          ? 'bg-ink text-white border-ink'
                          : 'bg-white text-ink border-line hover:bg-concrete'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.75} />
                      <span className="text-xs sm:text-sm font-semibold">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Cards */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="font-headline font-bold text-base text-ink">
                    Available {selectedCategory} services
                  </h2>
                  <span className="text-xs text-ink/60">
                    {filteredServices.length} options
                  </span>
                </div>

                {loadingServices ? (
                  <div className="p-8 text-center text-ink/60 bg-white rounded-panel border border-line text-sm">
                    Loading services catalogue...
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="p-8 text-center text-ink/60 bg-white rounded-panel border border-line text-sm">
                    No active services found in this category.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredServices.map((service) => {
                      const isSelected = selectedService?._id === service._id;
                      return (
                        <div
                          key={service._id}
                          onClick={() => handleSelectService(service)}
                          className={`p-4 rounded-control border cursor-pointer transition flex flex-col justify-between space-y-3 ${
                            isSelected
                              ? 'bg-white border-ink ring-1 ring-ink'
                              : 'bg-white border-line hover:border-ink/60 hover:bg-concrete/30'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-bold text-sm text-ink leading-tight">
                                {service.name}
                              </h3>
                              {isSelected && (
                                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-control bg-ink text-white flex-shrink-0">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ink/70 line-clamp-2 leading-relaxed">
                              {service.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-line/60 flex justify-between items-center text-xs">
                            <span className="text-ink/60 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-ink/50" />
                              <span>~{service.estimatedDurationMin} mins</span>
                            </span>
                            <span className="font-semibold text-ink">
                              {service.pricingType === 'fixed' && formatMoney(service.basePrice)}
                              {service.pricingType === 'range' && `${formatMoney(service.minPrice)} – ${formatMoney(service.maxPrice)}`}
                              {service.pricingType === 'quotation' && 'Quote after inspection'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 1 Actions: One Primary Amber Button */}
              <div className="pt-4 border-t border-line flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  disabled={!selectedService}
                  onClick={() => setStep(2)}
                  rightIcon={ArrowRight}
                >
                  Continue to job details
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: JOB DETAILS & PRIORITY */}
          {step === 2 && selectedService && (
            <div className="bg-white rounded-panel border border-line p-6 space-y-6">
              <div className="space-y-1 border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-control bg-concrete text-ink font-semibold">
                    {selectedService.category}
                  </span>
                  <h2 className="font-headline font-bold text-lg text-ink">
                    {selectedService.name}
                  </h2>
                </div>
                <p className="text-xs text-ink/70">
                  Provide details so we can match a technician with the right parts and tools in their van.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">
                  Describe the problem or requirements
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Water leak beneath the kitchen sink; main shutoff valve seems seized."
                  className="w-full px-3.5 py-2.5 rounded-control border border-line bg-white text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 transition"
                />
              </div>

              {/* Dispatch Priority */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-ink">
                  Arrival deadline and dispatch priority
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-4 rounded-control border cursor-pointer flex items-start gap-3 transition ${
                      priority === 'normal'
                        ? 'bg-white border-ink ring-1 ring-ink'
                        : 'bg-white border-line hover:bg-concrete/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value="normal"
                      checked={priority === 'normal'}
                      onChange={() => setPriority('normal')}
                      className="mt-0.5 text-ink focus:ring-ink"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs sm:text-sm font-bold text-ink">
                        Standard response
                      </div>
                      <div className="text-xs text-ink/70">
                        Arrival deadline within standard window. No surcharge applied.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-4 rounded-control border cursor-pointer flex items-start gap-3 transition ${
                      priority === 'urgent'
                        ? 'bg-white border-ink ring-1 ring-ink'
                        : 'bg-white border-line hover:bg-concrete/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value="urgent"
                      checked={priority === 'urgent'}
                      onChange={() => setPriority('urgent')}
                      className="mt-0.5 text-ink focus:ring-ink"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs sm:text-sm font-bold text-ink flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-ink" />
                        <span>Urgent emergency priority</span>
                      </div>
                      <div className="text-xs text-ink/70">
                        Fastest matching with high priority dispatch offer (20% surcharge).
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Delivery Specifics */}
              {selectedService.category.toLowerCase() === 'delivery' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-line">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-ink">
                      Package weight (kg)
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      max="1000"
                      step="0.5"
                      value={packageWeightKg}
                      onChange={(e) => setPackageWeightKg(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-control border border-line bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-ink">
                      Package contents summary
                    </label>
                    <input
                      type="text"
                      value={packageDescription}
                      onChange={(e) => setPackageDescription(e.target.value)}
                      placeholder="e.g. Replacement valve hardware"
                      className="w-full px-3.5 py-2.5 rounded-control border border-line bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 transition"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-ink">
                  Contact phone for technician
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-control border border-line bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 transition"
                />
              </div>

              {/* Step 2 Actions */}
              <div className="pt-4 border-t border-line flex justify-between items-center">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setStep(1)}
                  leftIcon={ArrowLeft}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={!description.trim() || !contactPhone.trim()}
                  onClick={() => setStep(3)}
                  rightIcon={ArrowRight}
                >
                  Continue to location
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: LOCATION PICKING */}
          {step === 3 && selectedService && (
            <div className="bg-white rounded-panel border border-line p-6 space-y-6">
              <div className="space-y-1 border-b border-line pb-4">
                <h2 className="font-headline font-bold text-lg text-ink">
                  {selectedService.category.toLowerCase() === 'delivery'
                    ? 'Set pickup and drop-off points'
                    : 'Confirm service location'}
                </h2>
                <p className="text-xs text-ink/70">
                  {selectedService.category.toLowerCase() === 'delivery'
                    ? 'Set where we should pick up and where to deliver, so we can find a nearby courier.'
                    : 'Set your service location so we can find a nearby technician and estimate travel time.'}
                </p>
              </div>

              {selectedService.category.toLowerCase() === 'delivery' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-ink">
                        Pickup address
                      </label>
                      <input
                        type="text"
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-control border border-line bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-ink">
                        Drop-off address
                      </label>
                      <input
                        type="text"
                        value={dropoffAddress}
                        onChange={(e) => setDropoffAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-control border border-line bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 transition"
                      />
                    </div>
                  </div>

                  {/* BrandMap Delivery Picker */}
                  <BrandMap
                    mode="delivery-picker"
                    pickupCoords={pickupLocation}
                    dropoffCoords={dropoffLocation}
                    onPickupChange={(coords) => setPickupLocation(coords)}
                    onDropoffChange={(coords) => setDropoffLocation(coords)}
                    showPresets={true}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-ink">
                      Street address & quick Mumbai area presets
                    </label>
                    <BrandMap
                      mode="picker"
                      customerCoords={location}
                      onLocationChange={(coords) => setLocation(coords)}
                      address={address}
                      onAddressChange={setAddress}
                      showPresets={true}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-ink">
                      Unit, landmark, or gate code (optional)
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Apt 4B, ring doorbell"
                      className="w-full px-3.5 py-2.5 rounded-control border border-line bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 transition"
                    />
                  </div>
                </div>
              )}

              {/* Step 3 Actions */}
              <div className="pt-4 border-t border-line flex justify-between items-center">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setStep(2)}
                  leftIcon={ArrowLeft}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setStep(4)}
                  rightIcon={ArrowRight}
                >
                  Continue to review
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRMATION */}
          {step === 4 && selectedService && (
            <div className="bg-white rounded-panel border border-line p-6 space-y-6">
              <div className="space-y-1 border-b border-line pb-4">
                <h2 className="font-headline font-bold text-lg text-ink">
                  Review and confirm dispatch request
                </h2>
                <p className="text-xs text-ink/70">
                  Please verify your service details before dispatch matching begins.
                </p>
              </div>

              {/* Summary Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="p-4 rounded-control bg-concrete/50 border border-line space-y-1">
                  <span className="text-ink/60 font-semibold block text-xs">Service</span>
                  <div className="font-bold text-ink">{selectedService.name}</div>
                  <p className="text-ink/70 mt-1">{description}</p>
                </div>

                <div className="p-4 rounded-control bg-concrete/50 border border-line space-y-1">
                  <span className="text-ink/60 font-semibold block text-xs">Location</span>
                  <div className="font-bold text-ink">
                    {selectedService.category.toLowerCase() === 'delivery' ? pickupAddress : address}
                  </div>
                  {landmark && <p className="text-ink/70">{landmark}</p>}
                  <p className="text-ink/60 mt-1">Contact: {contactPhone}</p>
                </div>
              </div>

              <div className="p-4 rounded-control bg-concrete border border-line space-y-2 text-xs">
                <div className="font-semibold text-ink flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-ink" />
                  <span>How your booking proceeds:</span>
                </div>
                <ul className="space-y-1 text-ink/80 list-disc list-inside">
                  <li>We send an offer to the best-fit qualified technician.</li>
                  <li>Technicians have 60 seconds to accept before auto-reassignment to the next candidate.</li>
                  <li>You will track your technician live on the map with expected arrival time.</li>
                  <li>For diagnostic jobs, you review and approve an itemised quote before any work starts.</li>
                </ul>
              </div>

              {/* Step 4 Actions */}
              <div className="pt-4 border-t border-line flex justify-between items-center">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setStep(3)}
                  leftIcon={ArrowLeft}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  disabled={submitting}
                  onClick={handleSubmitBooking}
                >
                  {submitting ? 'Matching technician...' : 'Confirm and request technician'}
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Sticky Summary Panel with Live Estimate */}
        <div className="lg:col-span-4 min-w-0">
          <div className="sticky top-24 bg-white rounded-panel border border-line p-5 space-y-5">
            <div className="space-y-1 border-b border-line pb-3">
              <span className="text-xs font-semibold text-ink/60 block">
                Booking summary
              </span>
              <h3 className="font-headline font-bold text-base text-ink truncate">
                {selectedService?.name || 'Select a service'}
              </h3>
            </div>

            {/* Price Estimate Card */}
            <div className="p-4 rounded-control bg-concrete/60 border border-line space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-ink/70">
                  Estimated price
                </span>
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-control bg-white text-ink border border-line">
                  {priority === 'urgent' ? 'Urgent response' : 'Normal response'}
                </span>
              </div>

              <div className="text-xl sm:text-2xl font-headline font-bold text-ink tabular-nums">
                {estimating ? (
                  <span className="text-sm font-normal text-ink/60">Calculating...</span>
                ) : estimate?.quotationRequired || selectedService?.pricingType === 'quotation' ? (
                  <span className="text-base text-ink">Quote after inspection</span>
                ) : estimate?.type === 'range' ? (
                  `${formatMoney(estimate.estimatedMin)} – ${formatMoney(estimate.estimatedMax)}`
                ) : (
                  formatMoney(estimate?.baseAmount || selectedService?.basePrice || 0)
                )}
              </div>

              {estimate?.quotationRequired ? (
                <p className="text-xs text-ink/70 border-t border-line/60 pt-2 leading-relaxed">
                  Technician diagnoses on site. You approve an itemised quote before work begins.
                </p>
              ) : estimate?.breakdown ? (
                <div className="text-xs text-ink/70 border-t border-line/60 pt-2 space-y-1">
                  {estimate.distanceKm > 0 && (
                    <div className="flex justify-between">
                      <span>Travel distance ({estimate.distanceKm} km):</span>
                      <span className="font-semibold text-ink">{formatMoney(estimate.breakdown.distanceFee)}</span>
                    </div>
                  )}
                  {estimate.urgentSurcharge > 0 && (
                    <div className="flex justify-between font-semibold text-ink">
                      <span>Urgent dispatch (+20%):</span>
                      <span>+{formatMoney(estimate.urgentSurcharge)}</span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Target Arrival Notice */}
            <div className="flex items-center gap-2 text-xs font-semibold text-ink">
              <Clock className="w-4 h-4 text-ink/60 flex-shrink-0" />
              <span>Target arrival time: about 2 hours.</span>
            </div>

            {/* Test Mode Banner */}
            <div className="p-3 rounded-control bg-concrete border border-line text-xs space-y-1 text-ink/80">
              <div className="font-semibold text-ink">Test mode active</div>
              <div>No real money is charged. Payment is settled in mock mode upon completion.</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto py-16 text-center text-ink/60">Loading booking wizard...</div>}>
      <BookingWizard />
    </Suspense>
  );
}
