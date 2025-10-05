const axios = require('axios');

const testcases = [
    { "sourceCity": "mumbai", "destCity": "tokyo" },
    { "sourceCity": "mumbai", "destCity": "seoul" },
    { "sourceCity": "mumbai", "destCity": "singapore" },
    { "sourceCity": "mumbai", "destCity": "doha" },
    { "sourceCity": "mumbai", "destCity": "islamabad" },
    { "sourceCity": "mumbai", "destCity": "colombo" },

    { "sourceCity": "chennai", "destCity": "bangkok" },
    { "sourceCity": "chennai", "destCity": "jakarta" },
    { "sourceCity": "chennai", "destCity": "kuala lumpur" },
    { "sourceCity": "chennai", "destCity": "dubai" },
    { "sourceCity": "chennai", "destCity": "doha" },
    { "sourceCity": "chennai", "destCity": "tokyo" },

    { "sourceCity": "delhi", "destCity": "shanghai" },
    { "sourceCity": "delhi", "destCity": "hong kong" },
    { "sourceCity": "delhi", "destCity": "bali" },
    { "sourceCity": "delhi", "destCity": "hanoi" },
    { "sourceCity": "delhi", "destCity": "tashkent" },
    { "sourceCity": "delhi", "destCity": "riyadh" },

    { "sourceCity": "bangalore", "destCity": "manila" },
    { "sourceCity": "bangalore", "destCity": "tokyo" },
    { "sourceCity": "bangalore", "destCity": "taipei" },
    { "sourceCity": "bangalore", "destCity": "colombo" },
    { "sourceCity": "bangalore", "destCity": "hanoi" },

    { "sourceCity": "hyderabad", "destCity": "kathmandu" },
    { "sourceCity": "hyderabad", "destCity": "dubai" },
    { "sourceCity": "hyderabad", "destCity": "riyadh" },
    { "sourceCity": "hyderabad", "destCity": "singapore" },
    { "sourceCity": "hyderabad", "destCity": "jakarta" },

    { "sourceCity": "kolkata", "destCity": "yangon" },
    { "sourceCity": "kolkata", "destCity": "bangkok" },
    { "sourceCity": "kolkata", "destCity": "hanoi" },
    { "sourceCity": "kolkata", "destCity": "dhaka" },
    { "sourceCity": "kolkata", "destCity": "tokyo" },

    { "sourceCity": "tokyo", "destCity": "seoul" },
    { "sourceCity": "tokyo", "destCity": "taipei" },
    { "sourceCity": "tokyo", "destCity": "hong kong" },
    { "sourceCity": "tokyo", "destCity": "singapore" },
    { "sourceCity": "tokyo", "destCity": "hanoi" },

    { "sourceCity": "beijing", "destCity": "bangkok" },
    { "sourceCity": "beijing", "destCity": "seoul" },
    { "sourceCity": "beijing", "destCity": "tokyo" },
    { "sourceCity": "beijing", "destCity": "kuala lumpur" },
    { "sourceCity": "beijing", "destCity": "singapore" },

    { "sourceCity": "dubai", "destCity": "mumbai" },
    { "sourceCity": "dubai", "destCity": "delhi" },
    { "sourceCity": "dubai", "destCity": "colombo" },
    { "sourceCity": "dubai", "destCity": "bangkok" },
    { "sourceCity": "dubai", "destCity": "jakarta" },

    { "sourceCity": "singapore", "destCity": "bangkok" },
    { "sourceCity": "singapore", "destCity": "hanoi" },
    { "sourceCity": "singapore", "destCity": "tokyo" },
    { "sourceCity": "singapore", "destCity": "manila" },
    { "sourceCity": "singapore", "destCity": "jakarta" }
];


testcases.forEach(async (testcase, index) => {
    setTimeout(async () => {
        console.log(`\nTest Case ${index + 1}: ${testcase.sourceCity} -> ${testcase.destCity}`);
        const response = await axios.post('http://localhost:5000/api/flights/route-scenery', {
            sourceCity: testcase.sourceCity,
            destCity: testcase.destCity
        }).catch(err => {
            console.error('Error:', err.response ? err.response.data : err.message);
        });
    }, 30000 * index); // stagger requests by 30 seconds to avoid rate limiting
    setTimeout(async () => {
        console.log(`\nTest Case ${index + 1}: ${testcase.sourceCity} -> ${testcase.destCity}`);
        const response = await axios.post('http://localhost:5000/api/flights/route-scenery', {
            sourceCity: testcase.destCity,
            destCity: testcase.sourceCity
        }).catch(err => {
            console.error('Error:', err.response ? err.response.data : err.message);
        });
    }, 30000 * index);
});

console.log("\nAll test cases processed.\n");