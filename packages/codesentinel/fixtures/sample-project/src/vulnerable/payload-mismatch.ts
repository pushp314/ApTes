// Backend Route Definition
const app = {
  post: (route: string, handler: any) => {}
};

app.post('/api/update-profile', (req: any) => {
  // Backend expects 'email' and 'age'
  const userEmail = req.body.email;
  const { age } = req.body;
});

// Frontend Fetch Call
async function updateProfile() {
  // Frontend forgets 'age' and sends 'name' instead of 'email'
  await fetch('/api/update-profile', {
    method: 'POST',
    body: JSON.stringify({
      name: 'John Doe'
    })
  });
}
