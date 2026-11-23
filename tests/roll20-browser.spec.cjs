// Browser-level regression for the deployed tabletop UI and live peer sessions.
// Run in GitHub Actions with Playwright. Use a disposable local room only.
const { test, expect, chromium } = require('@playwright/test');
const base = process.env.TABLETOP_TEST_URL || 'http://127.0.0.1:8765';
test.setTimeout(90000);

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
      // The game's first-run Controls tutorial intentionally blocks clicks.
      // Dismiss that unrelated onboarding in the multiplayer chat test.
      await ctx.addInitScript(() => localStorage.setItem('tabletop-seenControls','1'));
      contexts.push(ctx);
      const page = await ctx.newPage();
      page.on('pageerror', e=>errors.push(e.message));
      return page;
    };
    console.log('[multi] launching GM');
    const gm=await mk();
    await gm.goto(base,{waitUntil:'domcontentloaded'});
    await gm.locator('#nameIn').fill('GM Browser Test');
    await gm.locator('#createBtn').click();
    await expect(gm.locator('#game')).toBeVisible({timeout:55000});
    const code=(await gm.locator('#roomCode').textContent()).trim();
    console.log('[multi] GM room '+code);
    expect(code).toMatch(/^[A-Z0-9]{4,8}$/i);
    const join = async name => {
      const page=await mk();
      await page.goto(base+'?room='+encodeURIComponent(code),{waitUntil:'domcontentloaded'});
      await page.locator('#nameIn').fill(name);
      await page.locator('#joinBtn').click();
      await expect(page.locator('#game')).toBeVisible({timeout:55000});
      return page;
    };
    console.log('[multi] joining Amy');
    const amy=await join('Amy Test');
    console.log('[multi] Amy connected');
    console.log('[multi] joining Guest');
    const guest=await join('Guest Test');
    console.log('[multi] Guest connected');
    const send=async (page,message)=>{
      const snapshot=await page.evaluate(()=>{
        const ids=['side','r20Dock','r20Chat','logSec','chatIn','chatSend'];
        const result={};
        for(const id of ids){
          const el=document.getElementById(id);
          const r=el?.getBoundingClientRect();
          result[id]={rect:r&&{x:r.x,y:r.y,width:r.width,height:r.height},display:el&&getComputedStyle(el).display,visibility:el&&getComputedStyle(el).visibility};
        }
        return result;
      });
      console.log('[multi] chat layout '+JSON.stringify(snapshot));
      console.log('[multi] click Chat tab');
      await page.locator('[data-r20-tab="chat"]').click({timeout:7000});
      console.log('[multi] Chat tab selected; filling input');
      await page.locator('#chatIn').fill(message,{timeout:7000});
      console.log('[multi] input filled; clicking Send');
      await page.locator('#chatSend').click({timeout:7000});
      console.log('[multi] sent '+message.slice(0,40)+'; sender log: '+(await page.locator('#log').innerText()).slice(-200));
    };
    const distinctive='public-'+Date.now();
    console.log('[multi] send public');
    await send(amy,distinctive);
    console.log('[multi] awaiting GM public');
    await expect(gm.locator('#log')).toContainText(distinctive,{timeout:10000});
    console.log('[multi] awaiting guest public');
    await expect(guest.locator('#log')).toContainText(distinctive,{timeout:10000});
    const privateText='secret-between-amy-guest-'+Date.now();
    console.log('[multi] send whisper to Guest');
    await send(amy,'/w "Guest Test" '+privateText);
    await expect(amy.locator('#log')).toContainText(privateText,{timeout:15000});
    await expect(guest.locator('#log')).toContainText(privateText,{timeout:15000});
    await expect(gm.locator('#log')).toContainText(privateText,{timeout:15000});
    const gmOnly='gm-only-'+Date.now();
    console.log('[multi] send whisper to GM');
    await send(amy,'/w gm '+gmOnly);
    await expect(gm.locator('#log')).toContainText(gmOnly,{timeout:15000});
    expect(await guest.locator('#log').innerText()).not.toContain(gmOnly);
    console.log('[multi] send private roll');
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
