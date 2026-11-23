import assert from 'node:assert/strict';
export async function checkNativeResize(page){
    await page.click('#layout-reset');const before=await page.evaluate(()=>JSON.stringify(Native3D.project));
    const box=s=>page.locator(s).boundingBox();
    async function drag(selector,dx,dy){const b=await box(selector);await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+dx,b.y+b.height/2+dy,{steps:8});await page.mouse.up();}
    const scene=await box('.scene-panel'),inspector=await box('.inspector'),timeline=await box('.timeline');
    await drag('.resize-scene',90,0);assert.ok(Math.abs((await box('.scene-panel')).width-scene.width-90)<3);
    await drag('.resize-inspector',-70,0);assert.ok(Math.abs((await box('.inspector')).width-inspector.width-70)<3);
    await drag('.resize-timeline',0,100);const shorter=(await box('.timeline')).height;assert.ok(shorter<timeline.height-70);await drag('.resize-timeline',0,-60);assert.ok((await box('.timeline')).height>shorter+40);
    await page.locator('.resize-scene').focus();const width=(await box('.scene-panel')).width;await page.keyboard.press('ArrowRight');assert.ok(Math.abs((await box('.scene-panel')).width-width-10)<3);
    // Cancelled pointer drags restore size and release capture.
    const grip=await box('.resize-scene'),old=(await box('.scene-panel')).width;await page.mouse.move(grip.x+4,grip.y+30);await page.mouse.down();await page.mouse.move(grip.x+54,grip.y+30);await page.keyboard.press('Escape');await page.mouse.up();assert.ok(Math.abs((await box('.scene-panel')).width-old)<3);
    assert.equal(await page.evaluate(()=>document.body.classList.contains('resizing-panels')),false);
    const savedWidth=(await box('.scene-panel')).width;assert.equal(await page.evaluate(()=>JSON.stringify(Native3D.project)),before);
    await page.reload();await page.waitForFunction(()=>window.Native3D);assert.ok(Math.abs((await box('.scene-panel')).width-savedWidth)<3);
    await page.locator('.resize-scene').dblclick();assert.ok(Math.abs((await box('.scene-panel')).width-scene.width)<3);
    await page.setViewportSize({width:900,height:650});assert.ok((await box('.viewport')).width>=250);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
    await page.click('#layout-reset');await page.locator('#hierarchy button').nth(3).click();
    // Expanded Scene & Camera contains enough real controls to require its own scroll.
    const settings=page.locator('.inspector details').filter({has:page.locator('#scene-form')});await settings.evaluate(el=>el.open=true);await settings.locator('.inspector-section').evaluate(el=>el.open=true);
    const nested=await settings.evaluate(el=>{el.scrollTop=100;return {overflow:getComputedStyle(el).overflowY,scroll:el.scrollTop,height:el.clientHeight,content:el.scrollHeight};});assert.equal(nested.overflow,'auto');assert.ok(nested.content>nested.height);assert.ok(nested.scroll>0);
    const outer=await page.locator('.inspector').evaluate(el=>{el.scrollTop=200;return {scroll:el.scrollTop,content:el.scrollHeight,height:el.clientHeight};});assert.ok(outer.content>outer.height);assert.ok(outer.scroll>0);
    await page.click('#export');const dialog=page.locator('#native-movie');await dialog.waitFor();const modal=await dialog.evaluate(el=>{el.scrollTop=200;return {overflow:getComputedStyle(el).overflowY,resize:getComputedStyle(el).resize,scroll:el.scrollTop,content:el.scrollHeight,height:el.clientHeight};});assert.equal(modal.resize,'both');assert.equal(modal.overflow,'auto');assert.ok(modal.content>modal.height);assert.ok(modal.scroll>0);await dialog.locator('[data-close]').click();
    await page.screenshot({path:'tmp/native3d-resized-panels.png'});
    await page.setViewportSize({width:390,height:844});await page.click('#layout-reset');const mobileHeight=(await box('.scene-panel')).height;await page.locator('.resize-scene').scrollIntoViewIfNeeded();await drag('.resize-scene',0,65);assert.ok((await box('.scene-panel')).height>mobileHeight+40);assert.equal(await page.locator('.resize-scene').getAttribute('aria-orientation'),'horizontal');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
    await page.setViewportSize({width:1500,height:1000});await page.click('#layout-reset');
    console.log('PASS native resizing: pointer/keyboard edges, cancel/reset, saved dimensions, narrow-screen bounds, mobile heights and independent panel/nested/dialog scrolling');
}
