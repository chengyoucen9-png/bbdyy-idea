const bcrypt = require('bcrypt');

const password = '123456';
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
  } else {
    console.log('Generated hash:', hash);
  }
});
