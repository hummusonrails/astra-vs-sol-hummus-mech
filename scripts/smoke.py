#!/usr/bin/env python3
"""Independent acceptance checks using actual runtime state plus rendered evidence."""
import argparse,json,math
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_common import ROOT, launch, serve
STATE='''() => {if(window.walkerState){const s=window.walkerState;return {x:s.x,z:s.z,heading:s.yaw,orbit:s.orbit,stomps:s.impacts}} const c=document.querySelector('#world canvas');if(c&&c.dataset.x!==undefined){const s=c.dataset;return {x:+s.x,z:+s.z,heading:+s.heading,orbit:+s.orbit,stomps:+s.stomps}}return null}'''
def distance(a,b):return math.hypot(a['x']-b['x'],a['z']-b['z'])
def run(url,out):
 out.mkdir(parents=True,exist_ok=True); result={'url':url,'checks':{},'errors':[]}
 with sync_playwright() as p:
  browser=launch(p)
  page=browser.new_page(viewport={'width':1280,'height':720},device_scale_factor=1)
  page.on('pageerror',lambda e:result['errors'].append(str(e)))
  response=page.goto(url,wait_until='networkidle',timeout=60000)
  page.wait_for_function('('+STATE+')() !== null',timeout=20000)
  page.wait_for_timeout(1200); start=page.evaluate(STATE)
  result['checks']['http_200']=response.status==200
  result['checks']['scene_state_loaded']=bool(start)
  page.screenshot(path=str(out/'verified-opening.png'))
  page.keyboard.down('w');page.wait_for_timeout(1200);page.keyboard.up('w');page.wait_for_timeout(200)
  walked=page.evaluate(STATE);result['checks']['walk']=distance(start,walked)>1
  page.wait_for_timeout(300);result['checks']['key_release']=distance(walked,page.evaluate(STATE))<.08
  heading=page.evaluate(STATE)['heading'];page.keyboard.down('ArrowRight');page.wait_for_timeout(350);page.keyboard.up('ArrowRight')
  result['checks']['steer']=abs(page.evaluate(STATE)['heading']-heading)>.1
  old=page.evaluate(STATE)['orbit'];page.mouse.move(650,360);page.mouse.down();page.mouse.move(790,400,steps=10);page.mouse.up();page.wait_for_timeout(250)
  result['checks']['orbit']=abs(page.evaluate(STATE)['orbit']-old)>.1
  before=page.evaluate(STATE)['stomps'];page.keyboard.press('Space');page.wait_for_timeout(650);page.screenshot(path=str(out/'verified-stomp.png'));page.wait_for_timeout(650)
  result['checks']['stomp']=page.evaluate(STATE)['stomps']>before
  page.keyboard.press('r');page.wait_for_timeout(400);result['checks']['reset']=distance(start,page.evaluate(STATE))<.1
  page.keyboard.down('w');page.wait_for_timeout(200);page.evaluate('window.dispatchEvent(new Event("blur"))');page.wait_for_timeout(150);blur=page.evaluate(STATE);page.wait_for_timeout(300)
  result['checks']['blur_stops_movement']=distance(blur,page.evaluate(STATE))<.08;page.keyboard.up('w')
  page.reload(wait_until='networkidle');page.wait_for_function('('+STATE+')() !== null',timeout=20000);page.wait_for_timeout(500)
  result['checks']['refresh']=distance(start,page.evaluate(STATE))<.1
  result['checks']['no_page_errors']=not result['errors'];result['initial_state']=start;result['walked_state']=walked
  result['pass']=all(result['checks'].values());browser.close()
 (out/'acceptance.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
 return 0 if result['pass'] else 1
if __name__ == '__main__':
    for index, label in enumerate(('astra', 'sol')):
        with serve(label, 49320 + index) as url:
            code = run(url, ROOT / 'test-results' / label)
            if code:
                raise SystemExit(code)
