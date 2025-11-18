/**
 * Convert service account JSON to single-line format for environment variable
 * Usage: node convert-to-env-var.js
 */

const fs = require('fs');

// Try to load the new key file
let serviceAccount;
const keyFile = './unisync-c46e7-firebase-adminsdk-fbsvc-9a778ff288.json';

if (fs.existsSync(keyFile)) {
  serviceAccount = require(keyFile);
  console.log('📁 Loaded from:', keyFile);
} else if (fs.existsSync('./serviceAccountKey.json')) {
  serviceAccount = require('./serviceAccountKey.json');
  console.log('📁 Loaded from: serviceAccountKey.json');
} else {
  console.error('❌ No service account file found');
  process.exit(1);
}

// Convert to single-line JSON
const singleLineJson = JSON.stringify(serviceAccount);

console.log('\n✅ Converted to single-line JSON');
console.log('\n📋 Copy this and paste into Render FIREBASE_SERVICE_ACCOUNT environment variable:');
console.log('\n' + '='.repeat(80));
console.log(singleLineJson);
console.log('='.repeat(80));
console.log('\n💡 Tip: The JSON is ready to paste - it\'s already on one line with proper \\n for newlines');

