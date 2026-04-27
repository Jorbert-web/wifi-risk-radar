/**
 * Wi-Fi RiskRadar — Frontend
 * App.js  |  React (Single-File Component)
 *
 * Usage with CRA:
 *   1. npx create-react-app wifi-riskradar
 *   2. Replace src/App.js contents with this file's default export
 *   3. npm start
 *
 * Usage standalone:
 *   Paste into any React environment (CodeSandbox, StackBlitz, etc.)
 *   Ensure React 18+ is available.
 */

import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────────────────────── */
const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:4001/api';

const ISP_LIST = ["PLDT", "Globe", "Converge", "Sky", "DITO", "Other"];

const QUESTIONS = [
  {
    key: "encryption",
    label: "Wireless Encryption Protocol",
    tooltip: "Evil Twin & MITM Risk — Weak encryption lets attackers impersonate your router and intercept all traffic. WPA3 uses SAE (Simultaneous Authentication of Equals) making offline dictionary attacks impossible.",
    opts: [
      { val: "WPA3",  label: "WPA3",         score: 0,  desc: "Latest standard — SAE handshake" },
      { val: "WPA2",  label: "WPA2",          score: 5,  desc: "Acceptable — use AES, not TKIP" },
      { val: "WPA",   label: "WPA (original)",score: 20, desc: "Vulnerable — TKIP weaknesses" },
      { val: "WEP",   label: "WEP",           score: 40, desc: "Deprecated — cracked in <60s" },
      { val: "OPEN",  label: "Open / None",   score: 50, desc: "Critical — no encryption at all" },
    ],
  },
  {
    key: "adminCreds",
    label: "Router Admin Credentials",
    tooltip: "Default Credential Exploitation — Factory admin passwords are published on sites like RouterPasswords.com and exploited by automated scanners within seconds of LAN access. Shodan indexes thousands of PH routers with default logins.",
    opts: [
      { val: "changed",      label: "Both Username & Password Changed", score: 0  },
      { val: "passwordOnly", label: "Only Wi-Fi Password Changed",       score: 15 },
      { val: "default",      label: "Still Using Factory Defaults",      score: 35 },
    ],
  },
  {
    key: "passphrase",
    label: "Wi-Fi Passphrase Strength",
    tooltip: "WPA Handshake Attack — An attacker captures the 4-way handshake when any device connects, then brute-forces it offline using GPU clusters. A 16+ char passphrase with mixed characters would take thousands of years to crack.",
    opts: [
      { val: "strong",   label: "Strong — 16+ chars, mixed",    score: 0  },
      { val: "moderate", label: "Moderate — 8–15 chars",        score: 10 },
      { val: "weak",     label: "Weak — under 8 chars",         score: 20 },
      { val: "none",     label: "No Password",                  score: 25 },
    ],
  },
  {
    key: "firmware",
    label: "Router Firmware Status",
    tooltip: "CVE Exploitation — ISP-provided routers often lag 12–24 months on patches. CVE-2022-30525 (Zyxel) allowed unauthenticated RCE on widely deployed PH ISP hardware. Unpatched firmware is the #1 gateway for persistent access.",
    opts: [
      { val: "upToDate", label: "Up to Date",   score: 0  },
      { val: "unknown",  label: "Not Sure",     score: 8  },
      { val: "outdated", label: "Outdated",     score: 18 },
    ],
  },
  {
    key: "wps",
    label: "WPS (Wi-Fi Protected Setup) Status",
    tooltip: "Pixie Dust Attack — WPS PIN mode has a fatal design flaw allowing recovery of the full 8-digit PIN in ~11,000 guesses using Reaver or Bully — completed in under 30 seconds. Once the PIN is known, the full WPA passphrase is exposed.",
    opts: [
      { val: "disabled", label: "WPS Disabled", score: 0  },
      { val: "enabled",  label: "WPS Enabled",  score: 12 },
    ],
  },
  {
    key: "guestNetwork",
    label: "Guest Network Configuration",
    tooltip: "Lateral Movement Risk — Without AP Isolation, a guest device can enumerate and attack your smart home devices, NAS, cameras, and main PCs. Common pivot point in insider threat and social engineering scenarios.",
    opts: [
      { val: "isolated", label: "Isolated Guest Network",    score: 0 },
      { val: "shared",   label: "Guest on Same LAN",         score: 8 },
      { val: "none",     label: "No Guest Network Needed",   score: 0 },
    ],
  },
];

const RESOURCES = [
  {
    icon: "sword-icon.png",
    color: "#ff3b5c",
    tag: "Attack Vector",
    title: "Evil Twin Attack",
    body: "A rogue access point clones your SSID with a stronger signal. Devices auto-connect, routing all traffic through the attacker. Common in malls, cafés, and university campuses across the Philippines.",
  },
  {
    icon: "spy-icon.png",
    color: "#ff8c42",
    tag: "Interception",
    title: "Man-in-the-Middle (MITM)",
    body: "With router access or ARP spoofing, an attacker sits between you and the internet — decrypting HTTPS via SSL stripping, injecting malicious scripts, and harvesting credentials in real time.",
  },
  {
    icon: "unlock-icon.png",
    color: "#f5c518",
    tag: "Vulnerability",
    title: "Pixie Dust / WPS Exploit",
    body: "A mathematical flaw in WPS authentication allows full PIN recovery in under 30 seconds using Reaver. Once the PIN is known, the router's WPA passphrase is trivially exposed.",
  },
  {
    icon: "radar-icon.png",
    color: "#007ACC",
    tag: "Rogue DHCP",
    title: "Rogue DHCP Server",
    body: "An attacker on your network runs a fake DHCP server, assigning themselves as default gateway. All traffic flows through their machine — invisible to the victim.",
  },
  {
    icon: "search-icon.png",
    color: "#00e5a0",
    tag: "Reconnaissance",
    title: "Shodan & Default Creds",
    body: "Shodan continuously scans Philippine IP ranges for routers using factory defaults. PLDT, Globe, and Converge hardware appears in thousands of Shodan results with known admin credentials.",
  },
  {
    icon: "database-icon.png",
    color: "#9b59b6",
    tag: "Patch Management",
    title: "Router Firmware CVEs",
    body: "CVE-2022-30525 allowed unauthenticated remote code execution on Zyxel devices widely deployed by Philippine ISPs. ISP routers are rarely auto-updated — check your admin panel monthly.",
  },
];

/* ─────────────────────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --cyber-blue:    #00d4ff;
  --cyber-purple:  #7c3aed;
  --cyber-pink:    #ec4899;
  --cyber-green:   #10b981;
  --cyber-yellow:  #f59e0b;
  --cyber-red:     #ef4444;
  --neon-cyan:     #00ffff;
  --neon-magenta:  #ff00ff;
  --neon-lime:     #00ff00;
  --vsc:           #00d4ff;
  --vsc-dim:       #0099cc;
  --vsc-glow:      rgba(0, 212, 255, 0.5);
  --vsc-trace:     rgba(0, 212, 255, 0.12);
  --night:         #000000;
  --night2:        #0a0a0f;
  --night3:        #1a1a2e;
  --night4:        #16213e;
  --border:        rgba(0, 212, 255, 0.2);
  --border2:       rgba(0, 212, 255, 0.4);
  --border-glow:   rgba(236, 72, 153, 0.3);
  --text:          #f8fafc;
  --text2:         #e2e8f0;
  --text3:         #94a3b8;
  --teal:          #10b981;
  --yellow:        #f59e0b;
  --orange:        #f97316;
  --red:           #ef4444;
  --font-head:     'Orbitron', sans-serif;
  --font-body:     'Space Grotesk', sans-serif;
  --font-mono:     'JetBrains Mono', monospace;
}

html, body, #root {
  min-height: 100vh;
  background: 
    /* Clean dark background */
    radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.03) 0%, transparent 50%),
    linear-gradient(180deg, #0f0f23 0%, #1a1a2e 100%);
  color: var(--text);
  font-family: var(--font-body);
  overflow-x: hidden;
  position: relative;
}

body::before {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 212, 255, 0.03) 2px,
      rgba(0, 212, 255, 0.03) 4px
    );
  pointer-events: none;
  z-index: 1;
}

::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: var(--night2); }
::-webkit-scrollbar-thumb { background: var(--vsc-dim); border-radius: 3px; }

/* ── ADVANCED CANVAS BACKGROUND ── */
#nodeCanvas {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none; opacity: 0.15;
  filter: blur(0.5px);
}

/* ── RESPONSIVE TYPOGRAPHY SYSTEM ── */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-head);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

/* Base font sizes - Desktop */
h1 { font-size: clamp(2rem, 4vw, 3rem); }
h2 { font-size: clamp(1.5rem, 3vw, 2.5rem); }
h3 { font-size: clamp(1.25rem, 2.5vw, 2rem); }
h4 { font-size: clamp(1.125rem, 2vw, 1.5rem); }
h5 { font-size: clamp(1rem, 1.5vw, 1.25rem); }
h6 { font-size: clamp(0.875rem, 1.25vw, 1rem); }

/* Responsive breakpoints */
:root {
  --mobile: 480px;
  --tablet: 768px;
  --desktop: 1024px;
  --large: 1440px;
}

/* Container system */
.rr-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 768px) {
  .rr-container {
    padding: 0 2rem;
  }
}

@media (min-width: 1024px) {
  .rr-container {
    padding: 0 3rem;
  }
}

.text-gradient {
  background: linear-gradient(135deg, var(--vsc) 0%, var(--cyber-purple) 50%, var(--cyber-pink) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.text-shadow-glow {
  text-shadow: 
    0 0 20px rgba(0, 212, 255, 0.5),
    0 0 40px rgba(0, 212, 255, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.5);
}

/* ── HOLOGRAPHIC EFFECTS ── */
@keyframes hologram-flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
  75% { opacity: 0.9; }
}

@keyframes glitch {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
}

.cyber-glitch {
  animation: glitch 0.3s ease-in-out infinite;
}

.cyber-flicker {
  animation: hologram-flicker 2s ease-in-out infinite;
}

/* ── RESPONSIVE NAVIGATION ── */
.rr-nav {
  position: sticky; top: 0; z-index: 200;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 1rem; height: 64px;
  background: rgba(15, 15, 35, 0.8);
  backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  position: relative;
}

@media (min-width: 768px) {
  .rr-nav {
    padding: 0 2rem;
  }
}

@media (min-width: 1024px) {
  .rr-nav {
    padding: 0 3rem;
  }
}

/* Horizontal scroll navigation */
.rr-nav-links {
  display: flex; 
  gap: 4px; 
  overflow-x: auto;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 0.5rem 0;
}

.rr-nav-links::-webkit-scrollbar {
  display: none;
}

@media (min-width: 768px) {
  .rr-nav-links {
    gap: 6px;
    overflow-x: visible;
  }
}

.rr-nav::before {
  content: '';
  position: absolute; inset: 0;
  background: 
    linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.1), transparent);
  animation: nav-scan 3s ease-in-out infinite;
}

@keyframes nav-scan {
  0%, 100% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
}

.rr-brand {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--font-head); font-size: 0.9rem;
  font-weight: 700; color: var(--text); 
  letter-spacing: 0.05em;
  position: relative;
  z-index: 2;
}

@media (min-width: 768px) {
  .rr-brand {
    gap: 12px;
    font-size: 1rem;
  }
}

.rr-brand-icon {
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.9rem;
  color: var(--vsc);
  position: relative;
  overflow: hidden;
}

@media (min-width: 768px) {
  .rr-brand-icon {
    width: 36px; height: 36px;
    font-size: 1rem;
  }
}

.rr-brand-icon::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  animation: icon-shine 2s ease-in-out infinite;
}

@keyframes icon-shine {
  0%, 100% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
}
.rr-nav-links { 
  display: flex; 
  gap: 4px; 
}

@media (min-width: 768px) {
  .rr-nav-links {
    gap: 6px;
  }
}

.rr-nl {
  padding: 0.4rem 0.8rem; border-radius: 6px; 
  background: transparent;
  border: 1px solid transparent;
  color: var(--text2);
  font-family: var(--font-body); font-size: 0.8rem; font-weight: 500;
  cursor: pointer; 
  transition: all 0.2s ease; 
  position: relative;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: fit-content;
}

@media (min-width: 768px) {
  .rr-nl {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}

.rr-nl::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(45deg, var(--cyber-blue), var(--cyber-purple));
  opacity: 0;
  transition: opacity 0.3s;
}

.rr-nl:hover {
  color: var(--text); 
  background: rgba(99, 102, 241, 0.1);
}

.rr-nl.active {
  color: var(--text); 
  background: rgba(99, 102, 241, 0.15);
  font-weight: 600;
}

.rr-nl.active::before {
  opacity: 0;
}

/* ── PAGES ── */
.rr-page { display: none; animation: rr-fade 0.4s ease; position: relative; z-index: 1; }
.rr-page.show { display: block; }
@keyframes rr-fade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

/* ── HERO ── */
.rr-hero {
  min-height: calc(100vh - 70px);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center; padding: 3rem 1.5rem;
  position: relative;
  z-index: 10;
}

.rr-hero::before {
  content: '';
  position: absolute; inset: 0;
  background: 
    radial-gradient(circle at 50% 50%, rgba(0, 212, 255, 0.05) 0%, transparent 70%),
    radial-gradient(circle at 30% 70%, rgba(236, 72, 153, 0.03) 0%, transparent 60%);
  pointer-events: none;
}
.rr-pulse-badge {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 8px 20px; border-radius: 100px;
  border: 2px solid var(--cyber-blue);
  background: 
    linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%);
  font-family: var(--font-mono); font-size: 0.7rem;
  color: var(--cyber-blue); letter-spacing: 0.15em; text-transform: uppercase;
  margin-bottom: 2.5rem;
  box-shadow: 
    0 0 20px rgba(0, 212, 255, 0.4),
    inset 0 0 10px rgba(0, 212, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.rr-pulse-badge::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.2), transparent);
  animation: badge-scan 2s linear infinite;
}

@keyframes badge-scan {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.rr-pulse-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--neon-cyan);
  box-shadow: 
    0 0 10px var(--neon-cyan),
    0 0 20px var(--neon-cyan),
    0 0 30px var(--neon-cyan);
  animation: rr-pulse 1.5s ease-in-out infinite;
  position: relative;
}

.rr-pulse-dot::after {
  content: '';
  position: absolute; inset: -2px;
  border-radius: 50%;
  border: 1px solid var(--neon-cyan);
  animation: pulse-ring 1.5s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0; }
}

@keyframes rr-pulse { 
  0%,100%{opacity:1;transform:scale(1)} 
  50%{opacity:0.6;transform:scale(1.2)} 
}

.rr-hero h1 {
  font-family: var(--font-head);
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 900; line-height: 1.02;
  letter-spacing: 0.08em; color: #fff;
  margin-bottom: 2rem;
  text-shadow: 
    0 0 25px rgba(0, 212, 255, 0.5),
    0 0 50px rgba(0, 212, 255, 0.3),
    0 0 75px rgba(124, 58, 237, 0.2);
  position: relative;
  z-index: 2;
}

.rr-hero h1::before {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  background: linear-gradient(45deg, var(--cyber-blue), var(--cyber-purple), var(--cyber-pink));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  z-index: -1;
  opacity: 0.8;
  filter: blur(2px);
}

.rr-hero h1 .rr-accent {
  background: linear-gradient(90deg, var(--neon-cyan), var(--cyber-blue), var(--cyber-purple));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  animation: text-glow 2s ease-in-out infinite alternate;
}

@keyframes text-glow {
  0% { filter: brightness(1) drop-shadow(0 0 20px rgba(0, 212, 255, 0.5)); }
  100% { filter: brightness(1.2) drop-shadow(0 0 30px rgba(0, 212, 255, 0.8)); }
}
.rr-tagline {
  font-size: 1.1rem; line-height: 1.8; color: var(--text2);
  max-width: 600px; margin-bottom: 3rem;
  font-weight: 400;
  position: relative; z-index: 2;
}

.rr-hero-meta {
  display: flex; gap: 4rem; margin-bottom: 3.5rem; flex-wrap: wrap; justify-content: center;
  position: relative; z-index: 2;
}

.rr-meta-item { 
  text-align: center; 
  position: relative;
  padding: 1.5rem;
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 12px;
  background: rgba(0, 212, 255, 0.05);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.rr-meta-item:hover {
  transform: translateY(-5px);
  border-color: var(--cyber-blue);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
}

.rr-meta-n {
  font-family: var(--font-mono); font-size: 2.2rem;
  font-weight: 700; color: var(--cyber-blue);
  text-shadow: 
    0 0 20px rgba(0, 212, 255, 0.6),
    0 0 40px rgba(0, 212, 255, 0.3);
  display: block;
  margin-bottom: 0.5rem;
}

.rr-meta-l { 
  font-size: 0.65rem; color: var(--text3); 
  text-transform: uppercase; letter-spacing: 0.15em; 
  font-family: var(--font-mono); font-weight: 500;
}

.rr-cta {
  padding: 1.2rem 3.5rem; border-radius: 50px; border: 2px solid var(--cyber-blue);
  background: 
    linear-gradient(135deg, var(--cyber-blue) 0%, var(--cyber-purple) 100%);
  cursor: pointer;
  font-family: var(--font-head); font-weight: 800; font-size: 0.85rem;
  color: var(--night); letter-spacing: 0.15em; text-transform: uppercase;
  box-shadow: 
    0 0 30px rgba(0, 212, 255, 0.6),
    0 0 60px rgba(0, 212, 255, 0.3),
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative; overflow: hidden;
  z-index: 2;
}

.rr-cta::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%);
  animation: cta-shine 3s ease-in-out infinite;
}

@keyframes cta-shine {
  0%, 100% { transform: translateX(-100%); }
  50% { transform: translateX(100%); }
}

.rr-cta:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 
    0 0 40px rgba(0, 212, 255, 0.8),
    0 0 80px rgba(0, 212, 255, 0.4),
    0 12px 40px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border-color: var(--neon-cyan);
}

/* ── RESPONSIVE SECTION ── */
.rr-section { 
  max-width: 1200px; 
  margin: 0 auto; 
  padding: 2rem 1rem 4rem; 
}

@media (min-width: 768px) {
  .rr-section {
    padding: 3rem 2rem 6rem;
  }
}

@media (min-width: 1024px) {
  .rr-section {
    padding: 4rem 3rem 8rem;
  }
}

.rr-section-head { 
  margin-bottom: 2rem; 
}

@media (min-width: 768px) {
  .rr-section-head {
    margin-bottom: 2.5rem;
  }
}
.rr-section-title {
  font-family: var(--font-head); font-size: 1.75rem; font-weight: 700;
  color: var(--text); margin-bottom: 1rem;
  line-height: 1.3;
  position: relative;
  display: inline-block;
}

.rr-section-title::after {
  content: '';
  position: absolute; bottom: -8px; left: 0;
  width: 100%; height: 2px;
  background: linear-gradient(90deg, var(--cyber-blue), transparent);
  animation: title-underline 2s ease-in-out infinite;
}

@keyframes title-underline {
  0%, 100% { opacity: 0.3; transform: scaleX(0.8); }
  50% { opacity: 1; transform: scaleX(1); }
}

.rr-section-sub { 
  font-size: 1.05rem; color: var(--text2); 
  line-height: 1.7; max-width: 600px;
  font-weight: 400;
}

/* ── RESPONSIVE CARDS ── */
.rr-card {
  background: rgba(15, 15, 35, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px; 
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  z-index: 2;
}

@media (min-width: 768px) {
  .rr-card {
    padding: 2rem;
    margin-bottom: 2rem;
  }
}

@media (min-width: 1024px) {
  .rr-card {
    padding: 2.5rem;
    margin-bottom: 2rem;
  }
}

.rr-card::before {
  content: '';
  position: absolute; inset: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.08) 0%, transparent 50%),
    linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.02) 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.rr-card > * {
  position: relative;
  z-index: 3;
}

.rr-card::before {
  content: '';
  position: absolute; inset: 0;
  background: 
    linear-gradient(45deg, transparent 30%, rgba(0, 212, 255, 0.05) 50%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 1;
  pointer-events: none;
}

.rr-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);
}

.rr-card:hover::before {
  opacity: 1;
}

/* ── RESPONSIVE STEP INDICATOR ── */
.rr-steps {
  display: flex; align-items: center; gap: 0;
  margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 8px;
}

@media (min-width: 768px) {
  .rr-steps {
    margin-bottom: 2rem;
  }
}

@media (min-width: 1024px) {
  .rr-steps {
    margin-bottom: 2.5rem;
  }
}

.rr-step {
  flex: 1; min-width: 50px; max-width: 100px;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 0.5rem 0.25rem; border-radius: 8px;
  background: transparent; border: 1px solid transparent;
  color: var(--text3); font-size: 0.65rem; font-weight: 600;
  cursor: pointer; transition: all 0.3s; text-align: center;
  border: 1px solid transparent;
  position: relative;
  z-index: 2;
}

.rr-step.done { 
  color: var(--cyber-blue);
  border-color: rgba(0, 212, 255, 0.3);
}

.rr-step.active {
  background: 
    linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%);
  color: var(--cyber-blue);
  border: 1px solid var(--cyber-blue);
  box-shadow: 
    0 0 15px rgba(0, 212, 255, 0.3),
    inset 0 0 10px rgba(0, 212, 255, 0.1);
  transform: translateY(-2px);
}

.rr-step:hover:not(.active) {
  color: var(--text2);
  border-color: rgba(0, 212, 255, 0.2);
}

.rr-step-num {
  width: 26px; height: 26px; border-radius: 50%;
  border: 2px solid currentColor;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.65rem; font-weight: 700;
  background: rgba(0, 212, 255, 0.05);
  transition: all 0.3s ease;
}

.rr-step.done .rr-step-num { 
  background: linear-gradient(135deg, var(--cyber-blue), var(--cyber-purple));
  border-color: var(--cyber-blue); 
  color: var(--night);
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.rr-step.active .rr-step-num {
  border-color: var(--cyber-blue);
  background: rgba(0, 212, 255, 0.1);
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.4);
}

.rr-step-line { 
  flex: 1; height: 2px; background: linear-gradient(90deg, var(--cyber-blue), transparent); 
  min-width: 30px; max-width: 50px;
  opacity: 0.3;
}

/* ── ISP SELECTOR ── */
.rr-isp-grid { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 2rem; }
.rr-isp-btn {
  padding: 0.8rem 1.5rem; border-radius: 10px;
  border: 1px solid rgba(0, 212, 255, 0.3); 
  background: 
    linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%);
  font-family: var(--font-head); font-size: 0.8rem; font-weight: 600;
  color: var(--text2); cursor: pointer; 
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative; overflow: hidden;
  text-transform: uppercase; letter-spacing: 0.05em;
}

.rr-isp-btn::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(45deg, var(--cyber-blue), var(--cyber-purple));
  opacity: 0;
  transition: opacity 0.3s;
}

.rr-isp-btn:hover { 
  border-color: var(--cyber-blue); 
  color: var(--cyber-blue);
  transform: translateY(-2px);
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
}

.rr-isp-btn:hover::before {
  opacity: 0.1;
}

.rr-isp-btn.sel {
  border-color: var(--cyber-blue); 
  background: linear-gradient(135deg, var(--cyber-blue) 0%, var(--cyber-purple) 100%);
  color: var(--night); 
  box-shadow: 
    0 0 20px rgba(0, 212, 255, 0.5),
    0 4px 15px rgba(0, 212, 255, 0.3);
  text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  transform: translateY(-2px);
}

.rr-isp-btn.sel::before {
  opacity: 0;
}

.rr-isp-hint {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 1rem 1.2rem; border-radius: 10px;
  background: rgba(0, 212, 255, 0.08); border: 1px solid rgba(0, 212, 255, 0.2);
  margin-bottom: 1.5rem;
}
.rr-isp-hint-icon { font-size: 1.2rem; flex-shrink: 0; }
.rr-isp-hint-body { font-size: 0.82rem; color: var(--text2); line-height: 1.6; }
.rr-isp-hint-body strong { color: var(--cyber-blue); font-family: var(--font-mono); }

/* ── QUESTION ── */
.rr-q-label {
  font-size: 0.82rem; font-weight: 600;
  color: var(--cyber-blue); letter-spacing: 0.06em; text-transform: uppercase;
  display: flex; align-items: center; gap: 8px; margin-bottom: 0.75rem;
}
.rr-tooltip-wrap { position: relative; display: inline-flex; }
.rr-tooltip-icon {
  width: 19px; height: 19px; border-radius: 50%;
  border: 1px solid var(--text3); color: var(--text3);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.68rem; cursor: help; transition: all 0.2s;
}
.rr-tooltip-icon:hover { border-color: var(--cyber-blue); color: var(--cyber-blue); box-shadow: 0 0 8px var(--cyber-blue); }
.rr-tooltip-box {
  position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%);
  background: var(--night3); border: 1px solid var(--border2); border-radius: 10px;
  padding: 10px 14px; width: 260px; font-size: 0.78rem; line-height: 1.55;
  color: var(--text); z-index: 300; pointer-events: none; opacity: 0;
  transition: opacity 0.15s; box-shadow: 0 8px 28px rgba(0,0,0,0.5);
  font-family: var(--font-body); font-weight: 400; text-transform: none; letter-spacing: 0;
}
.rr-tooltip-wrap:hover .rr-tooltip-box { opacity: 1; }

.rr-opts { display: flex; flex-wrap: wrap; gap: 8px; }
.rr-opt {
  padding: 0.55rem 1.1rem; border-radius: 8px;
  border: 1px solid var(--border); background: transparent;
  font-family: var(--font-body); font-size: 0.85rem; font-weight: 400;
  color: var(--text2); cursor: pointer; transition: all 0.18s;
  display: flex; flex-direction: column; gap: 1px;
}
.rr-opt:hover { border-color: var(--border2); color: var(--text); }
.rr-opt.sel {
  border-color: var(--cyber-blue); color: #fff; background: rgba(0, 212, 255, 0.15);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.4);
}
.rr-opt-desc { font-size: 0.72rem; color: var(--text3); font-family: var(--font-mono); }
.rr-opt.sel .rr-opt-desc { color: rgba(255,255,255,0.5); }

/* ── RESPONSIVE FORM CONTROLS ── */
.rr-text-input {
  padding: 0.75rem 1rem; border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(15, 15, 35, 0.9);
  font-family: var(--font-body); font-size: 0.9rem; color: var(--text);
  outline: none; transition: all 0.2s; width: 100%;
  position: relative; z-index: 10;
  font-weight: 400;
}

@media (min-width: 768px) {
  .rr-text-input {
    padding: 0.875rem 1.25rem;
    font-size: 0.95rem;
  }
}

.rr-text-input:focus { 
  border-color: rgba(99, 102, 241, 0.5); 
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); 
  background: rgba(15, 15, 35, 0.95);
}
.rr-text-input::placeholder { color: var(--text3); font-weight: 400; }

.rr-row2 { 
  display: grid; 
  gap: 1rem; 
  margin-bottom: 1.5rem; 
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .rr-row2 {
    grid-template-columns: 1fr 1fr;
  }
}

.rr-field-wrap { display: flex; flex-direction: column; gap: 6px; }

@media (min-width: 768px) {
  .rr-field-wrap {
    gap: 8px;
  }
}

.rr-field-label { 
  font-size: 0.8rem; 
  color: var(--text2); 
  font-weight: 500; 
  letter-spacing: 0.025em; 
}

@media (min-width: 768px) {
  .rr-field-label {
    font-size: 0.875rem;
  }
}

/* ── RESPONSIVE BUTTONS ── */
.rr-btn-primary {
  padding: 0.75rem 1.5rem; border-radius: 8px; border: none;
  background: rgba(99, 102, 241, 0.9);
  cursor: pointer;
  font-family: var(--font-body); font-weight: 600; font-size: 0.9rem;
  color: #ffffff;
  transition: all 0.2s ease; 
  display: inline-flex; align-items: center; gap: 6px;
  position: relative; z-index: 10;
  letter-spacing: 0.025em;
  width: 100%;
  justify-content: center;
}

@media (min-width: 768px) {
  .rr-btn-primary {
    padding: 0.875rem 2rem;
    font-size: 0.95rem;
    gap: 8px;
    width: auto;
  }
}

.rr-btn-primary::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.rr-btn-primary:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.9);
  transform: translateY(-1px);
}

.rr-btn-primary:hover:not(:disabled)::before {
  opacity: 1;
}
.rr-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.rr-btn-ghost {
  padding: 0.75rem 1.5rem; border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.3); background: transparent;
  font-family: var(--font-body); font-size: 0.9rem; font-weight: 500;
  color: var(--text); cursor: pointer; 
  transition: all 0.2s ease;
  position: relative; z-index: 10;
  letter-spacing: 0.025em;
  width: 100%;
  justify-content: center;
  display: inline-flex;
  align-items: center;
}

@media (min-width: 768px) {
  .rr-btn-ghost {
    padding: 0.875rem 2rem;
    font-size: 0.95rem;
    width: auto;
  }
}

.rr-btn-ghost::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, var(--vsc-trace) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.rr-btn-ghost:hover { 
  border-color: rgba(255, 255, 255, 0.3); 
  color: var(--text); 
  background: rgba(255, 255, 255, 0.05);
}

.rr-btn-ghost:hover::before {
  opacity: 1;
}

.rr-btn-teal {
  padding: 0.9rem 2rem; border-radius: 10px; border: 2px solid var(--teal);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%);
  cursor: pointer;
  font-family: var(--font-head); font-size: 0.8rem; font-weight: 700;
  color: var(--teal); transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  position: relative;
  overflow: hidden;
}

.rr-btn-teal:hover { 
  transform: translateY(-2px) scale(1.02);
  box-shadow: 
    0 8px 32px rgba(16, 185, 129, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border-color: rgba(16, 185, 129, 0.8);
}

/* ── IMPRESSIVE LOADING STATES ── */
.rr-spin {
  display: inline-block;
  width: 16px; height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--vsc);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.rr-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.rr-actions { 
  display: flex; 
  gap: 0.75rem; 
  flex-wrap: wrap; 
  margin-top: 1rem; 
  flex-direction: column;
}

@media (min-width: 768px) {
  .rr-actions {
    gap: 10px;
    margin-top: 1.5rem;
    flex-direction: row;
  }
}
.rr-error { color: var(--cyber-red); font-size: 0.82rem; margin-top: 0.75rem; font-family: var(--font-mono); }

/* ── RESPONSIVE SCORE RING ── */
.rr-ring-wrap { 
  display: flex; flex-direction: column; align-items: center; 
  position: relative;
}

.rr-ring { 
  position: relative; width: 150px; height: 150px; margin: 0 auto 1.5rem;
  filter: drop-shadow(0 0 20px rgba(0, 212, 255, 0.3));
}

@media (min-width: 768px) {
  .rr-ring {
    width: 180px; height: 180px;
    margin: 0 auto 1.75rem;
  }
}

@media (min-width: 1024px) {
  .rr-ring {
    width: 200px; height: 200px;
    margin: 0 auto 2rem;
  }
}

.rr-ring svg { 
  width: 100%; height: 100%; 
  transform: rotate(-90deg);
  filter: drop-shadow(0 0 10px currentColor);
}

.rr-ring-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: white; text-align: center;
  background: radial-gradient(circle, rgba(10, 10, 15, 0.8) 0%, transparent 70%);
  border-radius: 50%;
}

.rr-ring-num {
  font-size: 3rem; font-weight: 800; font-family: var(--font-head);
  line-height: 1; text-shadow: 0 0 20px currentColor;
}

.rr-ring-label {
  font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.1em; opacity: 0.8;
  margin-top: 0.5rem;
}

.rr-ring-meta {
  text-align: center; margin-top: 1.5rem;
}

.rr-ring-meta h3 {
  font-family: var(--font-head); font-size: 1.5rem; font-weight: 700;
  margin-bottom: 0.5rem; text-shadow: 0 0 20px currentColor;
}

.rr-ring-meta p {
  color: var(--text2); line-height: 1.6;
}

/* ── IMPRESSIVE TIER CHIPS ── */
.rr-tier-chip {
  display: inline-block; padding: 8px 24px; border-radius: 100px;
  font-family: var(--font-head); font-size: 0.75rem; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.rr-tier-chip::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
  pointer-events: none;
}
.rr-tier-legend {
  display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; margin-top: 1.2rem;
}
.rr-tier-item { text-align: center; }
.rr-tier-dot { width: 10px; height: 10px; border-radius: 50%; margin: 0 auto 4px; }
.rr-tier-n { font-size: 0.68rem; font-weight: 700; font-family: var(--font-mono); }
.rr-tier-r { font-size: 0.62rem; color: var(--text3); }

/* ── RECOMMENDATIONS ── */
.rr-rec-list { display: flex; flex-direction: column; gap: 0.8rem; }
.rr-rec {
  padding: 1rem 1.2rem; border-radius: 10px;
  border: 1px solid rgba(255,59,92,0.2);
  background: rgba(255,59,92,0.04);
  display: flex; gap: 12px;
}
.rr-rec.sev-critical { border-color: rgba(255,59,92,0.35); background: rgba(255,59,92,0.07); }
.rr-rec.sev-high     { border-color: rgba(255,140,66,0.3);  background: rgba(255,140,66,0.05); }
.rr-rec.sev-medium   { border-color: rgba(245,197,24,0.25); background: rgba(245,197,24,0.04); }
.rr-rec-icon { font-size: 1rem; flex-shrink: 0; margin-top: 2px; }
.rr-rec-cat {
  font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.1em; margin-bottom: 3px; font-family: var(--font-mono);
}
.rr-rec.sev-critical .rr-rec-cat { color: var(--red); }
.rr-rec.sev-high     .rr-rec-cat { color: var(--orange); }
.rr-rec.sev-medium   .rr-rec-cat { color: var(--yellow); }
.rr-rec-title { font-size: 0.9rem; font-weight: 600; color: #fff; margin-bottom: 4px; }
.rr-rec-detail { font-size: 0.82rem; color: var(--text2); line-height: 1.6; }

.rr-all-good {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; padding: 2.5rem; text-align: center;
}
.rr-all-good-icon { font-size: 2.5rem; }
.rr-all-good-title { font-family: var(--font-head); font-size: 1rem; color: var(--teal); letter-spacing: 0.08em; }
.rr-all-good-sub { font-size: 0.85rem; color: var(--text2); }

/* ── HISTORY TABLE ── */
.rr-table-wrap { overflow-x: auto; }
table.rr-table { width: 100%; border-collapse: collapse; }
.rr-table th {
  text-align: left; padding: 0.55rem 1rem;
  font-family: var(--font-mono); font-size: 0.7rem; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--text3); border-bottom: 1px solid var(--border);
}
.rr-table td {
  padding: 0.85rem 1rem; font-size: 0.85rem;
  border-bottom: 1px solid rgba(0,122,204,0.06);
}
.rr-table tr:hover td { background: var(--vsc-trace); }
.rr-table td.mono { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text2); }
.rr-score-pill {
  display: inline-block; padding: 3px 11px; border-radius: 100px;
  font-family: var(--font-mono); font-size: 0.78rem; font-weight: 600;
}

.rr-rec-icon { 
  font-size: 1.5rem;
  width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.2);
}

.rr-rec-title { 
  font-family: var(--font-head); 
  font-size: 1.1rem; 
  font-weight: 700;
  color: var(--text);
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
}

.rr-rec-desc { 
  color: var(--text2); 
  line-height: 1.6; 
  margin-bottom: 1rem;
  position: relative;
  z-index: 2;
}

.rr-rec-steps { 
  font-family: var(--font-mono); 
  font-size: 0.85rem; 
  color: var(--text3); 
  line-height: 1.5;
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  z-index: 2;
}

.rr-empty { text-align: center; padding: 3rem; color: var(--text3); font-family: var(--font-mono); font-size: 0.85rem; }

/* ── RESPONSIVE RESOURCES GRID ── */
.rr-res-grid { 
  display: grid; 
  grid-template-columns: 1fr; 
  gap: 1rem;
  position: relative;
}

@media (min-width: 768px) {
  .rr-res-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .rr-res-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }
}

.rr-res-card {
  padding: 2rem; 
  border-radius: 16px;
  border: 1px solid var(--border);
  background: 
    linear-gradient(135deg, rgba(10, 10, 15, 0.8) 0%, rgba(26, 26, 46, 0.6) 100%);
  backdrop-filter: blur(20px) saturate(180%);
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

.rr-res-card::before {
  content: '';
  position: absolute; inset: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(0, 212, 255, 0.05) 0%, transparent 50%),
    linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.02) 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.rr-res-card:hover {
  border-color: var(--border2);
  transform: translateY(-6px) scale(1.03);
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 0 40px rgba(0, 212, 255, 0.15);
}

.rr-res-card:hover::before {
  opacity: 1;
}

/* ── SPECTACULAR FINISHING TOUCHES ── */
.rr-glow-text {
  animation: glow-text 2s ease-in-out infinite alternate;
}

@keyframes glow-text {
  from { text-shadow: 0 0 10px currentColor, 0 0 20px currentColor; }
  to { text-shadow: 0 0 20px currentColor, 0 0 30px currentColor, 0 0 40px currentColor; }
}

.rr-float-animation {
  animation: float-gentle 6s ease-in-out infinite;
}

@keyframes float-gentle {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.rr-shimmer {
  position: relative;
  overflow: hidden;
}

.rr-shimmer::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
}
.rr-res-card:hover { border-color: var(--border2); transform: translateY(-3px); }
.rr-res-icon-wrapper { margin-bottom: 0.6rem; display: block; }
.rr-res-icon { width: 24px; height: 24px; display: block; }
.rr-res-tag {
  display: inline-block; padding: 2px 10px; border-radius: 100px;
  font-family: var(--font-mono); font-size: 0.68rem; font-weight: 500;
  background: var(--vsc-trace); border: 1px solid var(--border); color: var(--vsc);
  margin-bottom: 0.5rem; letter-spacing: 0.06em;
}
.rr-res-title { font-size: 0.92rem; font-weight: 700; color: #fff; margin-bottom: 0.4rem; }
.rr-res-body { font-size: 0.8rem; color: var(--text2); line-height: 1.6; }

/* ── SPINNER ── */
.rr-spin {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff;
  animation: rr-spin 0.65s linear infinite; display: inline-block;
}
@keyframes rr-spin { to { transform: rotate(360deg); } }

/* ── PRINT ── */
@media print {
  #nodeCanvas, .rr-nav, .rr-actions, .rr-cta { display: none !important; }
  body { background: #fff; color: #000; }
  .rr-card { border: 1px solid #ccc; background: #fff; backdrop-filter: none; }
  .rr-section-title, .rr-ring-num, .rr-rec-title { color: #000; }
  .rr-hero { display: none; }
  .rr-page.show { display: block !important; }
  .rr-rec-detail, .rr-rec-cat, .rr-table td { color: #333; }
  .rr-score-pill { border: 1px solid #ccc; }
}
`;

/* ─────────────────────────────────────────────────────────────
   ANIMATED NETWORK CANVAS
───────────────────────────────────────────────────────────── */
function NetworkCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H, nodes, particles, raf;
    const NODE_COUNT = 36;
    const PARTICLE_COUNT = 20;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function init() {
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r:  2 + Math.random() * 3,
        pulse: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? [0, 212, 255] : [236, 72, 153],
      }));

      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        size: 0.5 + Math.random() * 1.5,
        life: Math.random(),
        maxLife: 0.5 + Math.random() * 1.5,
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Draw connections between nodes
      for (let i = 0; i < NODE_COUNT; i++) {
        const n = nodes[i];
        for (let j = i + 1; j < NODE_COUNT; j++) {
          const m = nodes[j];
          const dx = n.x - m.x, dy = n.y - m.y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 180) {
            const opacity = 0.4 * (1 - d / 180);
            const gradient = ctx.createLinearGradient(n.x, n.y, m.x, m.y);
            gradient.addColorStop(0, `rgba(${n.color[0]}, ${n.color[1]}, ${n.color[2]}, ${opacity})`);
            gradient.addColorStop(1, `rgba(${m.color[0]}, ${m.color[1]}, ${m.color[2]}, ${opacity})`);
            
            ctx.beginPath();
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1.2;
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        n.pulse += 0.02;
        const glow = 0.5 + 0.5 * Math.sin(n.pulse);
        const pulseSize = n.r * (0.8 + 0.4 * glow);
        
        // Outer glow
        const glowGradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, pulseSize * 3);
        glowGradient.addColorStop(0, `rgba(${n.color[0]}, ${n.color[1]}, ${n.color[2]}, ${0.3 + 0.2 * glow})`);
        glowGradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.fillStyle = glowGradient;
        ctx.arc(n.x, n.y, pulseSize * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Core node
        ctx.beginPath();
        ctx.fillStyle = `rgba(${n.color[0]}, ${n.color[1]}, ${n.color[2]}, ${0.6 + 0.4 * glow})`;
        ctx.arc(n.x, n.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner bright core
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + 0.2 * glow})`;
        ctx.arc(n.x, n.y, pulseSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Update position
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      }

      // Draw and update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 0.01;
        
        if (p.life <= 0) {
          // Respawn particle
          p.x = Math.random() * W;
          p.y = Math.random() * H;
          p.life = p.maxLife;
          p.vx = (Math.random() - 0.5) * 0.8;
          p.vy = (Math.random() - 0.5) * 0.8;
        }
        
        const opacity = (p.life / p.maxLife) * 0.6;
        const particleGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        particleGradient.addColorStop(0, `rgba(0, 255, 255, ${opacity})`);
        particleGradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.fillStyle = particleGradient;
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Update position
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }

      raf = requestAnimationFrame(draw);
    }

    resize(); init(); draw();
    window.addEventListener("resize", () => { resize(); init(); });
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas id="nodeCanvas" ref={ref} />;
}

/* ─────────────────────────────────────────────────────────────
   SCORE RING
───────────────────────────────────────────────────────────── */
function ScoreRing({ score, color }) {
  const R    = 72;
  const circ = 2 * Math.PI * R;
  const pct  = score / 100;
  return (
    <div className="rr-ring">
      <svg viewBox="0 0 170 170">
        <circle cx="85" cy="85" r={R} fill="none" stroke="rgba(0,122,204,0.1)" strokeWidth="10" />
        <circle
          cx="85" cy="85" r={R} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 10px ${color})`, transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="rr-ring-center">
        <span className="rr-ring-num" style={{ color }}>{score}</span>
        <span className="rr-ring-lbl">Risk Score</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────────────────────── */
export default function WiFiRiskRadar() {
  const [page,    setPage]    = useState("home");
  const [step,    setStep]    = useState(0);  // 0=ISP, 1-6=questions, 7=review
  const [isp,     setIsp]     = useState("PLDT");
  const [device,  setDevice]  = useState("");
  const [answers, setAnswers] = useState({});
  const [ispHint, setIspHint] = useState(null);
  const [result,  setResult]  = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const resultRef = useRef(null);

  /* fetch ISP hint when ISP changes */
  useEffect(() => {
    fetch(`${API_BASE}/isp-hint/${isp}`)
      .then(r => r.json())
      .then(setIspHint)
      .catch(() => setIspHint(null));
  }, [isp]);

  /* fetch history when page changes */
  useEffect(() => {
    if (page === "history") {
      fetch(`${API_BASE}/history`)
        .then(r => r.json())
        .then(setHistory)
        .catch(() => setHistory([]));
    }
  }, [page]);

  const pick = useCallback((key, val) => {
    setAnswers(prev => ({ ...prev, [key]: val }));
  }, []);

  function tierColor(tier) {
    return { Low:"#00e5a0", Medium:"#f5c518", High:"#ff8c42", Critical:"#ff3b5c" }[tier] || "#fff";
  }

  async function runScan() {
    const filled = QUESTIONS.every(q => answers[q.key]);
    if (!filled) { setError("// ERROR: All 6 configuration fields must be answered."); return; }
    setError(""); setLoading(true);
    
    try {
      // First check if server is available
      setError("// CHECKING_SERVER_CONNECTION...");
      const serverAvailable = await checkServerConnection();
      
      if (!serverAvailable) {
        throw new Error("Server is not responding. Please ensure server.js is running on port 4000.");
      }
      
      setError(""); // Clear the checking message
      const res  = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, isp, deviceModel: device || "Unknown Device" }),
      });
      
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setResult(data);
      setPage("results");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
    } catch (error) {
      console.error("Scan error:", error);
      setError(`// CONNECTION_ERROR: ${error.message || 'Unable to connect to server. Ensure server.js is running on port 4000.'}`);
    } finally {
      setLoading(false);
    }
  }

  async function checkServerConnection() {
    try {
      const res = await fetch(`${API_BASE}/health`, { 
        method: 'GET',
        timeout: 5000 
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function resetScan() {
    setAnswers({}); setResult(null); setStep(0); setDevice(""); setError("");
    // Clear any cached error states
    setLoading(false);
    
    // Check server connection before proceeding
    try {
      const serverAvailable = await checkServerConnection();
      if (!serverAvailable) {
        setError("// WARNING: Server connection lost. Please ensure server.js is running on port 4000 before starting a new scan.");
      }
    } catch {
      setError("// WARNING: Unable to verify server connection. Please ensure server.js is running on port 4000.");
    }
  }

  const TIER_LEGEND = [
    ["Low","0–15","#00e5a0"], ["Medium","16–40","#f5c518"],
    ["High","41–65","#ff8c42"], ["Critical","66–100","#ff3b5c"],
  ];

  /* ── NAV ── */
  const NAV_ITEMS = [
    { id:"home",      label:"HOME"      },
    { id:"scan",      label:"SCAN HUD"  },
    { id:"results",   label:"DASHBOARD" },
    { id:"history",   label:"AUDIT LOG" },
    { id:"resources", label:"INTEL"     },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NetworkCanvas />

      <div id="rr-root">
        {/* ── NAV ── */}
        <nav className="rr-nav">
          <div className="rr-brand">
            <div className="rr-brand-icon">
              <img src="/icons/radar-icon.png" alt="WiFi RiskRadar" style={{width: '20px', height: '20px'}} />
            </div>
            WI-FI RISKRADAR
          </div>
          <div className="rr-nav-links">
            {NAV_ITEMS.map(n => (
              <button
                key={n.id}
                className={`rr-nl${page === n.id ? " active" : ""}`}
                onClick={() => setPage(n.id)}
              >{n.label}</button>
            ))}
          </div>
        </nav>

        {/* ════════════════ HOME ════════════════ */}
        <div className={`rr-page${page === "home" ? " show" : ""}`}>
          <div className="rr-hero">
            <div className="rr-pulse-badge">
              <span className="rr-pulse-dot" />
              ACTIVE THREAT INTELLIGENCE
            </div>
            <h1>
              KNOW YOUR NETWORK.<br />
              <span className="rr-accent">FIX YOUR RISKS.</span>
            </h1>
            <p className="rr-tagline">
              Wi-Fi RiskRadar is a vulnerability assessment engine for Philippine home and office networks.
              Input your router's configuration to receive an instant weighted risk score, 
              ISP-specific remediation steps, and a downloadable security report.
            </p>
            <div className="rr-hero-meta">
              <div className="rr-meta-item">
                <div className="rr-meta-n">06</div>
                <div className="rr-meta-l">Risk Vectors</div>
              </div>
              <div className="rr-meta-item">
                <div className="rr-meta-n">04</div>
                <div className="rr-meta-l">Threat Tiers</div>
              </div>
              <div className="rr-meta-item">
                <div className="rr-meta-n">PH</div>
                <div className="rr-meta-l">ISP-Aware</div>
              </div>
              <div className="rr-meta-item">
                <div className="rr-meta-n">∞</div>
                <div className="rr-meta-l">Audit History</div>
              </div>
            </div>
            <button className="rr-cta" onClick={() => { setPage("scan"); setStep(0); }}>
              INITIALIZE SCAN →
            </button>
          </div>
        </div>

        {/* ════════════════ SCAN HUD ════════════════ */}
        <div className={`rr-page${page === "scan" ? " show" : ""}`}>
          <div className="rr-section">
            <div className="rr-section-head">
              <div className="rr-section-title">// ASSESSMENT_HUD</div>
              <p className="rr-section-sub">Complete all 6 configuration checks. Hover ⓘ for threat intelligence context.</p>
            </div>

            {/* Step indicators */}
            <div className="rr-steps">
              {["ISP", ...QUESTIONS.map((_, i) => `Q${i+1}`), "REVIEW"].map((label, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center" }}>
                  <div
                    className={`rr-step${step === i ? " active" : ""}${step > i ? " done" : ""}`}
                    onClick={() => setStep(i)}
                  >
                    <span className="rr-step-num">{step > i ? "✓" : i + 1}</span>
                    {label}
                  </div>
                  {i < 7 && <div className="rr-step-line" />}
                </div>
              ))}
            </div>

            {/* STEP 0 — ISP Selector */}
            {step === 0 && (
              <div className="rr-card" key="step0">
                <p className="rr-q-label">STEP 0: SELECT YOUR PHILIPPINE ISP</p>
                <div className="rr-isp-grid">
                  {ISP_LIST.map(sp => (
                    <button
                      key={sp}
                      className={`rr-isp-btn${isp === sp ? " sel" : ""}`}
                      onClick={() => setIsp(sp)}
                    >{sp}</button>
                  ))}
                </div>
                {ispHint && (
                  <div className="rr-isp-hint">
                    <span className="rr-isp-hint-icon">⚠</span>
                    <div className="rr-isp-hint-body">
                      <strong>{isp}</strong> default admin portal: <strong>{ispHint.adminUrl}</strong>
                      &nbsp;|&nbsp; User: <strong>{ispHint.defaultUser}</strong>
                      &nbsp;|&nbsp; Pass: <strong>{ispHint.defaultPass}</strong>
                      <br />{ispHint.note}
                    </div>
                  </div>
                )}
                <div className="rr-row2">
                  <div className="rr-field-wrap">
                    <label className="rr-field-label">Router Model (optional)</label>
                    <input
                      className="rr-text-input"
                      placeholder="e.g. PLDT Fibr, Globe HG8145V5"
                      value={device}
                      onChange={e => setDevice(e.target.value)}
                    />
                  </div>
                </div>
                <div className="rr-actions">
                  <button className="rr-btn-primary" onClick={() => setStep(1)}>
                    BEGIN ASSESSMENT →
                  </button>
                </div>
              </div>
            )}

            {/* STEPS 1–6 — Questions */}
            {step >= 1 && step <= 6 && (() => {
              const q = QUESTIONS[step - 1];
              return (
                <div className="rr-card" key={`step${step}`}>
                  <div className="rr-q-label">
                    QUESTION {step} / 6 — {q.label}
                    <div className="rr-tooltip-wrap">
                      <span className="rr-tooltip-icon">ⓘ</span>
                      <div className="rr-tooltip-box">{q.tooltip}</div>
                    </div>
                  </div>
                  <div className="rr-opts">
                    {q.opts.map(o => (
                      <button
                        key={o.val}
                        className={`rr-opt${answers[q.key] === o.val ? " sel" : ""}`}
                        onClick={() => pick(q.key, o.val)}
                      >
                        <span>{o.label}</span>
                        {o.desc && <span className="rr-opt-desc">{o.desc}</span>}
                      </button>
                    ))}
                  </div>
                  <div className="rr-actions">
                    <button className="rr-btn-ghost" onClick={() => setStep(step - 1)}>← BACK</button>
                    <button
                      className="rr-btn-primary"
                      disabled={!answers[q.key]}
                      onClick={() => setStep(step + 1)}
                    >
                      {step < 6 ? "NEXT →" : "REVIEW →"}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* STEP 7 — Review */}
            {step === 7 && (
              <div className="rr-card" key="step7">
                <p className="rr-q-label">REVIEW YOUR CONFIGURATION</p>
                <table className="rr-table" style={{ marginBottom: "1.5rem" }}>
                  <thead>
                    <tr>
                      <th>PARAMETER</th>
                      <th>YOUR VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="mono">ISP</td><td>{isp}</td></tr>
                    {QUESTIONS.map(q => (
                      <tr key={q.key}>
                        <td className="mono">{q.label}</td>
                        <td>{answers[q.key] || <span style={{ color: "var(--red)" }}>— NOT SET</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {error && <p className="rr-error">{error}</p>}

                <div className="rr-actions">
                  <button className="rr-btn-ghost" onClick={() => setStep(1)}>← EDIT</button>
                  <button
                    className="rr-btn-primary"
                    onClick={runScan}
                    disabled={loading}
                  >
                    {loading ? <><span className="rr-spin" /> ANALYZING…</> : "RUN VULNERABILITY SCAN →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════ DASHBOARD / RESULTS ════════════════ */}
        <div className={`rr-page${page === "results" ? " show" : ""}`} ref={resultRef}>
          {result ? (
            <div className="rr-section">
              <div className="rr-section-head">
                <div className="rr-section-title">// VULNERABILITY_DASHBOARD</div>
                <p className="rr-section-sub">
                  Scan completed {new Date(result.timestamp).toLocaleString()} — {result.isp} / {result.deviceModel}
                </p>
              </div>

              <div className="rr-card" style={{ textAlign: "center" }}>
                <div className="rr-ring-wrap">
                  <ScoreRing score={result.score} color={result.hex} />
                  <span
                    className="rr-tier-chip"
                    style={{ background: result.hex + "22", color: result.hex, border: `1px solid ${result.hex}55` }}
                  >
                    {result.tier.toUpperCase()} RISK — {result.label.toUpperCase()}
                  </span>
                  <div className="rr-tier-legend">
                    {TIER_LEGEND.map(([t, r, c]) => (
                      <div key={t} className="rr-tier-item">
                        <div className="rr-tier-dot" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                        <div className="rr-tier-n" style={{ color: c }}>{t}</div>
                        <div className="rr-tier-r">{r}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rr-card">
                <p className="rr-section-title" style={{ fontSize: "1rem", marginBottom: "1rem" }}>
                  {result.recommendations.length > 0 ? "// REMEDIATION_DIRECTIVES" : ""}
                </p>
                {result.recommendations.length === 0 ? (
                  <div className="rr-all-good">
                    <span className="rr-all-good-icon">✅</span>
                    <div className="rr-all-good-title">NETWORK POSTURE: EXCELLENT</div>
                    <div className="rr-all-good-sub">No critical vulnerabilities detected. Continue monitoring firmware updates and rotate your passphrase every 90 days.</div>
                  </div>
                ) : (
                  <div className="rr-rec-list">
                    {result.recommendations.map((rec, i) => (
                      <div key={i} className={`rr-rec sev-${rec.severity}`}>
                        <span className="rr-rec-icon">{rec.severity === "critical" ? "🔴" : rec.severity === "high" ? "🟠" : "🟡"}</span>
                        <div>
                          <div className="rr-rec-cat">{rec.category}</div>
                          <div className="rr-rec-title">{rec.title}</div>
                          <div className="rr-rec-detail">{rec.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rr-actions">
                <button className="rr-btn-teal" onClick={() => window.print()}>⬇ DOWNLOAD PDF REPORT</button>
                <button className="rr-btn-primary" onClick={resetScan}>NEW SCAN</button>
                <button className="rr-btn-ghost" onClick={() => setPage("history")}>VIEW AUDIT LOG</button>
              </div>
            </div>
          ) : (
            <div className="rr-section" style={{ textAlign: "center", paddingTop: "6rem" }}>
              <p style={{ fontFamily: "var(--font-mono)", color: "var(--text3)", fontSize: "0.9rem" }}>
                // No scan data loaded. Run an assessment first.
              </p>
              <div className="rr-actions" style={{ justifyContent: "center" }}>
                <button className="rr-btn-primary" onClick={() => { setPage("scan"); setStep(0); }}>
                  START ASSESSMENT →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════ AUDIT LOG / HISTORY ════════════════ */}
        <div className={`rr-page${page === "history" ? " show" : ""}`}>
          <div className="rr-section">
            <div className="rr-section-head">
              <div className="rr-section-title">// SECURITY_AUDIT_TRAIL</div>
              <p className="rr-section-sub">All scan records are stored in-memory for the session. Track your remediation progress over time.</p>
            </div>
            <div className="rr-card rr-table-wrap">
              {history.length === 0 ? (
                <div className="rr-empty">
                  // NO_RECORDS_FOUND — Conduct your first vulnerability scan to populate this log.
                </div>
              ) : (
                <table className="rr-table">
                  <thead>
                    <tr>
                      <th>TIMESTAMP</th>
                      <th>ISP</th>
                      <th>DEVICE</th>
                      <th>SCORE</th>
                      <th>TIER</th>
                      <th>ENCRYPTION</th>
                      <th>WPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id}>
                        <td className="mono">{new Date(h.timestamp).toLocaleString()}</td>
                        <td>{h.isp}</td>
                        <td style={{ fontSize: "0.8rem", color: "var(--text2)" }}>{h.deviceModel}</td>
                        <td>
                          <span
                            className="rr-score-pill"
                            style={{ background: tierColor(h.tier) + "22", color: tierColor(h.tier) }}
                          >{h.score}</span>
                        </td>
                        <td style={{ color: tierColor(h.tier), fontWeight: 700, fontSize: "0.82rem" }}>{h.tier}</td>
                        <td className="mono">{h.answers?.encryption}</td>
                        <td className="mono">{h.answers?.wps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════ INTEL / RESOURCES ════════════════ */}
        <div className={`rr-page${page === "resources" ? " show" : ""}`}>
          <div className="rr-section">
            <div className="rr-section-head">
              <div className="rr-section-title">// THREAT_INTELLIGENCE</div>
              <p className="rr-section-sub">Understanding the attack vectors your router configuration may expose.</p>
            </div>
            <div className="rr-res-grid">
              {RESOURCES.map((r, i) => (
                <div key={i} className="rr-res-card">
                  <div className="rr-res-icon-wrapper" style={{ color: r.color }}>
                    <img src={`/icons/${r.icon}`} alt={r.title} className="rr-res-icon" />
                  </div>
                  <span className="rr-res-tag">{r.tag}</span>
                  <div className="rr-res-title">{r.title}</div>
                  <div className="rr-res-body">{r.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
