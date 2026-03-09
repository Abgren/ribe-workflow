// Autentisering tillfälligt inaktiverad
// Microsoft 365-login läggs till i nästa version
async function requireAuth(req, res, next) {
  req.user = { name: 'Användare' };
  next();
}

module.exports = { requireAuth };
