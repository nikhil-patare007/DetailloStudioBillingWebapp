(function () {
  const U = {};

  U.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
  U.r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  // Indian digit grouping: 1,25,000
  U.inr = (n, dec) => {
    n = U.num(n);
    const d = dec === undefined ? (Math.abs(n % 1) > 0.004 ? 2 : 0) : dec;
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  };

  const pad = (n) => String(n).padStart(2, '0');
  U.iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  U.today = () => U.iso(new Date());
  U.addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return U.iso(d); };
  U.fmtDate = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  U.fmtDateLong = (iso) => {
    if (!iso) return '';
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  U.presets = () => {
    const t = new Date();
    const today = U.iso(t);
    const monthStart = U.iso(new Date(t.getFullYear(), t.getMonth(), 1));
    const lmStart = U.iso(new Date(t.getFullYear(), t.getMonth() - 1, 1));
    const lmEnd = U.iso(new Date(t.getFullYear(), t.getMonth(), 0));
    const day = (t.getDay() + 6) % 7; // Monday start
    const weekStart = U.addDays(today, -day);
    const fyYear = t.getMonth() >= 3 ? t.getFullYear() : t.getFullYear() - 1; // Indian FY: Apr-Mar
    return [
      { key: 'today', label: 'Today', from: today, to: today },
      { key: 'week', label: 'This week', from: weekStart, to: today },
      { key: 'month', label: 'This month', from: monthStart, to: today },
      { key: 'lastmonth', label: 'Last month', from: lmStart, to: lmEnd },
      { key: 'fy', label: 'This FY', from: `${fyYear}-04-01`, to: today }
    ];
  };

  // ---- Bill maths ------------------------------------------------
  // Rate-card prices are exclusive of GST, so GST is added on top of (subtotal - discount).
  U.calc = (items, discount, gst) => {
    const subtotal = U.r2(items.reduce((s, it) => s + U.num(it.qty) * U.num(it.rate), 0));
    const disc = Math.min(Math.max(U.num(discount), 0), subtotal);
    const taxable = U.r2(subtotal - disc);
    const rate = gst && gst.enabled ? U.num(gst.rate) : 0;
    const tax = U.r2((taxable * rate) / 100);
    const igst = gst && gst.enabled && gst.igst ? tax : 0;
    const cgst = gst && gst.enabled && !gst.igst ? U.r2(tax / 2) : 0;
    const sgst = gst && gst.enabled && !gst.igst ? U.r2(tax - cgst) : 0;
    const exact = taxable + tax;
    const total = Math.round(exact);
    return { subtotal, discount: disc, taxable, cgst, sgst, igst, tax, roundOff: U.r2(total - exact), total };
  };

  U.lineAmount = (it) => U.r2(U.num(it.qty) * U.num(it.rate));

  U.billStatus = (b) => {
    const paid = U.num(b.received);
    if (paid <= 0) return 'unpaid';
    if (paid + 0.5 >= b.total) return 'paid';
    return 'partial';
  };

  U.uid = () => Math.random().toString(36).slice(2, 10);
  U.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  window.U = U;
})();
