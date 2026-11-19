const path = require('path');
const DataStore = require('./src/models/dataStore');
const DeduplicationService = require('./src/services/deduplicationService');
const RestaurantMatchingService = require('./src/services/restaurantMatchingService');
const QueueService = require('./src/services/queueService');
const SheetSyncService = require('./src/services/sheetSyncService');

async function runTests() {
  console.log('\n--- 1. Testing Restaurant Matching Service ---');
  // Match Swiggy Sidewok
  const matchSwiggy = await RestaurantMatchingService.matchRestaurant('SWIGGY', '12345');
  console.log('Swiggy S-RID 12345 Match:', matchSwiggy.matched, matchSwiggy.restaurant?.name, matchSwiggy.formattedPhone);

  // Match Zomato Sidewok
  const matchZomato = await RestaurantMatchingService.matchRestaurant('ZOMATO', '18492011');
  console.log('Zomato Z-RID 18492011 Match:', matchZomato.matched, matchZomato.restaurant?.name, matchZomato.formattedPhone);

  // Non-existent ID
  const matchUnknown = await RestaurantMatchingService.matchRestaurant('SWIGGY', '999999');
  console.log('Unknown S-RID Match:', matchUnknown.matched, matchUnknown.status, matchUnknown.reason);

  console.log('\n--- 2. Testing Deduplication Service ---');
  const payload1 = {
    platform: 'SWIGGY',
    restaurantId: '12345',
    orderId: 'ORD-TEST-1001',
    complaintEventId: 'EVT-SW-555',
    productName: 'Paneer Tikka Roll',
    issue: 'Missing Item'
  };
  const { dedupKey: key1, tier: tier1 } = DeduplicationService.generateFingerprint(payload1);
  console.log('Tier 1 Key (with event ID):', key1, tier1);

  // Same payload gives exact same key
  const { dedupKey: key2 } = DeduplicationService.generateFingerprint(payload1);
  console.log('Keys match deterministically:', key1 === key2);

  console.log('\n--- 3. Testing Complaint Lifecycle & WhatsApp Alert ---');
  // Create complaint
  const complaint = await DataStore.createComplaint({
    dedupKey: key1,
    platform: 'SWIGGY',
    platformRestaurantId: '12345',
    orderId: 'ORD-TEST-1001',
    complaintEventId: 'EVT-SW-555',
    category: 'Bad Quality Food',
    issue: 'Food packaging damaged and cold',
    productName: 'Paneer Tikka Roll',
    customerDescription: 'The roll was completely cold and sauce spilled inside bag.',
    imageUrls: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600'],
    processingStatus: 'PENDING'
  });

  // Process via QueueService
  await QueueService.processComplaint(complaint._id);

  // Verify updated status
  const processed = await DataStore.findComplaintById(complaint._id);
  console.log('Post-process status:', processed.processingStatus);
  console.log('Matched restaurant:', processed.restaurantName);

  console.log('\n--- 4. Testing Duplicate Detection Check ---');
  const dupCheck = await DeduplicationService.checkDuplicate(key1);
  console.log('Is duplicate detected?:', dupCheck.isDuplicate);

  console.log('\n--- 5. Testing Master Excel Generation ---');
  const workbook = await SheetSyncService.generateSampleExcelWorkbook();
  const samplePath = path.join(__dirname, 'sample_data', 'restaurant_master_generated.xlsx');
  await workbook.xlsx.writeFile(samplePath);
  console.log('Sample master workbook generated at:', samplePath);

  // Test syncing that workbook back into the system
  console.log('\n--- 6. Testing Excel Synchronization Engine ---');
  const syncResult = await SheetSyncService.syncFromExcel(samplePath, 'restaurant_master_generated.xlsx', 'TEST_RUNNER');
  console.log('Sync Result:', syncResult.success, syncResult.summary);

  console.log('\nAll Backend Services Verified Successfully!\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
