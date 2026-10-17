// Default data, taken from "Detaillo_Auto_Detailing_Studio_Rate_Card.xlsx".
// On first login the app copies this into Firestore; after that every price is editable in the app.
(function () {
  const TIERS = {
    car: [
      { key: 'hatchback', label: 'Hatchback / Compact', short: 'Hatchback' },
      { key: 'sedan', label: 'Sedan / Compact SUV', short: 'Sedan / C-SUV' },
      { key: 'suv', label: 'Mid-Size SUV / Luxury', short: 'SUV / Luxury' }
    ],
    bike: [
      { key: 'normal', label: 'Normal Bike', short: 'Normal' },
      { key: 'sport', label: 'Sport Bike', short: 'Sport' }
    ]
  };

  const GROUPS = [
    { key: 'car-care', vehicle: 'car', label: 'Car · Care packages', pricing: 'tier' },
    { key: 'car-coat', vehicle: 'car', label: 'Car · Coatings & PPF', pricing: 'tier' },
    { key: 'car-addon', vehicle: 'car', label: 'Car · Add-on services', pricing: 'flat' },
    { key: 'car-ppf', vehicle: 'car', label: 'Car · PPF by brand', pricing: 'flat' },
    { key: 'bike-care', vehicle: 'bike', label: 'Bike · Care packages', pricing: 'tier' },
    { key: 'bike-coat', vehicle: 'bike', label: 'Bike · Coatings & PPF', pricing: 'tier' }
  ];

  let sort = 0;
  const t3 = (group, name, desc, h, s, u) => ({ group, name, desc, unit: '', prices: { hatchback: h, sedan: s, suv: u }, sort: ++sort });
  const t2 = (group, name, desc, n, s) => ({ group, name, desc, unit: '', prices: { normal: n, sport: s }, sort: ++sort });
  const flat = (group, name, desc, price, unit, cost) => ({ group, name, desc, unit: unit || '', prices: { flat: price }, cost: cost || 0, sort: ++sort });

  const services = [
    // Car care
    t3('car-care', 'Standard Foam Wash', 'Pressure wash, snow foam bath, microfiber dry, tyre dressing, glass cleaning, interior vacuuming.', 599, 799, 1199),
    t3('car-care', 'Deep Interior Detailing', 'Steam cleaning of seats, carpets, dashboard, roof liner conditioning, and leather/fabric treatment.', 1800, 2500, 4500),
    t3('car-care', 'Exterior Paint Decontamination', 'Wash, clay bar treatment, iron fallout removal, and 1-step gloss enhancement polish.', 1500, 2500, 3500),
    t3('car-care', 'Comprehensive Detailing Package', 'Complete interior deep clean + exterior 2-step paint correction & heavy swirl mark removal.', 6500, 8500, 10500),
    // Car coatings
    t3('car-coat', 'Ceramic Coating (Entry Level)', '1 Year Warranty | 1 Layer Ceramic | 1 Maintenance Wash Free', 12500, 14500, 16500),
    t3('car-coat', 'Ceramic Coating (Pro Shield)', '3 Years Warranty | 2 Layers Ceramic + Glass Coat | 2 Maintenance Washes Free', 16500, 18500, 22000),
    t3('car-coat', 'Graphene Coating (Ultra)', '5 Years Warranty | 10H Hardness Graphene Coating | Hydrophobic Top Coat | 1+2 Layers Ceramic + Glass Coat | 3 Maintenance Washes Free', 22000, 25000, 30000),
    t3('car-coat', 'Paint Protection Film (PPF)', '5-10 Years Warranty | Self-Healing TPU Film | Full Body Application', 80000, 95000, 115000),
    // Car add-ons
    flat('car-addon', 'Glass Buffing / Glass Rain Repellent', 'Hydrophobic coating for front & rear windshields', 2500, 'Per Vehicle'),
    flat('car-addon', 'Headlight Restoration & UV Coating', 'Sanding, compound polish & UV protective clear coat', 599, 'Per Pair'),
    flat('car-addon', 'Engine Bay Detailing & Dressing', 'Degreasing, safe wash & non-sticky dressing', 1500, 'Per Vehicle'),
    flat('car-addon', 'Alloy Wheel Coating', 'High-temp ceramic coat on outer face & calipers', 3200, 'Set of 4 Wheels'),
    flat('car-addon', 'Leather Conditioning & Protection', 'Deep clean & pH-balanced natural oil moisturizer', 2000, 'Full Interior'),
    // PPF brands ("PPF Rate" sheet). cost = DP column, internal only, never printed on a bill.
    flat('car-ppf', 'PPF Knight Skin (5Y)', '5 Years Warranty', 49999, '', 21500),
    flat('car-ppf', 'PPF Knight Skin (10Y)', '10 Years Warranty', 75999, '', 49990),
    flat('car-ppf', 'PPF Moco Ultra High Gloss (5Y)', '5 Years Warranty', 65000, '', 35000),
    flat('car-ppf', 'PPF Garware Protect (3Y)', '3 Years Warranty', 49999, '', 30208),
    flat('car-ppf', 'PPF Garware Plus (5Y)', '5 Years Warranty', 65999, '', 39412),
    flat('car-ppf', 'PPF Garware Glaze (5Y Anti Yellow)', '5 Years Warranty, anti-yellowing', 75000, '', 49413),
    flat('car-ppf', 'PPF Garware Premium (8Y)', '8 Years Warranty', 85000, '', 60180),
    flat('car-ppf', 'PPF Garware Titanium (15Y Lifetime)', '15 Years / Lifetime Warranty', 115000, '', 74488),
    // Bike care
    t2('bike-care', 'Standard Foam Wash for Bike', 'Pressure wash, snow foam bath, microfiber dry, tyre dressing, glass cleaning, interior vacuuming.', 149, 299),
    t2('bike-care', 'Wash & Wax', 'Dec wash, alloy wheels, paint surface & wax', 399, 499),
    t2('bike-care', 'Salt/Tar Remover & Paint Decontamination', 'Wash, clay bar treatment, iron fallout removal, and 1-step gloss enhancement polish.', 1199, 1599),
    t2('bike-care', 'Detail Wash + Rubbing and TFL', 'Complete deep clean + exterior 2-step paint correction & heavy swirl mark removal.', 1999, 2499),
    // Bike coatings
    t2('bike-coat', 'Ceramic Coating for Bike', '1 Year Warranty | 1 Layer Ceramic | 1 Maintenance Wash Free', 3500, 4500),
    t2('bike-coat', 'Ceramic Coating (Pro Shield)', '3 Years Warranty | 2 Layers Ceramic | 2 Maintenance Washes Free', 4999, 5999),
    t2('bike-coat', 'Graphene Coating (Ultra)', '5 Years Warranty | 10H Hardness Graphene Coating | Hydrophobic Top Coat | 1+2 Layers Ceramic | 3 Maintenance Washes Free', 5999, 6999),
    t2('bike-coat', 'Paint Protection Film (PPF)', '5-10 Years Warranty | Self-Healing TPU Film | Full Body Application', 9999, 11999)
  ];

  const settings = {
    name: 'Detaillo Auto Detailing Studio',
    tagline: 'Where Shine Meets Perfection',
    address: 'Kharadi, Thite Nagar, Behind Zensar, Pune - 411014',
    phones: '9161684151, 7276767303',
    email: 'detaillostudio51@gmail.com',
    gstin: '27ABAFD1242L1ZM',
    instagram: 'detaillo_studio_kharadi',
    gstRate: 18,
    gstDefault: true,
    terms: [
      'Goods once sold will not be taken back or exchanged.',
      'No Guarantee for Electrical & Rubber Parts.',
      'Delivery against full payment only.',
      'Labour would be charged extra.',
      'Final price depends on paint condition, scratch depth and interior contamination level.',
      'Ceramic/Graphene coatings need 12-24 hours indoors to cure. No water wash for 7 days after treatment.'
    ]
  };

  // A few sample bills, used only in demo mode so the dashboard and reports have something to show.
  function demoBills() {
    const today = U.today();
    const mk = (n, daysAgo, name, mobile, kind, tier, model, reg, items, extra) => {
      const gst = { enabled: true, rate: 18, igst: false };
      const lines = items.map((it) => ({ id: U.uid(), name: it[0], qty: it[1], rate: it[2], custom: !!it[3] }));
      const t = U.calc(lines, extra.discount || 0, gst);
      const received = extra.paidFull ? t.total : extra.received || 0;
      return {
        id: 'demo' + n, billNo: n, docType: 'Invoice', date: U.addDays(today, -daysAgo), deliveryDate: U.addDays(today, -daysAgo),
        customer: { name, mobile, gstin: extra.gstin || '' },
        vehicle: { kind, tier, model, regNo: reg },
        items: lines, discount: t.discount, gst, ...t, received, payMode: extra.mode || 'UPI', notes: extra.notes || '',
        createdAt: Date.now() - daysAgo * 864e5
      };
    };
    return [
      mk(520, 0, 'Rohit Deshmukh', '9822011223', 'car', 'sedan', 'Hyundai Verna', 'MH12 TK 4471', [['Deep Interior Detailing', 1, 2500], ['Headlight Restoration & UV Coating', 1, 599], ['Extra: wax top-up', 1, 350, true]], { paidFull: true, mode: 'UPI' }),
      mk(519, 0, 'Sneha Kulkarni', '9890455667', 'car', 'hatchback', 'Tata Altroz', 'MH14 KL 2210', [['Standard Foam Wash', 1, 599]], { paidFull: true, mode: 'Cash' }),
      mk(518, 1, 'Amit Jadhav', '9561234567', 'car', 'suv', 'Toyota Innova Crysta', 'MH12 SQ 9035', [['Ceramic Coating (Pro Shield)', 1, 22000], ['Alloy Wheel Coating', 1, 3200]], { discount: 1200, received: 10000, mode: 'UPI', notes: 'Balance on delivery' }),
      mk(517, 2, 'Pranav Shinde', '9921778899', 'bike', 'sport', 'KTM Duke 390', 'MH12 RT 1188', [['Wash & Wax', 1, 499], ['Ceramic Coating for Bike', 1, 4500]], { paidFull: true, mode: 'Card' }),
      mk(516, 3, 'Varad Patil', '9604112233', 'car', 'sedan', 'Honda City', 'MH12 PX 7712', [['Comprehensive Detailing Package', 1, 8500]], { paidFull: true, mode: 'UPI' }),
      mk(515, 5, 'Kavita Rao', '9730998877', 'car', 'suv', 'Kia Seltos', 'MH12 UV 3340', [['PPF Garware Plus (5Y)', 1, 65999]], { received: 30000, mode: 'UPI', notes: 'Advance taken', gstin: '' }),
      mk(514, 6, 'Zen Interiors Pvt Ltd', '9881500500', 'car', 'sedan', 'Skoda Slavia', 'MH12 ZN 0042', [['Exterior Paint Decontamination', 1, 2500], ['Engine Bay Detailing & Dressing', 1, 1500]], { paidFull: true, mode: 'UPI', gstin: '27AABCZ1234F1Z5' }),
      mk(513, 9, 'Mahesh Gaikwad', '9422334455', 'bike', 'normal', 'Royal Enfield Classic 350', 'MH12 WE 5521', [['Standard Foam Wash for Bike', 1, 149]], { paidFull: true, mode: 'Cash' })
    ];
  }

  window.SEED = { TIERS, GROUPS, services, settings, demoBills, firstBillNo: 526 };
})();
