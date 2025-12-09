// Test OPTIONS request
fetch('https://functions.poehali.dev/6ab5e5ca-f93c-438c-bc46-7eb7a75e2734', {
  method: 'OPTIONS'
})
  .then(response => {
    console.log('Status Code:', response.status);
    console.log('Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
    console.log('\nAll CORS headers:');
    response.headers.forEach((value, key) => {
      if (key.toLowerCase().startsWith('access-control')) {
        console.log(`${key}: ${value}`);
      }
    });
  })
  .catch(error => console.error('Error:', error));
