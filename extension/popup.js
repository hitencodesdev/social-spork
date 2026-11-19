document.addEventListener('DOMContentLoaded', async () => {
  const backendBadge = document.getElementById('backend-status');
  const triggerBtn = document.getElementById('trigger-sync-btn');

  // Check health of backend
  try {
    const res = await fetch('http://localhost:5000/api/health');
    if (res.ok) {
      backendBadge.innerText = 'Connected';
      backendBadge.style.background = '#10b981';
    } else {
      backendBadge.innerText = 'Offline';
      backendBadge.style.background = '#ef4444';
    }
  } catch (e) {
    backendBadge.innerText = 'Offline';
    backendBadge.style.background = '#ef4444';
  }

  // Trigger test sync
  triggerBtn.addEventListener('click', async () => {
    triggerBtn.innerText = 'Sending to WhatsApp...';
    triggerBtn.disabled = true;

    try {
      const payload = {
        platform: 'SWIGGY',
        restaurantId: '12345',
        orderId: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
        complaintEventId: `EVT-${Date.now()}`,
        category: 'Bad Quality Food',
        issue: 'Customer reported expired sweets (Simulated from Extension)',
        productName: 'Regular Mix Sweets (1kg)',
        customerDescription: 'Sweets were expired and bad smelling.',
        imageUrls: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600']
      };

      const res = await fetch('http://localhost:5000/api/v1/complaints/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'spork_secret_ingest_key_2026'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        triggerBtn.innerText = '✅ Delivered to WhatsApp!';
        triggerBtn.style.background = '#10b981';
      } else {
        triggerBtn.innerText = '❌ Failed: ' + (data.error || 'Unknown error');
        triggerBtn.style.background = '#ef4444';
      }
    } catch (err) {
      triggerBtn.innerText = '❌ Backend Unreachable';
      triggerBtn.style.background = '#ef4444';
    }

    setTimeout(() => {
      triggerBtn.innerText = '⚡ Push Test Complaint to WhatsApp';
      triggerBtn.style.background = '#2563eb';
      triggerBtn.disabled = false;
    }, 3000);
  });
});
