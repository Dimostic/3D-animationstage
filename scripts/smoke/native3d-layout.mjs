import assert from 'node:assert/strict';
import {checkNativeResize} from './native3d-resize.mjs';
export async function checkNativeLayout(page){
    const stage=()=>page.locator('.viewport').boundingBox(),toggle=key=>page.locator(`[data-panel="${key}"]`);
    const before=await page.evaluate(()=>JSON.stringify(Native3D.project)),initial=await stage();
    const sceneSettings=page.locator('.inspector details').filter({has:page.locator('#scene-form')});await sceneSettings.locator(':scope > summary').click();assert.equal(await sceneSettings.getAttribute('open'),null);
    await toggle('tools').focus();await page.keyboard.press('Space');assert.equal(await toggle('tools').getAttribute('aria-expanded'),'false');await page.keyboard.press('Enter');assert.equal(await toggle('tools').getAttribute('aria-expanded'),'true');
    await toggle('scene').click();assert.equal(await page.locator('.scene-panel').isVisible(),false);assert.ok((await stage()).width>initial.width+150);
    await toggle('inspector').click();assert.ok((await stage()).width>initial.width+400);
    await toggle('timeline').click();assert.ok((await stage()).height>initial.height+100);
    await toggle('tools').click();await toggle('project').click();assert.equal(await page.locator('header.top').isVisible(),false);
    assert.equal(await page.evaluate(()=>JSON.stringify(Native3D.project)),before,'Collapsing panels changed saved scene data');
    await page.reload();await page.waitForFunction(()=>window.Native3D);const reloaded=await page.evaluate(()=>JSON.stringify(Native3D.project));assert.equal(await toggle('scene').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#object-form').isVisible(),false);assert.equal(await sceneSettings.getAttribute('open'),null);
    await page.click('#stage-focus');const large=await stage();assert.ok(large.height>850);assert.ok(large.width>1450);assert.equal(await page.locator('#stage-play').isVisible(),true);
    await page.screenshot({path:'tmp/native3d-stage-expanded.png'});await page.keyboard.press('Escape');assert.equal(await toggle('scene').getAttribute('aria-expanded'),'false');
    await page.click('#layout-reset');for(const key of ['scene','inspector','timeline','tools','project'])assert.equal(await toggle(key).getAttribute('aria-expanded'),'true');
    assert.notEqual(await sceneSettings.getAttribute('open'),null);await page.screenshot({path:'tmp/native3d-layout-desktop.png'});
    assert.equal(await page.evaluate(()=>JSON.stringify(Native3D.project)),reloaded,'Layout changed saved scene data');
    await page.locator('#frame').focus();await page.locator('#workspace-tooltip').waitFor({state:'visible'});assert.match(await page.locator('#workspace-tooltip').textContent(),/fit.*selected/i);assert.match(await page.locator('#frame').getAttribute('aria-describedby'),/workspace-tooltip/);await page.locator('#add').dispatchEvent('pointerout',{bubbles:true});assert.equal(await page.locator('#workspace-tooltip').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#workspace-tooltip').isVisible(),false);
    await page.hover('#add');await page.locator('#workspace-tooltip').waitFor({state:'visible'});assert.match(await page.locator('#workspace-tooltip').textContent(),/place.*3D object/);
    assert.ok(await page.locator('#hierarchy button').first().getAttribute('title'));
    await page.click('#export');await page.locator('#native-movie').waitFor();await page.locator('#native-movie [data-preview-button]').focus();await page.locator('#workspace-tooltip').waitFor({state:'visible'});assert.equal(await page.locator('#workspace-tooltip').evaluate(el=>!!el.closest('dialog')),true);await page.locator('#native-movie [data-close]').click();
    await page.setViewportSize({width:390,height:844});await page.click('#stage-focus');assert.ok((await stage()).height>650);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);await page.screenshot({path:'tmp/native3d-stage-mobile.png'});await page.click('#stage-focus');await page.click('#layout-reset');await page.setViewportSize({width:1500,height:1000});
    await page.click('#stage-fullscreen');await page.waitForFunction(()=>!!document.fullscreenElement);await page.click('#stage-fullscreen');await page.waitForFunction(()=>!document.fullscreenElement);
    await checkNativeResize(page);
    console.log('PASS native layout: collapsible panels/menus/tools, persistent preferences, expanded stage, Escape/restore/reset, renderer sizing, keyboard/hover/modal help, mobile and full screen');
}
