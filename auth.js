const fetch = require('node-fetch');

// Validerar Microsoft 365 access token genom att anropa Graph API
async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Inte inloggad. Logga in med Microsoft.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Validera token mot Microsoft Graph – om det fungerar är token giltig
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Ogiltig eller utgången inloggning.' });
    }

    const user = await response.json();

    // Kontrollera att användaren tillhör rätt tenant
    const allowedTenant = process.env.AZURE_TENANT_ID;
    if (allowedTenant && user.id) {
      // Hämta tenant-info för extra validering
      const orgResponse = await fetch(
        `https://graph.microsoft.com/v1.0/organization`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        const tenantId = orgData.value?.[0]?.id;
        if (tenantId && tenantId !== allowedTenant) {
          return res.status(403).json({ error: 'Du tillhör inte rätt organisation.' });
        }
      }
    }

    // Lägg till användarinfo på request-objektet
    req.user = {
      id: user.id,
      name: user.displayName,
      email: user.mail || user.userPrincipalName,
      token
    };

    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(500).json({ error: 'Autentiseringsfel. Försök igen.' });
  }
}

module.exports = { requireAuth };
