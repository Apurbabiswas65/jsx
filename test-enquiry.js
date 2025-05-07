const fetch = require('node-fetch');

(async () => {
  try {
    const response = await fetch('http://localhost:3000/api/enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: 1,
        userId: 1,
        ownerId: 2,
        propertyDetails: {
          title: 'Test Property',
          ownerName: 'Owner Name',
          rentTerms: 'Monthly',
          extraCharges: 'None',
        },
      }),
    });

    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
})();