const ISP_HINTS = {
  PLDT:     { adminUrl: '192.168.1.1',        defaultUser: 'admin', defaultPass: '1234 or adminpldt',           note: 'PLDT Fibr routers often ship with admin/1234. Change immediately.' },
  Globe:    { adminUrl: '192.168.254.254',     defaultUser: 'user',  defaultPass: 'user',                       note: 'Globe At Home defaults to user/user. Access 192.168.254.254 to update.' },
  Converge: { adminUrl: '192.168.1.1',         defaultUser: 'admin', defaultPass: 'printed on label',           note: 'Converge ICT uses a unique label password, but admin username is still default.' },
  Sky:      { adminUrl: '192.168.0.1',         defaultUser: 'admin', defaultPass: 'sky12345 or on device label',note: 'Sky Cable routers vary by modem model. Check rear label.' },
  DITO:     { adminUrl: '192.168.1.1',         defaultUser: 'admin', defaultPass: 'admin',                      note: 'DITO routers often retain admin/admin defaults. Update before use.' },
  Other:    { adminUrl: '192.168.1.1 or .0.1', defaultUser: 'admin', defaultPass: 'admin or on label',          note: 'Check the sticker on your router for default credentials.' },
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { isp } = req.query;
  const hint = ISP_HINTS[isp] || ISP_HINTS['Other'];
  res.json({ isp, ...hint });
}
