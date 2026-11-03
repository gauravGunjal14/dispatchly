'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api';
import { 
  Wrench, 
  MapPin, 
  Truck, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  Save, 
  Clock, 
  ShieldCheck,
  Eye
} from 'lucide-react';

// Dynamically import map to disable SSR
const ServiceAreaMap = dynamic(() => import('@/components/maps/ServiceAreaMap'), { ssr: false });

export default function TechnicianProfilePage() {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Form State
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState(['plumbing']);
  const [skillsText, setSkillsText] = useState('pipe_repair, leak_detection');
  const [qualificationsText, setQualificationsText] = useState('Certified Master Plumber');
  const [experienceYears, setExperienceYears] = useState(3);
  const [serviceCenter, setServiceCenter] = useState([-122.4194, 37.7749]); // [lng, lat]
  const [radiusKm, setRadiusKm] = useState(25);
  const [vehicleType, setVehicleType] = useState('none');
  const [packageCapacityKg, setPackageCapacityKg] = useState(0);
  const [workingHours, setWorkingHours] = useState({ start: '08:00', end: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] });
  const [documents, setDocuments] = useState([]);

  // Upload Form State
  const [docType, setDocType] = useState('id_proof');
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiClient('/technicians/me/profile');
      if (res.success && res.data) {
        const p = res.data.profile;
        setProfile(p);
        setCategories(p.serviceCategories || ['plumbing']);
        setSkillsText((p.skills || []).join(', '));
        setQualificationsText((p.qualifications || []).join(', '));
        setExperienceYears(p.experienceYears || 1);
        if (p.serviceArea?.center?.coordinates) {
          setServiceCenter(p.serviceArea.center.coordinates);
        }
        if (p.serviceArea?.radiusKm) {
          setRadiusKm(p.serviceArea.radiusKm);
        }
        setVehicleType(p.vehicleType || 'none');
        setPackageCapacityKg(p.packageCapacityKg || 0);
        if (p.workingHours) {
          setWorkingHours(p.workingHours);
        }
        setDocuments(res.data.documents || []);
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to load profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleCategoryToggle = (cat) => {
    if (categories.includes(cat)) {
      if (categories.length > 1) {
        setCategories(categories.filter((c) => c !== cat));
      }
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const skills = skillsText.split(',').map((s) => s.trim()).filter(Boolean);
      const qualifications = qualificationsText.split(',').map((q) => q.trim()).filter(Boolean);

      // Normalize longitude to [-180, 180] and latitude to [-90, 90]
      let lng = Number(serviceCenter[0]);
      let lat = Number(serviceCenter[1]);
      lng = Number((((lng + 180) % 360 + 360) % 360 - 180).toFixed(6));
      lat = Number(Math.max(-90, Math.min(90, lat)).toFixed(6));

      const payload = {
        serviceCategories: categories,
        skills,
        qualifications,
        experienceYears: Number(experienceYears),
        serviceArea: {
          center: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          radiusKm: Number(radiusKm),
        },
        vehicleType,
        packageCapacityKg: Number(packageCapacityKg),
        workingHours,
      };

      const res = await apiClient('/technicians/me/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      // If user selected a document at Stage 4, upload it automatically as well
      if (selectedFile) {
        try {
          const formData = new FormData();
          formData.append('file', selectedFile);
          formData.append('docType', docType);

          const token = localStorage.getItem('dispatchly_access_token');
          const uploadRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/technicians/me/documents`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            }
          );
          if (!uploadRes.ok) {
            const errData = await uploadRes.json();
            throw new Error(errData.error?.message || 'Document upload failed');
          }
          setSelectedFile(null);
        } catch (uploadErr) {
          console.error('Auto upload error:', uploadErr);
          throw new Error('Profile saved, but document upload failed: ' + uploadErr.message);
        }
      }

      if (res.success) {
        setProfile(res.data.profile);
        await fetchProfile();
        setMessage({ text: 'Profile & documents saved successfully! Status is pending verification.', type: 'success' });
      }
    } catch (err) {
      setMessage({ text: err.message || 'Error updating profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Attach a valid dummy PDF for testing without local files
  const handleAttachSampleDoc = () => {
    const pdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF';
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const file = new File([blob], 'trade_license_demo.pdf', { type: 'application/pdf' });
    setSelectedFile(file);
    setDocType('trade_license');
    setMessage({ text: 'Sample trade license PDF attached! Click "Upload Document" or "Save Profile" to submit.', type: 'info' });
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage({ text: 'Please select a file to upload', type: 'error' });
      return;
    }

    setUploading(true);
    setMessage({ text: '', type: '' });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('docType', docType);

      const token = localStorage.getItem('dispatchly_access_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/technicians/me/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.error?.message || 'Failed to upload document');
      }

      setMessage({ text: 'Document uploaded successfully!', type: 'success' });
      setSelectedFile(null);
      fetchProfile();
    } catch (err) {
      setMessage({ text: err.message || 'Error uploading document', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDoc = async (docId, fileName) => {
    try {
      const token = localStorage.getItem('dispatchly_access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/technicians/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to download');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error downloading document: ' + err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading technician profile...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Technician Onboarding & Profile</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete your qualifications, service coverage area, and documents for dispatch eligibility
          </p>
        </div>

        {/* Verification Status Badge */}
        <div>
          {profile?.verificationStatus === 'approved' && (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-sm font-bold">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Verified & Approved</span>
            </div>
          )}
          {profile?.verificationStatus === 'pending' && (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-sm font-bold">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Pending Admin Review</span>
            </div>
          )}
          {profile?.verificationStatus === 'rejected' && (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-red-100 text-red-800 border border-red-300 text-sm font-bold">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>Verification Rejected</span>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Notification Banner */}
      {profile?.verificationStatus === 'rejected' && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm space-y-1">
          <div className="font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>Reason for Rejection:</span>
          </div>
          <p className="pl-6">{profile.rejectionReason || 'Please review your uploaded documents and qualifications.'}</p>
          <p className="pl-6 text-xs text-red-600 font-semibold mt-1">
            &bull; Saving changes below will automatically resubmit your profile for review.
          </p>
        </div>
      )}

      {message.text && (
        <div
          className={`p-4 rounded-xl border text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Step Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveStep(1)}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
            activeStep === 1 ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>1. Skills & Qualifications</span>
        </button>

        <button
          onClick={() => setActiveStep(2)}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
            activeStep === 2 ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>2. Service Area & HQ</span>
        </button>

        <button
          onClick={() => setActiveStep(3)}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
            activeStep === 3 ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>3. Vehicle & Load</span>
        </button>

        <button
          onClick={() => setActiveStep(4)}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
            activeStep === 4 ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>4. Documents & Licensing</span>
        </button>
      </div>

      {/* Step Content */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        {/* STEP 1 */}
        {activeStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Service Categories Provided
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'plumbing', label: 'Plumbing', icon: Wrench },
                  { id: 'hvac', label: 'HVAC', icon: ShieldCheck },
                  { id: 'delivery', label: 'Urgent Delivery', icon: Truck },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleCategoryToggle(id)}
                    className={`p-4 rounded-xl border flex items-center space-x-3 transition ${
                      categories.includes(id)
                        ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Experience (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Professional Certifications (Comma-separated)
                </label>
                <input
                  type="text"
                  value={qualificationsText}
                  onChange={(e) => setQualificationsText(e.target.value)}
                  placeholder="Master Plumber, EPA 608 Universal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Specific Technical Skills (Comma-separated)
              </label>
              <textarea
                rows={3}
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="copper_soldering, leak_detection, compressor_diagnosis, freight_handling"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                The dispatch engine matches these skill tags against customer job requirements.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {activeStep === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Service Coverage Radius</h3>
                <p className="text-xs text-slate-500">
                  Jobs originating outside your coverage circle will be filtered out by the dispatch engine.
                </p>
              </div>

              <div className="flex items-center space-x-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-600">Coverage Radius:</span>
                <span className="text-sm font-black text-blue-600">{radiusKm} km</span>
              </div>
            </div>

            <div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>5 km (Local)</span>
                <span>50 km (Metro)</span>
                <span>100 km (Regional)</span>
              </div>
            </div>

            <ServiceAreaMap
              center={serviceCenter}
              radiusKm={radiusKm}
              onLocationChange={(newCenter) => setServiceCenter(newCenter)}
            />

            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Dispatch Origin: Longitude: {serviceCenter[0].toFixed(4)}, Latitude: {serviceCenter[1].toFixed(4)}
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {activeStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Vehicle & Delivery Specifications</h3>
              <p className="text-xs text-slate-500">
                Required for Urgent Delivery partners and mobile service technicians.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vehicle Type
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">None / Public Transit</option>
                  <option value="motorcycle">Motorcycle / Scooter</option>
                  <option value="car">Sedan / Hatchback</option>
                  <option value="van">Cargo Van</option>
                  <option value="pickup">Pickup Truck</option>
                  <option value="bicycle">Bicycle</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Package Capacity (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  max="2000"
                  value={packageCapacityKg}
                  onChange={(e) => setPackageCapacityKg(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {activeStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Document Verification</h3>
              <p className="text-xs text-slate-500">
                Upload your ID and trade credentials. Admin approval is required before you can receive job offers.
              </p>
            </div>

            {/* Quick Sample Document Generator */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="text-xs text-blue-800">
                <span className="font-bold">Need a demo file?</span> Click below to attach a pre-validated dummy trade license PDF.
              </div>
              <button
                type="button"
                onClick={handleAttachSampleDoc}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap shadow-sm transition"
              >
                Attach Sample License (PDF)
              </button>
            </div>

            {/* Upload Box */}
            <form onSubmit={handleUploadDocument} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Document Type
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  >
                    <option value="id_proof">Government ID / Passport</option>
                    <option value="trade_license">Trade License / Plumbing or HVAC License</option>
                    <option value="insurance">Liability Insurance Certificate</option>
                    <option value="vehicle_registration">Vehicle Registration / Insurance</option>
                    <option value="certification">Technical Certification</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select File (PDF, JPG, PNG up to 5MB)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
              </button>
            </form>

            {/* Uploaded Documents List */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-800">Uploaded Documents ({documents.length})</h4>
              {documents.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                  No documents uploaded yet. Upload your government ID and trade license to get verified.
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc._id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">{doc.originalName}</div>
                          <div className="text-xs text-slate-400 capitalize">
                            {doc.docType.replace('_', ' ')} &bull; {(doc.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                            doc.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : doc.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {doc.status}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(doc._id, doc.originalName)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            Step {activeStep} of 4
          </div>

          <div className="flex items-center space-x-3">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep - 1)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Previous
              </button>
            )}

            {activeStep < 4 ? (
              <button
                type="button"
                onClick={() => setActiveStep(activeStep + 1)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow"
              >
                Next Step &rarr;
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
