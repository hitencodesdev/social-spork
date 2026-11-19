// Social Spork Swiggy Partner Complaints Ingestion Content Script
(function () {
  console.log('[Social Spork Extension] Swiggy Partner Observer Initialized.');

  const BACKEND_URL = 'http://localhost:5000/api/v1/complaints/ingest';
  const API_KEY = 'spork_secret_ingest_key_2026';

  function extractSRid() {
    // Attempt to extract from URL params or URL path
    const urlMatch = window.location.href.match(/restaurantId=([0-9]+)/i) || window.location.href.match(/outletId=([0-9]+)/i);
    if (urlMatch) return urlMatch[1];

    // Attempt to extract from local storage or session storage
    try {
      const stored = localStorage.getItem('selectedRestaurant') || localStorage.getItem('outlet_id');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id || parsed.restaurantId) return String(parsed.id || parsed.restaurantId);
      }
    } catch (e) {}

    // Fallback: check DOM elements
    const ridEl = document.querySelector('[data-testid="restaurant-id"], .restaurant-id, .outlet-id');
    if (ridEl) return ridEl.innerText.trim();

    return '12345'; // Default or prompt
  }

  function scrapeVisibleComplaints() {
    const sRid = extractSRid();
    const complaints = [];

    // Generic selector matching complaint / dispute cards
    const cards = document.querySelectorAll(
      '[data-testid="complaint-card"], .complaint-card, .dispute-row, tr[class*="complaint"], div[class*="complaint-item"]'
    );

    if (cards.length > 0) {
      cards.forEach((card, idx) => {
        const orderIdEl = card.querySelector('[class*="order-id"], [data-testid="order-id"]') || card;
        const orderIdMatch = orderIdEl.innerText.match(/([0-9]{6,12})/);
        const orderId = orderIdMatch ? orderIdMatch[1] : `SW-${Date.now()}-${idx}`;

        const issueEl = card.querySelector('[class*="issue"], [class*="category"], [class*="reason"]') || card;
        const text = issueEl.innerText;

        const imgEls = card.querySelectorAll('img');
        const imageUrls = [];
        imgEls.forEach(img => {
          if (img.src && !img.src.includes('avatar') && !img.src.includes('icon')) {
            imageUrls.push(img.src);
          }
        });

        complaints.push({
          platform: 'SWIGGY',
          restaurantId: sRid,
          orderId,
          complaintEventId: `SW-EVT-${orderId}`,
          category: 'Bad Quality Food',
          issue: text.slice(0, 80) || 'Quality or Delivery Issue',
          productName: 'Affected Item',
          customerDescription: text.slice(0, 200),
          imageUrls
        });
      });
    }

    return { sRid, complaints };
  }

  // Create Ingestion Floating Widget on Swiggy Partner Dashboard
  function injectSporkUI() {
    if (document.getElementById('social-spork-pill')) return;

    const pill = document.createElement('div');
    pill.id = 'social-spork-pill';
    pill.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      border: 1px solid #ff5200;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    pill.innerHTML = `
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;"></span>
      <span>Social Spork Sync</span>
      <button id="spork-sync-btn" style="background:#ff5200;color:white;border:none;padding:5px 12px;border-radius:20px;font-size:12px;cursor:pointer;font-weight:bold;">
        Sync to WhatsApp
      </button>
    `;

    document.body.appendChild(pill);

    document.getElementById('spork-sync-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const btn = e.target;
      btn.innerText = 'Syncing...';
      btn.style.opacity = '0.7';

      const { sRid, complaints } = scrapeVisibleComplaints();
      const listToSync = complaints.length > 0 ? complaints : [
        {
          platform: 'SWIGGY',
          restaurantId: sRid,
          orderId: `SW-${Math.floor(100000 + Math.random() * 900000)}`,
          complaintEventId: `SW-EVT-${Date.now()}`,
          category: 'Bad Quality Food',
          issue: 'Food packaging damaged / Expired',
          productName: 'Sample Order Item',
          customerDescription: 'Customer reported issue directly on Swiggy Partner portal.',
          imageUrls: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600']
        }
      ];

      let synced = 0;
      for (const comp of listToSync) {
        try {
          const res = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': API_KEY
            },
            body: JSON.stringify(comp)
          });
          if (res.ok) synced++;
        } catch (err) {
          console.error('[Social Spork Sync Error]', err);
        }
      }

      btn.innerText = `Synced (${synced})!`;
      btn.style.background = '#10b981';
      setTimeout(() => {
        btn.innerText = 'Sync to WhatsApp';
        btn.style.background = '#ff5200';
        btn.style.opacity = '1';
      }, 3000);
    });
  }

  // Inject UI once page is settled
  setTimeout(injectSporkUI, 2000);
})();
