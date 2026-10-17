// Data layer for production Firebase usage.
(function () {
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const cfg = window.DETAILLO_CONFIG.firebase;
  const configured = cfg && cfg.apiKey && !/^YOUR_/.test(cfg.apiKey) && window.firebase;

  // ------------------------------------------------------------ Firebase
  function FirebaseStore() {
    firebase.initializeApp(cfg);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const ts = () => firebase.firestore.FieldValue.serverTimestamp();
    const withId = (d) => ({ id: d.id, ...d.data() });

    return {
      mode: 'firebase',
      onAuth(cb) { auth.onAuthStateChanged((u) => cb(u ? { email: u.email, uid: u.uid } : null)); },
      signIn: (email, pw) => auth.signInWithEmailAndPassword(email, pw),
      signOut: () => auth.signOut(),
      resetPassword: (email) => auth.sendPasswordResetEmail(email),

      async getSettings() {
        const d = await db.doc('settings/business').get();
        return d.exists ? { ...clone(SEED.settings), ...d.data() } : null;
      },
      saveSettings: (s) => db.doc('settings/business').set(s, { merge: true }),

      async getNextBillNo() {
        const d = await db.doc('counters/bills').get();
        return d.exists ? d.data().next : SEED.firstBillNo;
      },
      setNextBillNo: (n) => db.doc('counters/bills').set({ next: n }),

      async listServices() {
        const q = await db.collection('services').orderBy('sort').get();
        return q.docs.map(withId);
      },
      async saveService(s) {
        const { id, ...rest } = s;
        if (id) { await db.collection('services').doc(id).set(rest); return s; }
        const ref = await db.collection('services').add(rest);
        return { ...s, id: ref.id };
      },
      deleteService: (id) => db.collection('services').doc(id).delete(),
      async seedServices(list) {
        const batch = db.batch();
        list.forEach((s) => batch.set(db.collection('services').doc(), s));
        await batch.commit();
      },
      async clearServices() {
        const q = await db.collection('services').get();
        const batch = db.batch();
        q.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      },

      async listBills(from, to) {
        const q = await db.collection('bills').where('date', '>=', from).where('date', '<=', to).orderBy('date', 'desc').get();
        return q.docs.map(withId).sort((a, b) => (b.date === a.date ? b.billNo - a.billNo : a.date < b.date ? 1 : -1));
      },
      // Bill numbers come from a counter doc inside a transaction, so two phones can never issue the same number.
      async createBill(bill) {
        const counter = db.doc('counters/bills');
        const ref = db.collection('bills').doc();
        const billNo = await db.runTransaction(async (tx) => {
          const c = await tx.get(counter);
          const no = c.exists ? c.data().next : SEED.firstBillNo;
          tx.set(counter, { next: no + 1 });
          tx.set(ref, { ...bill, billNo: no, createdAt: ts(), createdBy: auth.currentUser ? auth.currentUser.email : '' });
          return no;
        });
        return { ...bill, id: ref.id, billNo };
      },
      async updateBill(id, bill) {
        const { id: _i, ...rest } = bill;
        await db.collection('bills').doc(id).set({ ...rest, updatedAt: ts() }, { merge: true });
        return bill;
      },
      deleteBill: (id) => db.collection('bills').doc(id).delete()
    };
  }

  function UnconfiguredStore() {
    return {
      mode: 'unconfigured',
      onAuth(cb) { cb(null); },
      signIn() { throw new Error('Firebase config is missing. Add your Firebase web config before deploying.'); },
      signOut() { return Promise.resolve(); },
      resetPassword() { return Promise.resolve(); },
      getSettings: () => Promise.resolve(null),
      saveSettings: () => Promise.resolve(),
      getNextBillNo: () => Promise.resolve(SEED.firstBillNo),
      setNextBillNo: () => Promise.resolve(),
      listServices: () => Promise.resolve([]),
      saveService: () => Promise.resolve(null),
      deleteService: () => Promise.resolve(),
      seedServices: () => Promise.resolve(),
      clearServices: () => Promise.resolve(),
      listBills: () => Promise.resolve([]),
      createBill: () => Promise.resolve(null),
      updateBill: () => Promise.resolve(null),
      deleteBill: () => Promise.resolve()
    };
  }

  window.Store = configured ? FirebaseStore() : UnconfiguredStore();
})();
