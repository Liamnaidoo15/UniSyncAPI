/**
 * Test script to validate Firebase service account JSON
 * Usage: node test-service-account.js
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Try to load from file first
let serviceAccount;
let source = 'file';

try {
  // Try serviceAccountKey.json first
  if (fs.existsSync('./serviceAccountKey.json')) {
    serviceAccount = require('./serviceAccountKey.json');
    console.log('📁 Loaded from: serviceAccountKey.json');
  } else if (fs.existsSync('./unisync-c46e7-firebase-adminsdk-fbsvc-d712e701fd.json')) {
    serviceAccount = require('./unisync-c46e7-firebase-adminsdk-fbsvc-d712e701fd.json');
    console.log('📁 Loaded from: unisync-c46e7-firebase-adminsdk-fbsvc-d712e701fd.json');
  } else {
    throw new Error('No service account file found');
  }
} catch (error) {
  console.error('❌ Error loading service account file:', error.message);
  process.exit(1);
}

// Validate structure
console.log('\n🔍 Validating service account structure...');
const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
const missingFields = requiredFields.filter(field => !serviceAccount[field]);

if (missingFields.length > 0) {
  console.error('❌ Missing required fields:', missingFields.join(', '));
  process.exit(1);
}

console.log('✅ All required fields present');
console.log(`   Project ID: ${serviceAccount.project_id}`);
console.log(`   Client Email: ${serviceAccount.client_email}`);
console.log(`   Private Key Length: ${serviceAccount.private_key.length} characters`);

// Check private key format
console.log('\n🔍 Checking private key format...');
if (serviceAccount.private_key.includes('\\n')) {
  console.log('⚠️  Private key contains \\\\n (double backslash) - will be converted');
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

if (!serviceAccount.private_key.includes('\n')) {
  console.error('❌ Private key does not contain newline characters (\\n)');
  console.error('   This will cause authentication to fail');
  process.exit(1);
}

if (!serviceAccount.private_key.startsWith('-----BEGIN PRIVATE KEY-----')) {
  console.error('❌ Private key does not start with BEGIN PRIVATE KEY');
  process.exit(1);
}

if (!serviceAccount.private_key.endsWith('-----END PRIVATE KEY-----\n')) {
  console.error('❌ Private key does not end with END PRIVATE KEY');
  process.exit(1);
}

console.log('✅ Private key format looks correct');

// Test Firebase Admin initialization
console.log('\n🔍 Testing Firebase Admin initialization...');
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

// Test Firestore connection
console.log('\n🔍 Testing Firestore connection...');
const db = admin.firestore();

db.collection('_test_connection').limit(1).get()
  .then(() => {
    console.log('✅ Firestore connection successful!');
    console.log('\n🎉 All tests passed! Your service account is configured correctly.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Firestore connection failed:', error.message);
    console.error('   Error code:', error.code);
    
    if (error.code === 16) {
      console.error('\n⚠️  UNAUTHENTICATED error - Service account permissions issue');
      console.error('   Check that:');
      console.error('   1. Service account has "Firebase Admin SDK Administrator Service Agent" role');
      console.error('   2. Firestore is enabled in Firebase Console');
      console.error('   3. Service account is enabled in Google Cloud Console');
    }
    
    process.exit(1);
  });

