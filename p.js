const axios = require("axios");

// API endpoint
const API_URL = "https://flybyviews.onrender.com/api/flights/route-scenery";

// Test cases: Indian source cities → Asian destinations
const testCases = [
  { sourceCity: "mumbai", destCity: "Kathmandu", departureTime: "2025-10-17T19:02" },
  { sourceCity: "mumbai", destCity: "Bangkok", departureTime: "2025-10-17T19:17" },
  { sourceCity: "mumbai", destCity: "Singapore", departureTime: "2025-10-17T19:32" },
  { sourceCity: "mumbai", destCity: "Kuala Lumpur", departureTime: "2025-10-17T19:47" },
  { sourceCity: "mumbai", destCity: "Tokyo", departureTime: "2025-10-17T20:02" },
  { sourceCity: "mumbai", destCity: "Seoul", departureTime: "2025-10-17T20:17" },
  { sourceCity: "mumbai", destCity: "Dubai", departureTime: "2025-10-17T20:32" },
  { sourceCity: "mumbai", destCity: "Hanoi", departureTime: "2025-10-17T20:47" }
];

// Function to send POST request
async function sendPostRequest(data) {
  try {
    const response = await axios.post(API_URL, data);
    console.log(`✅ Success: ${data.sourceCity} → ${data.destCity}`);
    console.log("Response:", response.data);
  } catch (error) {
    console.error(`❌ Error for ${data.sourceCity} → ${data.destCity}:`, error.response ? error.response.data : error.message);
  }
}

// Sequentially send requests with 15s delay
async function runTests() {
  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    console.log(`\n🛫 Sending request ${i + 1}/${testCases.length}: ${test.sourceCity} → ${test.destCity}`);
    await sendPostRequest(test);
    if (i < testCases.length - 1) {
      console.log("⏳ Waiting 15 seconds before next request...");
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15-second delay
    }
  }
  console.log("\n✅ All test cases completed.");
}

// Run the test suite
runTests();
