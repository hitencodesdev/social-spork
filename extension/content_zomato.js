// Social Spork Zomato Partner Complaints Ingestion Content Script
(function () {
  console.log('[Social Spork Extension] Zomato Partner Observer Initialized.');

  const BACKEND_URL = 'http://localhost:5000/api/v1/complaints/ingest';
  const API_KEY = 'spork_secret_ingest_key_2026';

  function extractZRid() {
    const urlMatch = window.location.href.match(/res_id=([0-9]+)/i) || window.location.href.match(/resId=([0-9]+)/i);
    if (urlMatch) return urlMatch[1];

    try {
      const stored = localStorage.getItem('res_id') || localStorage.getItem('current_restaurant_id');
      if (stored) return String(stored);
    } catch (e) {}

    return '18492011'; // Fallback sample ID
  }

  function injectSporkZomatoUI() {
    if (document.getElementById('social-spork-zomato-pill')) return;

    const pill = document.createElement('div');
    pill.id = 'social-spork-zomato-pill';
    pill.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #111827;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      border: 1px solid #e23744;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    `;

    pill.innerHTML = `
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;"></span>
      <span>Social Spork (Zomato)</span>
      <button id="spork-zomato-sync-btn" style="background:#e23744;color:white;border:none;padding:5px 12px;border-radius:20px;font-size:12px;cursor:pointer;font-weight:bold;">
        Sync to WhatsApp
      </button>
    `;

    document.body.appendChild(pill);

    document.getElementById('spork-zomato-sync-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn = e.target;
      btn.innerText = 'Syncing...';

      const zRid = extractZRid();
      const sampleZomatoComplaint = {
        platform: 'ZOMATO',
        restaurantId: zRid,
        orderId: `ZM-${Math.floor(100000 + Math.random() * 900000)}`,
        complaintEventId: `ZM-EVT-${Date.now()}`,
        category: 'Food Quality',
        issue: 'Foreign object found in food',
        productName: 'Butter Naan & Dal Makhani',
        customerDescription: 'Customer reported a hair inside the sealed container.',
        imageUrls: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600']
      };

      try {
        const res = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
          },
          body: JSON.stringify(sampleZomatoComplaint)
        });
        if (res.ok) {
          btn.innerText = 'Synced (1)!';
          btn.style.background = '#10b981';
        }
      } catch (err) {
        btn.innerText = 'Failed';
        btn.style.background = '#ef4444';
      }

      setTimeout(() => {
        btn.innerText = 'Sync to WhatsApp';
        btn.style.background = '#e23744';
      }, 3000);
    });
  }

  setTimeout(injectSporkZomatoUI, 2000);
})();
