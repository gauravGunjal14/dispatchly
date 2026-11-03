'use client';

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { 
  Wrench, 
  Flame, 
  Truck, 
  Clock, 
  MapPin, 
  Zap, 
  DollarSign, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Package
} from 'lucide-react';

const LocationPickerMap = dynamic(() => import('@/components/maps/LocationPickerMap'), { ssr: false });

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
  const [contactPhone, setContactPhone] = useState(user?.phone || '+1 415-555-0101');
  const [location, setLocation] = useState([-122.4194, 37.7749]);
  const [address, setAddress] = useState('750 Market Street, San Francisco, CA 94102');
  const [landmark, setLandmark] = useState('');

  // Delivery-specific details
  const [pickupLocation, setPickupLocation] = useState([-122.4194, 37.7749]);
  const [pickupAddress, setPickupAddress] = useState('750 Market Street, San Francisco, CA');
  const [dropoffLocation, setDropoffLocation] = useState([-122.3994, 37.7849]);
  const [dropoffAddress, setDropoffAddress] = useState('100 1st Street, San Francisco, CA');
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
          setServices(res.data.services || []);
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
    setStep(2);
  };

  const handleSubmitBooking = async () => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const isDelivery = selectedService.category === 'delivery';

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

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Request Field Service</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Step {step} of 4: {step === 1 && 'Select Service'}
            {step === 2 && 'Job Details & Priority'}
            {step === 3 && 'Service Location Pin'}
            {step === 4 && 'Quotation & Confirmation'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step === s
                  ? 'bg-blue-600 text-white'
                  : step > s
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {step > s ? '✓' : s}
            </div>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: SERVICE SELECTION */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Category Tabs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'Plumbing', label: 'Plumbing', icon: Wrench, color: 'text-blue-600 bg-blue-50' },
              { id: 'HVAC', label: 'HVAC', icon: Flame, color: 'text-orange-600 bg-orange-50' },
              { id: 'Delivery', label: 'Urgent Delivery', icon: Truck, color: 'text-emerald-600 bg-emerald-50' },
            ].map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedCategory(id)}
                className={`p-4 rounded-2xl border text-center flex flex-col items-center space-y-2 transition ${
                  selectedCategory.toLowerCase() === id.toLowerCase()
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm text-slate-800">{label}</span>
              </button>
            ))}
          </div>

          {/* Service Cards */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-800">
              Available {selectedCategory} Services
            </h2>

            {loadingServices ? (
              <div className="p-12 text-center text-slate-400">Loading service catalogue...</div>
            ) : filteredServices.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border">
                No active services found in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredServices.map((service) => (
                  <div
                    key={service._id}
                    onClick={() => handleSelectService(service)}
                    className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{service.name}</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize whitespace-nowrap">
                          {service.pricingType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {service.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>~{service.estimatedDurationMin} mins</span>
                      </div>

                      <div className="font-bold text-blue-600 text-sm">
                        {service.pricingType === 'fixed' && `$${service.basePrice.toFixed(2)}`}
                        {service.pricingType === 'range' && `$${service.minPrice} - $${service.maxPrice}`}
                        {service.pricingType === 'quotation' && 'Inspection Quote'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: JOB DETAILS & PRIORITY */}
      {step === 2 && selectedService && (
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <span className="font-bold text-lg text-slate-900">{selectedService.name}</span>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full capitalize">
              {selectedService.category}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Describe the Problem / Requirement
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Water leak beneath the kitchen sink; main shutoff valve seems seized."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Priority Radios */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Dispatch Priority & SLA
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`p-4 rounded-xl border cursor-pointer flex items-start space-x-3 transition ${
                  priority === 'normal'
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value="normal"
                  checked={priority === 'normal'}
                  onChange={() => setPriority('normal')}
                  className="mt-1"
                />
                <div>
                  <div className="font-bold text-sm text-slate-900">Standard Response</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Standard guaranteed response & arrival SLA. No surcharge applied.
                  </div>
                </div>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer flex items-start space-x-3 transition ${
                  priority === 'urgent'
                    ? 'border-amber-500 bg-amber-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="priority"
                  value="urgent"
                  checked={priority === 'urgent'}
                  onChange={() => setPriority('urgent')}
                  className="mt-1"
                />
                <div>
                  <div className="font-bold text-sm text-amber-900 flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>Urgent Emergency Priority</span>
                  </div>
                  <div className="text-xs text-amber-800 mt-0.5">
                    Fastest technician matching (20% priority surcharge applied to estimate).
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Delivery Specifics */}
          {selectedService.category === 'delivery' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Package Weight (kg)
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="1000"
                  step="0.5"
                  value={packageWeightKg}
                  onChange={(e) => setPackageWeightKg(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Package Contents Summary
                </label>
                <input
                  type="text"
                  value={packageDescription}
                  onChange={(e) => setPackageDescription(e.target.value)}
                  placeholder="Legal contracts, replacement compressor parts, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Contact Phone for Technician
            </label>
            <input
              type="tel"
              required
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold hover:bg-slate-50"
            >
              &larr; Change Service
            </button>
            <button
              type="button"
              disabled={!description.trim() || !contactPhone.trim()}
              onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow disabled:opacity-50"
            >
              Set Location &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: LOCATION PICKING */}
      {step === 3 && selectedService && (
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {selectedService.category === 'delivery'
                ? 'Set Pickup and Drop-off Points'
                : 'Confirm Service Location'}
            </h2>
            <p className="text-xs text-slate-500">
              Drop pin precisely so the dispatch engine can calculate accurate road travel times.
            </p>
          </div>

          {selectedService.category === 'delivery' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
                    Pickup Address
                  </label>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-blue-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
                    Drop-off Address
                  </label>
                  <input
                    type="text"
                    value={dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-emerald-300 text-sm"
                  />
                </div>
              </div>

              <LocationPickerMap
                mode="delivery"
                pickupLocation={pickupLocation}
                dropoffLocation={dropoffLocation}
                onPickupChange={(coords) => setPickupLocation(coords)}
                onDropoffChange={(coords) => setDropoffLocation(coords)}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <LocationPickerMap
                mode="single"
                location={location}
                onLocationChange={(coords) => setLocation(coords)}
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Landmark / Unit Number / Gate Code (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Unit 4B, ring doorbell #12"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold hover:bg-slate-50"
            >
              &larr; Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow"
            >
              View Estimate & Review &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: QUOTATION & CONFIRMATION */}
      {step === 4 && selectedService && (
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-slate-900">Review & Confirm Dispatch Request</h2>
            <p className="text-xs text-slate-500">
              Verify your booking details and review the estimated price calculation.
            </p>
          </div>

          {/* Pricing Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-blue-700">Estimated Pricing</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {estimate?.quotationRequired ? (
                    <span className="text-lg text-blue-900 font-bold">On-Site Inspection Quotation</span>
                  ) : estimate?.type === 'range' ? (
                    `$${estimate.estimatedMin.toFixed(2)} - $${estimate.estimatedMax.toFixed(2)}`
                  ) : (
                    `$${estimate?.baseAmount?.toFixed(2) || '0.00'}`
                  )}
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-blue-800 shadow-sm border border-blue-200 capitalize">
                Priority: {priority}
              </span>
            </div>

            {estimate?.breakdown && !estimate.quotationRequired && (
              <div className="text-xs text-slate-600 border-t border-blue-200/60 pt-2 space-y-1">
                {estimate.distanceKm > 0 && (
                  <div className="flex justify-between">
                    <span>Transit Distance ({estimate.distanceKm} km):</span>
                    <span className="font-semibold">+${estimate.breakdown.distanceFee.toFixed(2)}</span>
                  </div>
                )}
                {estimate.urgentSurcharge > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Urgent Priority Dispatch (+20%):</span>
                    <span className="font-semibold">+${estimate.urgentSurcharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                  <span>Standard Platform Fee:</span>
                  <span>Included ($1.50 charged upon job completion)</span>
                </div>
              </div>
            )}
          </div>

          {/* Summary Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase">Service Details</span>
              <div className="font-bold text-slate-800 text-sm">{selectedService.name}</div>
              <p className="text-slate-600">{description}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase">Destination Address</span>
              <div className="font-bold text-slate-800 text-sm">
                {selectedService.category === 'delivery' ? pickupAddress : address}
              </div>
              <div className="text-slate-500">Contact: {contactPhone}</div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-xl border text-slate-600 text-sm font-semibold hover:bg-slate-50"
            >
              &larr; Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitBooking}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow transition disabled:opacity-50"
            >
              {submitting ? 'Initiating Dispatch...' : 'Confirm Request & Match Technician'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading booking portal...</div>}>
      <BookingWizard />
    </Suspense>
  );
}
