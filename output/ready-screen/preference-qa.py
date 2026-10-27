exec(open('output/ready-screen/layout-qa.py').read().split('with sync_playwright() as p:')[0])
rows=[]
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome',headless=True) if engine=='chromium' else p.webkit.launch(headless=True)
  c,page=login(b,1,{'width':390,'height':744})
  selected=page.locator('.challenge-modes input').nth(0).is_checked();target='standard' if selected else 'relaxed';page.locator('.challenge-modes label').nth(1 if selected else 0).click()
  for attempt in range(30):
   state=page.evaluate('async()=>await(await fetch("/api/state")).json()');profile=state['family']['profiles'][state['playerId']]
   if profile.get('challengeTiming')==target:break
   page.wait_for_timeout(100)
  else:raise AssertionError('Mode did not save')
  assert profile['run']['challenge']['clock'] is None
  page.reload();page.get_by_role('button',name='繼續挑戰',exact=True).click();page.locator('.ready-start:not([disabled])').wait_for();assert page.locator('.challenge-modes input').nth(1 if target=='standard' else 0).is_checked()
  page.evaluate('window.dispatchEvent(new Event("offline"))');page.wait_for_timeout(100);assert page.locator('.ready-start').is_disabled()
  rows.append({'engine':engine,'selectedModePersistsReload':True,'selectionDoesNotStartClock':True,'offlineBlocksStart':True});c.close();b.close()
 (OUT/'preference-results.json').write_text(json.dumps(rows,indent=2));print('Preference PASS',len(rows))
