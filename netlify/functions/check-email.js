import dns from 'dns/promises';

export const handler = async (event) => {
  // CORS-Header für lokale Entwicklung
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};
    const { email } = body;

    // Validate email format
    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          valid: false, 
          message: 'Ungültige E-Mail-Adresse' 
        }),
      };
    }

    // Extract domain
    const domain = email.split('@')[1];
    
    // Validate domain
    if (!domain || domain.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          valid: false, 
          message: 'Ungültige Domain' 
        }),
      };
    }

    // Perform MX lookup
    let mxRecords = [];
    try {
      mxRecords = await dns.resolveMx(domain);
    } catch (dnsError) {
      // No MX records found or DNS error
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          valid: false, 
          domain,
          message: `Keine MX-Records für ${domain} gefunden. Die Domain hat keinen konfigurierten Mailserver.`,
        }),
      };
    }

    // Check if MX records exist
    if (mxRecords.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          valid: false, 
          domain,
          message: `Keine MX-Records für ${domain} gefunden.`,
        }),
      };
    }

    // Sort by priority (lower number = higher priority)
    mxRecords.sort((a, b) => a.priority - b.priority);
    const hosts = mxRecords.map((m) => m.exchange);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        domain,
        mx: hosts,
        mxDetails: mxRecords.map((m) => ({
          host: m.exchange,
          priority: m.priority,
        })),
        message: `Mailserver erreichbar: ${hosts.join(', ')}`,
      }),
    };
  } catch (err) {
    console.error('Error checking email:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        valid: false, 
        error: err.message,
        message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
      }),
    };
  }
};

