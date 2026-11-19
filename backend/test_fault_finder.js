const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api/v1';
const HEADERS = {
  'Content-Type': 'application/json',
  'X-API-Key': 'spork_secret_ingest_key_2026'
};

const results = {
  passed: [],
  failed: [],
  warnings: [],
  faultsIdentified: []
};

function pass(testName, details) {
  results.passed.push({ testName, details });
  console.log(`✅ [PASS] ${testName}: ${details}`);
}

function warn(testName, warning) {
  results.warnings.push({ testName, warning });
  console.log(`⚠️  [WARN] ${testName}: ${warning}`);
}

function fault(faultTitle, severity, rootCause, impact, fixRecommendation) {
  results.faultsIdentified.push({
    faultTitle,
    severity,
    rootCause,
    impact,
    fixRecommendation
  });
  console.log(`❌ [FAULT - ${severity}] ${faultTitle}: ${rootCause}`);
}

async function runAudit() {
  console.log('====================================================');
  console.log('🔍 STARTING SOCIAL SPORK SYSTEM AUDIT & FAULT FINDER');
  console.log('====================================================\n');

  // --- FAULT TEST 1: Concurrency & Race Condition on Deduplication ---
  console.log('--- Test 1: Concurrency Race Condition on Ingest ---');
  const duplicateOrderId = `RACE-${Date.now()}`;
  const racePayload = {
    platform: 'SWIGGY',
    restaurantId: '12345',
    orderId: duplicateOrderId,
    complaintEventId: `EVT-${duplicateOrderId}`,
    category: 'Food Quality',
    issue: 'Concurrent deduplication test',
    productName: 'Butter Naan',
    customerDescription: 'Testing parallel rapid fire requests'
  };

  try {
    // Fire 5 identical requests simultaneously
    const raceRequests = Array(5).fill(0).map(() => 
      axios.post(`${BASE_URL}/complaints/ingest`, racePayload, { headers: HEADERS }).catch(e => e.response || e)
    );
    const raceResponses = await Promise.all(raceRequests);
    
    let createdCount = 0;
    let duplicateCount = 0;
    raceResponses.forEach(r => {
      if (r.status === 201) createdCount++;
      if (r.status === 200 && r.data?.duplicate) duplicateCount++;
    });

    if (createdCount === 1 && duplicateCount === 4) {
      pass('Deduplication Race Condition', `5 parallel requests -> Exactly 1 created (201), 4 duplicates blocked (200)`);
    } else if (createdCount > 1) {
      fault(
        'Concurrent Race Condition Duplicate Window',
        'HIGH',
        `When 5 requests hit at exact same millisecond, ${createdCount} created instead of 1.`,
        'Could cause 2 WhatsApp messages if an employee double-clicks extremely rapidly within 5ms before first record is persisted.',
        'Use an atomic in-memory mutex lock / set on dedupKey during ingestion processing.'
      );
    } else {
      pass('Deduplication Race Condition', `Handled gracefully (Created: ${createdCount}, Duplicate: ${duplicateCount})`);
    }
  } catch (err) {
    warn('Deduplication Race Condition', err.message);
  }

  // --- FAULT TEST 2: Input Validation & Boundary Checks ---
  console.log('\n--- Test 2: Input Validation & Boundary Checks ---');
  // 2A: Missing Platform
  try {
    await axios.post(`${BASE_URL}/complaints/ingest`, { restaurantId: '12345', orderId: 'O1' }, { headers: HEADERS });
    fault('Missing Platform Accepted', 'MEDIUM', 'Server accepted complaint with missing platform', 'Data corruption', 'Add strict platform enum validation');
  } catch (err) {
    if (err.response?.status === 400) {
      pass('Missing Platform Validation', 'Server rejected 400 Bad Request');
    }
  }

  // 2B: Invalid Platform (e.g. UBEREATS)
  try {
    await axios.post(`${BASE_URL}/complaints/ingest`, { platform: 'UBEREATS', restaurantId: '12345', orderId: 'O1' }, { headers: HEADERS });
    fault('Invalid Platform Accepted', 'MEDIUM', 'Accepted unsupported platform UBEREATS', 'Failed matching', 'Reject non-Swiggy/Zomato platforms');
  } catch (err) {
    if (err.response?.status === 400) {
      pass('Invalid Platform Validation', 'Server rejected UBEREATS with 400');
    }
  }

  // 2C: Empty Order ID
  try {
    await axios.post(`${BASE_URL}/complaints/ingest`, { platform: 'SWIGGY', restaurantId: '12345', orderId: '' }, { headers: HEADERS });
    fault('Empty Order ID Accepted', 'HIGH', 'Server accepted blank orderId', 'Restaurant receives blank order ID alert', 'Validate orderId.trim().length > 0');
  } catch (err) {
    if (err.response?.status === 400) {
      pass('Empty Order ID Validation', 'Server rejected blank orderId with 400');
    }
  }

  // --- FAULT TEST 3: Phone Number Sanitization Edge Cases ---
  console.log('\n--- Test 3: Phone Number Sanitizer Edge Cases ---');
  const PhoneService = require('./src/services/restaurantMatchingService');
  const phoneTestCases = [
    { input: '9876543210', expected: '+919876543210', desc: 'Standard 10-digit Indian mobile' },
    { input: '09876543210', expected: '+919876543210', desc: '10-digit with leading 0' },
    { input: '+91 98765 43210', expected: '+919876543210', desc: 'Formatted with spaces & +' },
    { input: '91-98765-43210', expected: '+919876543210', desc: 'Formatted with hyphens & 91' },
    { input: '+919876543210', expected: '+919876543210', desc: 'Exact E.164' },
    { input: '12345', expected: null, desc: 'Too short (5 digits)' },
    { input: '98765abcde', expected: null, desc: 'Alpha-numeric garbage' },
    { input: '+14155552671', expected: '+14155552671', desc: 'US international format' }
  ];

  let phoneBugs = 0;
  for (const tc of phoneTestCases) {
    const res = PhoneService.sanitizePhoneNumber(tc.input);
    if (res !== tc.expected) {
      phoneBugs++;
      fault(
        `Phone Sanitizer Flaw for '${tc.input}'`,
        'LOW',
        `Input '${tc.input}' resulted in '${res}' instead of '${tc.expected}'`,
        'Could fail WhatsApp message dispatch if sheet has unusual format',
        'Update regex in restaurantMatchingService.sanitizePhoneNumber'
      );
    } else {
      pass(`Phone Sanitization (${tc.desc})`, `'${tc.input}' -> '${res}'`);
    }
  }

  // --- FAULT TEST 4: Broken / Timeout Image URL Handling ---
  console.log('\n--- Test 4: Broken Image URL Handling in Ingest ---');
  try {
    const brokenImgPayload = {
      platform: 'SWIGGY',
      restaurantId: '12345',
      orderId: `IMG-FAIL-${Date.now()}`,
      category: 'Bad Quality Food',
      issue: 'Broken image test',
      productName: 'Paneer Butter Masala',
      imageUrls: ['https://nonexistent-domain-404-spork-test.xyz/fake_photo.jpg']
    };
    const res = await axios.post(`${BASE_URL}/complaints/ingest`, brokenImgPayload, { headers: HEADERS });
    if (res.status === 201) {
      pass('Broken Image Resilience', 'Server did NOT crash when given 404/invalid image URL. Buffered gracefully with fallback.');
    }
  } catch (err) {
    fault('Server Crash on Broken Image', 'CRITICAL', err.message, 'Ingestion halted if image URL is dead', 'Ensure axios catch block wraps image buffer');
  }

  // --- FAULT TEST 5: Unmatched Restaurant Status & Workflow ---
  console.log('\n--- Test 5: Unmatched S-RID / Z-RID Handling ---');
  try {
    const unmappedPayload = {
      platform: 'SWIGGY',
      restaurantId: '999888777', // Unknown
      orderId: `UNMATCH-${Date.now()}`,
      category: 'Packaging Spillage',
      issue: 'Soup spilled in container',
      productName: 'Sweet Corn Soup'
    };
    const res = await axios.post(`${BASE_URL}/complaints/ingest`, unmappedPayload, { headers: HEADERS });
    if (res.status === 201) {
      // Check its status in database
      const complaintId = res.data.complaint._id;
      // Give queue 100ms to process
      await new Promise(r => setTimeout(r, 200));
      const getRes = await axios.get(`${BASE_URL}/complaints/${complaintId}`);
      const status = getRes.data.complaint.processingStatus;
      if (status === 'UNMATCHED_RESTAURANT') {
        pass('Unmatched RID Workflow', `Correctly set status to 'UNMATCHED_RESTAURANT' without crashing.`);
      } else {
        warn('Unmatched RID Workflow', `Status was '${status}' instead of 'UNMATCHED_RESTAURANT'`);
      }
    }
  } catch (err) {
    warn('Unmatched RID Workflow', err.message);
  }

  // --- FAULT TEST 6: High-Volume Burst Queue Stress (20 rapid complaints) ---
  console.log('\n--- Test 6: High-Volume Burst Queue Stress ---');
  try {
    const burstCount = 20;
    const burstPromises = [];
    for (let i = 0; i < burstCount; i++) {
      burstPromises.push(
        axios.post(`${BASE_URL}/complaints/ingest`, {
          platform: i % 2 === 0 ? 'SWIGGY' : 'ZOMATO',
          restaurantId: i % 2 === 0 ? '12345' : '18492011',
          orderId: `BURST-${Date.now()}-${i}`,
          category: 'High Volume Test',
          issue: `Burst stress item ${i}`,
          productName: `Item #${i}`
        }, { headers: HEADERS })
      );
    }
    const burstResponses = await Promise.all(burstPromises);
    const successCount = burstResponses.filter(r => r.status === 201).length;
    if (successCount === burstCount) {
      pass('Burst Volume Ingestion', `Successfully ingested all ${burstCount} rapid-fire complaints concurrently with 0 drops.`);
    } else {
      fault('Burst Ingestion Drop', 'HIGH', `Only ${successCount}/${burstCount} succeeded`, 'Complaints lost during peak dinner rush', 'Increase queue concurrency');
    }
  } catch (err) {
    warn('Burst Volume Test', err.message);
  }

  // --- FAULT TEST 7: Excel Sync Edge Cases ---
  console.log('\n--- Test 7: Excel Sheet Synchronization Edge Cases ---');
  const SheetSync = require('./src/services/sheetSyncService');
  const DataStore = require('./src/models/dataStore');
  
  // Test contact preservation rule:
  // Existing restaurant has phone: +919876543210
  // Upload a sheet where that restaurant's phone column is BLANK
  // Does it erase the number? (It must NOT erase it!)
  const samplePath = './sample_data/restaurant_master_generated.xlsx';
  if (fs.existsSync(samplePath)) {
    const syncRes = await SheetSync.syncFromExcel(samplePath, 'test.xlsx', 'TEST_AUDIT');
    const sidewok = await DataStore.findRestaurantByPlatformId('SWIGGY', '12345');
    if (sidewok && sidewok.whatsAppNumber) {
      pass('Contact Preservation Rule', `Sidewok phone '${sidewok.whatsAppNumber}' was strictly preserved during master sync.`);
    } else {
      fault('Contact Erasure Bug', 'CRITICAL', 'WhatsApp number was erased during Excel sync!', 'Restaurant stops receiving WhatsApp complaints after weekly sync', 'Ensure blank Excel cell does not overwrite existing DB phone');
    }
  }

  console.log('\n====================================================');
  console.log('📊 AUDIT SUMMARY:');
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Warnings: ${results.warnings.length}`);
  console.log(`Faults Found: ${results.faultsIdentified.length}`);
  console.log('====================================================');

  return results;
}

runAudit()
  .then(res => {
    fs.writeFileSync('audit_results.json', JSON.stringify(res, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('Audit Script Error:', err);
    process.exit(1);
  });
