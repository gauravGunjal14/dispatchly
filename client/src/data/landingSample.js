// Neutral sample data for landing page demonstrations
// Centralized to allow future regionalization without hardcoded currencies or addresses

export const landingSampleData = {
  heroDispatch: {
    badge: 'Example',
    requestTitle: 'Emergency Pipe Leak Repair',
    ticketNumber: 'Ticket 3104',
    jobDetail: 'Kitchen sink pipe leaking',
    slaWindow: 'Fits 2-hour window',
    technicians: [
      {
        id: 'tech-1',
        name: 'Carlos M.',
        initials: 'CM',
        score: 94,
        isTopMatch: true,
        etaMinutes: 4,
        chips: ['4 min away', 'Valve in stock', 'Fits 2-hr window'],
        factorScores: [
          { label: 'SLA feasibility', percentage: 98, isTop: true },
          { label: 'Location and travel', percentage: 92, isTop: false },
          { label: 'Parts in van', percentage: 95, isTop: false },
        ],
        vanPartsInStock: true,
      },
      {
        id: 'tech-2',
        name: 'Lisa C.',
        initials: 'LC',
        score: 81,
        isTopMatch: false,
        etaMinutes: 9,
        chips: ['9 min away', 'Valve in stock'],
        vanPartsInStock: true,
      },
      {
        id: 'tech-3',
        name: 'Sam T.',
        initials: 'ST',
        score: 68,
        isTopMatch: false,
        etaMinutes: 14,
        chips: ['14 min away', 'Low parts stock'],
        vanPartsInStock: false,
      },
    ],
    offerStatus: 'Offer sent, 60 seconds to respond',
    offerCountdownSeconds: 54,
  },

  matchingFactors: [
    { label: 'SLA feasibility', percentage: 30, isTop: true },
    { label: 'Location and travel time', percentage: 25, isTop: false },
    { label: 'Skills and experience', percentage: 15, isTop: false },
    { label: 'Workload', percentage: 10, isTop: false },
    { label: 'Parts and equipment', percentage: 10, isTop: false },
    { label: 'Reliability and ratings', percentage: 10, isTop: false },
  ],

  technicianOfferExample: {
    badge: 'Example',
    serviceTitle: 'Emergency Pipe Leak Repair',
    distanceText: '3.2 km travel distance',
    noticeText: 'Payout and required parts are shown before you accept.',
    requiredPart: 'Brass ball valve 3/4" (in van stock)',
  },

  operatorKpis: {
    badge: 'Example',
    metrics: [
      { label: 'Dispatch success rate', value: '94.2%', sublabel: 'Automated match' },
      { label: 'SLA compliance rate', value: '98.1%', sublabel: 'On-time arrival' },
      { label: 'Average arrival time', value: '18 min', sublabel: 'Assigned to site' },
      { label: 'Active operations', value: '14 units', sublabel: 'Live fleet active' },
    ],
  },

  trustPractices: [
    {
      lead: 'Technicians are verified.',
      description: 'Our team reviews trade licenses and ID documents before anyone can take jobs.',
      icon: 'ShieldCheck',
    },
    {
      lead: 'Know the price first.',
      description: 'Upfront estimates for standard tasks, or an itemised quote you approve before work starts.',
      icon: 'FileText',
    },
    {
      lead: 'Proof of work.',
      description: 'Completion notes, inspection photos and replacement parts attached to each ticket.',
      icon: 'CheckSquare',
    },
    {
      lead: 'If something goes wrong.',
      description: 'Raise a dispute directly from your booking and our operations desk reviews it.',
      icon: 'AlertCircle',
    },
    {
      lead: 'Pay after verification.',
      description: 'You confirm the job is finished before payment is settled in test mode.',
      icon: 'CreditCard',
    },
  ],

  servicesCatalogue: {
    plumbing: {
      category: 'Plumbing',
      description: 'Emergency pipe leaks, valve replacements, fixture diagnostics and drain clearing.',
      items: [
        'Emergency Pipe Leak Repair',
        'Drain Cleaning',
        'Main Shutoff Valve Replacement',
        'Bathroom Remodel (by quote)',
      ],
      actionText: 'Book plumbing',
      routeParam: 'plumbing',
    },
    hvac: {
      category: 'AC and HVAC',
      description: 'Seasonal AC servicing, refrigerant recharging, capacitor replacement and split AC installs.',
      items: [
        'AC Seasonal Service',
        'Refrigerant Recharge',
        'Capacitor Replacement',
        'Split AC Installation (by quote)',
      ],
      actionText: 'Book AC and HVAC',
      routeParam: 'hvac',
    },
    delivery: {
      category: 'Urgent delivery',
      description: 'Rapid point-to-point courier, parcel transit, cargo freight and cold-chain logistics.',
      items: [
        'Document Courier',
        'Parcel Delivery',
        'Cargo Freight',
        'Cold-Chain Delivery (by quote)',
      ],
      actionText: 'Book urgent delivery',
      routeParam: 'delivery',
    },
  },

  faqs: [
    {
      id: 'faq-1',
      question: 'How is the price decided?',
      answer: 'Fixed-scope jobs have an upfront estimate based on standard labor and required parts. For complex jobs requiring diagnosis, the technician inspects on-site and provides an itemised quote that you approve before any work starts.',
    },
    {
      id: 'faq-2',
      question: 'What happens if a technician declines my job?',
      answer: 'Our dispatch engine automatically reassigns the job to the next highest-scoring qualified technician with matching parts and availability. You do not need to restart your booking.',
    },
    {
      id: 'faq-3',
      question: 'What if the work needs a quote?',
      answer: 'The technician arrives, diagnoses the issue, and creates an itemised quote with parts and labor. The job stays paused until you review and approve the quote directly on your screen.',
    },
    {
      id: 'faq-4',
      question: 'How do you verify technicians?',
      answer: 'Every independent technician submits government identification, relevant trade licenses, and vehicle registrations. Our operations team reviews and verifies these credentials before any dispatch offers are issued.',
    },
    {
      id: 'faq-5',
      question: 'Can I cancel?',
      answer: 'You can cancel free of charge at any time before the assigned technician marks themselves en route. If cancelled after travel has begun, standard cancellation guidelines apply.',
    },
    {
      id: 'faq-6',
      question: 'Is payment real?',
      answer: 'Payments are in test mode in this version; no real money is charged. You can test the complete settlement and receipt workflow safely.',
    },
  ],
};
