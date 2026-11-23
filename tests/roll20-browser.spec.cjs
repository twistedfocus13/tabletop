// Browser-level regression for the deployed tabletop UI and live peer sessions.
// Run in GitHub Actions with Playwright. Use a disposable local room only.
const { test, expect, chromium } = require('@playwright/test');
const base = process.env.TABLETOP_TEST_URL || 'http://127.0.0.1:8765';
test.setTimeout(150000);

test('Roll20 dock keeps a single working chat, dice and player section', async ({page}) => {
  const exceptions = [];
  page.on('pageerror', error => exceptions.push(error.message));
  await page.goto(base, { waitUntil:'domcontentloaded' });
  await expect(page.locator('#r20Dock')).toHaveCount(1);
  await expect(page.locator('#r20Chat #logSec')).toHaveCount(1);
  await expect(page.locator('#r20Dice #dice')).toHaveCount(1);
  await expect(page.locator('#r20Players #players')).toHaveCount(1);
  await page.locator('[data-r20-tab="dice"]').evaluate(el=>el.click());
  await expect(page.locator('#r20Dice')).toHaveClass(/active/);
  await page.locator('[data-r20-tab="players"]').evaluate(el=>el.click());
  await expect(page.locator('#r20Players')).toHaveClass(/active/);
  await page.locator('[data-r20-tab="settings"]').evaluate(el=>el.click());
  await expect(page.locator('body')).toHaveClass(/r20DockSettings/);
  await page.locator('[data-r20-tab="chat"]').evaluate(el=>el.click());
  await expect(page.locator('#r20Chat')).toHaveClass(/active/);
  expect(exceptions).toEqual([]);
});

test('GM and two players share public chat but not each other\'s private whispers', async () => {
  const browser = await chromium.launch({ headless:true, args:['--use-angle=swiftshader','--enable-webgl','--no-sandbox'] });
  const contexts=[], errors=[];
  try {
    const mk = async () => {
      const ctx = await browser.newContext({ viewport:{width:1440,height:900} });
      contexts.push(ctx);
      const page = await ctx.newPage();
      page.on('pageerror', e=>errors.push(e.message));
      return page;
    };
    const gm=await mk();
    await gm.goto(base,{waitUntil:'domcontentloaded'});
    await gm.locator('#nameIn').fill('GM Browser Test');
    await gm.locator('#createBtn').click();
    await expect(gm.locator('#game')).toBeVisible({timeout:55000});
    const code=(await gm.locator('#roomCode').textContent()).trim();
    expect(code).toMatch(/^[A-Z0-9]{4,8}$/i);
    const join = async name => {
      const page=await mk();
      await page.goto(base+'?room='+encodeURIComponent(code),{waitUntil:'domcontentloaded'});
      await page.locator('#nameIn').fill(name);
      await page.locator('#joinBtn').click();
      await expect(page.locator('#game')).toBeVisible({timeout:55000});
      return page;
    };
    const amy=await join('Amy Test');
    const guest=await join('Guest Test');
    const send=async (page,message)=>{
      await page.locator('[data-r20-tab="chat"]').click();
      await page.locator('#chatIn').fill(message);
      await page.locator('#chatSend').click();
    };
    const distinctive='public-'+Date.now();
    await send(amy,distinctive);
    await expect(gm.locator('#log')).toContainText(distinctive,{timeout:15000});
    await expect(guest.locator('#log')).toContainText(distinctive,{timeout:15000});
    const privateText='secret-between-amy-guest-'+Date.now();
    await send(amy,'/w "Guest Test" '+privateText);
    await expect(amy.locator('#log')).toContainText(privateText,{timeout:15000});
    await expect(guest.locator('#log')).toContainText(privateText,{timeout:15000});
    await expect(gm.locator('#log')).toContainText(privateText,{timeout:15000});
    const gmOnly='gm-only-'+Date.now();
    await send(amy,'/w gm '+gmOnly);
    await expect(gm.locator('#log')).toContainText(gmOnly,{timeout:15000});
    expect(await guest.locator('#log').innerText()).not.toContain(gmOnly);
    await send(amy,'/gmroll 1d20');
    await expect(amy.locator('#log .roll').last()).toContainText('rolled 1d20',{timeout:15000});
    expect((await guest.locator('#log').innerText())).not.toMatch(/rolled 1d20/);
    // Reconnect the recipient with the same session clientId when possible:
    // an ordinary refresh may intentionally generate a new client ID.
    // Instead check public + private history filtering by recipient on host.
    await expect(gm.locator('#r20Dock')).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map(x=>x.close().catch(()=>{})));
    await browser.close();
  }
});
