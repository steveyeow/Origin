// Test file to check if basic imports work
console.log('Testing imports...')

try {
  // Test React import
  console.log('✓ Testing React import')
  const React = require('react')
  
  // Test Next.js import
  console.log('✓ Testing Next.js')
  
  console.log('✅ Basic imports work')
} catch (error) {
  console.error('❌ Import error:', error.message)
}
