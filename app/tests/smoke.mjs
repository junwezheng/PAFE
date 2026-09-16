import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:4173';
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

page.on('console', (m) => {
  // The sandbox proxy MITMs TLS, so Google Fonts fails to load here only.
  const text = m.text();
  if (m.type() === 'error' && !text.includes('ERR_CERT_AUTHORITY_INVALID')) {
    errors.push(`console.error: ${text}`);
  }
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const step = async (label, fn) => {
  try {
    await fn();
    console.log(`  ok    ${label}`);
  } catch (e) {
    console.log(`  FAIL  ${label} :: ${e.message.split('\n')[0]}`);
    errors.push(`${label}: ${e.message.split('\n')[0]}`);
  }
};

await page.goto(BASE, { waitUntil: 'networkidle' });

// ── login ──
await step('login screen renders', async () => {
  await page.getByText('Own a piece').waitFor({ timeout: 8000 });
});
await step('sign in', async () => {
  await page.getByText('Get started').click();
  await page.getByText('Portfolio value · USD').waitFor({ timeout: 8000 });
});

// ── home ──
await step('portfolio total is $1,721.42', async () => {
  const t = await page.locator('text=/^\\$1,7/').first().textContent();
  if (!t?.startsWith('$1,7')) throw new Error(`got ${t}`);
});
await step('vesting banner shows pre-target state', async () => {
  await page.getByText(/September vesting · 14 days/).waitFor({ timeout: 5000 });
});
await step('$918.40 spent shown', async () => {
  await page.getByText(/\$918\.40 spent in September/).waitFor({ timeout: 5000 });
});

// ── vesting screen (pre-pay): countdown rings ──
await step('vesting screen lists 3 lots with countdowns', async () => {
  await page.getByText('Vesting', { exact: true }).first().click();
  await page.getByText('Vesting now').waitFor({ timeout: 5000 });
  const n = await page.getByText(/until vested/).count();
  if (n !== 3) throw new Error(`expected 3 countdowns, got ${n}`);
});
await step('countdown actually ticks', async () => {
  const first = page.getByText(/until vested/).first();
  const a = await first.textContent();
  await page.waitForTimeout(1600);
  const b = await first.textContent();
  if (a === b) throw new Error(`countdown frozen at "${a}"`);
});

// ── hero flow: pay -> review -> earned ──
await step('open Pay tab', async () => {
  await page.locator('text=Pay').last().click();
  await page.getByText('Simulate a scan').waitFor({ timeout: 5000 });
});
await step('simulate scan -> review', async () => {
  await page.getByText('Simulate a scan').click();
  await page.getByText('Nike Store').first().waitFor({ timeout: 5000 });
});
await step('review shows 3.5% and crossing note', async () => {
  await page.getByText('3.5% in stock').waitFor({ timeout: 5000 });
  await page.getByText(/clears the \$1,000\.00 monthly target/).waitFor({ timeout: 5000 });
});
await step('confirm and pay -> earned', async () => {
  await page.getByText(/Confirm and pay/).click();
  await page.getByText(/Paid \$96\.50/).waitFor({ timeout: 8000 });
});
await step('vesting removed + 3 lots released', async () => {
  await page.getByText('September vesting removed').first().waitFor({ timeout: 5000 });
  const n = await page.getByText('Released', { exact: true }).count();
  if (n !== 3) throw new Error(`expected 3 released rows, got ${n}`);
});
await step('settlement receipt renders', async () => {
  // Exact match: a devnet run also renders a "Settlement failed: …" note, and a
  // substring match would resolve to both and trip strict mode.
  await page.getByText('Settlement', { exact: true }).waitFor({ timeout: 8000 });
  await page.getByText('Not settled').waitFor({ timeout: 5000 });
});

// ── brand -> redeem ──
await step('see Nike benefits', async () => {
  await page.getByText('See Nike benefits').click();
  await page.getByText('Shareholder benefits').waitFor({ timeout: 5000 });
});
await step('Nike: Tier 1 unlocked, Tiers 2-3 locked at $442.28 held', async () => {
  await page.getByText('$442.28').waitFor({ timeout: 5000 });
  const unlocked = await page.getByText('Unlocked', { exact: true }).count();
  if (unlocked !== 1) throw new Error(`expected 1 unlocked tier, got ${unlocked}`);
  const locked = await page.getByText(/more of NKE to unlock/).count();
  if (locked !== 2) throw new Error(`expected 2 locked tiers, got ${locked}`);
  await page.getByText('$57.72 to Partner').waitFor({ timeout: 5000 });
});
await step('redeem a benefit', async () => {
  await page.getByText('Redeem', { exact: true }).first().click();
  await page.getByText('Held value required').waitFor({ timeout: 5000 });
  await page.getByText('Redeem benefit').click();
  await page.getByText('Member code').waitFor({ timeout: 5000 });
});
await step('member code matches PAFE-NKE-####', async () => {
  const code = await page.locator('text=/^PAFE-NKE-\\d{4}$/').first().textContent();
  if (!/^PAFE-NKE-\d{4}$/.test(code ?? '')) throw new Error(`got "${code}"`);
});

// ── remaining screens ──
await step('perks hub', async () => {
  await page.getByText('All my benefits').click();
  await page.getByText('Close to unlocking').waitFor({ timeout: 5000 });
});
await step('stocks screen shows vested/vesting split', async () => {
  await page.locator('text=Stocks').last().click();
  await page.getByText('Holdings').waitFor({ timeout: 5000 });
  await page.getByText('Nothing locked').waitFor({ timeout: 5000 });
});
await step('card screen', async () => {
  await page.locator('text=Card').last().click();
  await page.getByText('•••• •••• •••• 7362').waitFor({ timeout: 5000 });
  await page.getByText('Transactions').waitFor({ timeout: 5000 });
});
await step('activity screen shows 6 rows incl. the new Nike purchase', async () => {
  await page.locator('text=Home').last().click();
  await page.getByText('All activity').click();
  await page.getByText(/Spent in September/).waitFor({ timeout: 5000 });
  const rows = await page.getByText(/Nike Store Orchard/).count();
  if (rows < 1) throw new Error('Nike purchase missing from history');
});
await step('transaction detail', async () => {
  await page.getByText('Nike Store Orchard').first().click();
  await page.getByText('Stock earned').waitFor({ timeout: 5000 });
  await page.getByText('Value at fill').waitFor({ timeout: 5000 });
  await page.getByText('Stock transfer').waitFor({ timeout: 5000 });
  await page.getByText('PAFE rewards treasury').waitFor({ timeout: 5000 });
});

await browser.close();

console.log('');
if (errors.length) {
  console.log(`FAILURES (${errors.length}):`);
  for (const e of errors) console.log('  - ' + e);
  process.exit(1);
}
console.log('All smoke checks passed.');
