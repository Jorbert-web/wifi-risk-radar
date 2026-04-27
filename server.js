/**
 * Wi-Fi RiskRadar — Backend API
 * server.js  |  Node.js + Express
 * Run: node server.js  (port 4000)
 */

const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());

/* ═══════════════════════════════════════════════════════════════
   IN-MEMORY AUDIT TRAIL
═══════════════════════════════════════════════════════════════ */
const auditTrail = [];

/* ═══════════════════════════════════════════════════════════════
   SCORING ENGINE  —  higher score = MORE vulnerable
═══════════════════════════════════════════════════════════════ */
const SCORE_MAP = {
  encryption:   { WPA3: 0, WPA2: 5, WPA: 20, WEP: 40, OPEN: 50 },
  adminCreds:   { changed: 0, passwordOnly: 15, default: 35 },
  passphrase:   { strong: 0, moderate: 10, weak: 20, none: 25 },
  firmware:     { upToDate: 0, unknown: 8, outdated: 18 },
  wps:          { disabled: 0, enabled: 12 },
  guestNetwork: { isolated: 0, shared: 8, none: 0 },
};

function calcScore(a) {
  return Math.min(100,
    (SCORE_MAP.encryption[a.encryption]     ?? 20) +
    (SCORE_MAP.adminCreds[a.adminCreds]     ?? 20) +
    (SCORE_MAP.passphrase[a.passphrase]     ?? 12) +
    (SCORE_MAP.firmware[a.firmware]         ??  8) +
    (SCORE_MAP.wps[a.wps]                   ??  6) +
    (SCORE_MAP.guestNetwork[a.guestNetwork] ??  4)
  );
}

function getTier(score) {
  if (score <= 15) return { tier: 'Low',      hex: '#00e5a0', label: 'Secure'   };
  if (score <= 40) return { tier: 'Medium',   hex: '#f5c518', label: 'Caution'  };
  if (score <= 65) return { tier: 'High',     hex: '#ff8c42', label: 'At Risk'  };
  return              { tier: 'Critical', hex: '#ff3b5c', label: 'Critical' };
}

const ISP_HINTS = {
  PLDT:     { adminUrl: '192.168.1.1',      defaultUser: 'admin', defaultPass: '1234 or adminpldt',          note: 'PLDT Fibr routers often ship with admin/1234. Change immediately.' },
  Globe:    { adminUrl: '192.168.254.254',  defaultUser: 'user',  defaultPass: 'user',                       note: 'Globe At Home defaults to user/user. Access 192.168.254.254 to update.' },
  Converge: { adminUrl: '192.168.1.1',      defaultUser: 'admin', defaultPass: 'printed on label',           note: 'Converge ICT uses a unique label password, but admin username is still default.' },
  Sky:      { adminUrl: '192.168.0.1',      defaultUser: 'admin', defaultPass: 'sky12345 or on device label',note: 'Sky Cable routers vary by modem model. Check rear label.' },
  DITO:     { adminUrl: '192.168.1.1',      defaultUser: 'admin', defaultPass: 'admin',                      note: 'DITO routers often retain admin/admin defaults. Update before use.' },
  Other:    { adminUrl: '192.168.1.1 or .0.1', defaultUser: 'admin', defaultPass: 'admin or on label',       note: 'Check the sticker on your router for default credentials.' },
};

function buildRecommendations(answers, isp) {
  const recs = [];
  const hint = ISP_HINTS[isp] || ISP_HINTS['Other'];

  if (answers.encryption !== 'WPA3') {
    recs.push({ category: 'Encryption', severity: answers.encryption === 'WEP' || answers.encryption === 'OPEN' ? 'critical' : 'high',
      title: `Upgrade from ${answers.encryption} Encryption`,
      detail: answers.encryption === 'WEP'
        ? 'WEP (Wired Equivalent Privacy) was deprecated in 2004. It can be cracked in under 60 seconds using Aircrack-ng — enabling Evil Twin and MITM attacks on your network. Navigate to Wireless Settings → Security Mode → WPA3.'
        : answers.encryption === 'OPEN'
        ? 'An open network broadcasts all traffic unencrypted. Any nearby device can intercept passwords and sessions using Wireshark. Enable WPA3 encryption immediately.'
        : 'WPA (original) has known TKIP vulnerabilities exploitable via KRACK attacks. Upgrade to WPA3 or at minimum WPA2-AES.',
    });
  }

  if (answers.adminCreds !== 'changed') {
    recs.push({ category: 'Admin Credentials', severity: answers.adminCreds === 'default' ? 'critical' : 'high',
      title: 'Change Router Admin Password',
      detail: `${answers.adminCreds === 'default'
        ? `Default credentials for ${isp} routers (${hint.defaultUser} / ${hint.defaultPass}) are publicly documented. Automated scanners find and exploit these within seconds.`
        : 'Only changing the Wi-Fi password leaves your admin panel exposed with factory defaults.'
      } Go to ${hint.adminUrl} → Administration → Change admin password. ${hint.note}`,
    });
  }

  if (['weak', 'none'].includes(answers.passphrase)) {
    recs.push({ category: 'Passphrase Strength', severity: answers.passphrase === 'none' ? 'critical' : 'high',
      title: 'Strengthen Your Wi-Fi Passphrase',
      detail: 'Short or absent passphrases are vulnerable to WPA Handshake Capture attacks — an attacker captures the 4-way handshake and brute-forces offline with Hashcat. Use 16+ characters with uppercase, lowercase, numbers, and symbols. Avoid names, birthdays, or dictionary words.',
    });
  }

  if (answers.firmware !== 'upToDate') {
    recs.push({ category: 'Firmware', severity: answers.firmware === 'outdated' ? 'high' : 'medium',
      title: 'Update Router Firmware',
      detail: 'Unpatched firmware is the primary vector for remote exploitation. CVE-2022-30525 (Zyxel) and multiple PH ISP router CVEs allowed unauthenticated remote code execution. Check ISP app (GlobeOne / MyPLDT) or admin → Firmware Upgrade.',
    });
  }

  if (answers.wps === 'enabled') {
    recs.push({ category: 'WPS', severity: 'high',
      title: 'Disable WPS (Wi-Fi Protected Setup)',
      detail: 'The Pixie Dust Attack exploits a WPS PIN flaw — recovering the 8-digit PIN in ~11,000 guesses (under 30 seconds with Reaver). Once done, the full WPA passphrase is exposed. Disable in admin → Wireless → WPS.',
    });
  }

  if (answers.guestNetwork === 'shared') {
    recs.push({ category: 'Guest Network', severity: 'medium',
      title: 'Enable Guest Network Isolation',
      detail: 'Without isolation, guest devices can perform lateral movement — scanning and attacking your smart home devices, NAS drives, and computers on the main LAN. Enable AP Isolation in admin → Wireless → Guest Network.',
    });
  }

  return recs;
}

/* ═══════════════════════════════════════════════════════════════
   ROUTES
═══════════════════════════════════════════════════════════════ */
app.post('/api/analyze', (req, res) => {
  const { answers, isp = 'Other', deviceModel = '' } = req.body;
  if (!answers) return res.status(400).json({ error: 'answers object required' });

  const score  = calcScore(answers);
  const riskMeta = getTier(score);
  const record = {
    id:          Date.now(),
    timestamp:   new Date().toISOString(),
    isp,
    deviceModel: deviceModel || 'Unknown Device',
    score,
    ...riskMeta,
    answers,
    recommendations: buildRecommendations(answers, isp),
    ispHint:     ISP_HINTS[isp] || ISP_HINTS['Other'],
  };

  auditTrail.push(record);
  res.json(record);
});

app.get('/api/history', (_req, res) => {
  res.json([...auditTrail].reverse());
});

app.get('/api/isp-hint/:isp', (req, res) => {
  const hint = ISP_HINTS[req.params.isp] || ISP_HINTS['Other'];
  res.json({ isp: req.params.isp, ...hint });
});

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', records: auditTrail.length }));

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`\n  Wi-Fi RiskRadar API  ->  http://localhost:${PORT}`);
  console.log(`  POST /api/analyze`);
  console.log(`  GET  /api/history`);
  console.log(`  GET  /api/isp-hint/:isp\n`);
});

module.exports = app;
