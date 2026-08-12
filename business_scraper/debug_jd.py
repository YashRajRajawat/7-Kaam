import sys
sys.path.insert(0, '.')
from playwright.sync_api import sync_playwright
from playwright_stealth.stealth import Stealth

stealth_instance = Stealth()
p = sync_playwright().start()
browser = p.chromium.launch(headless=False)
ctx = browser.new_context(
    viewport={'width': 1920, 'height': 1080},
    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale='en-IN',
    timezone_id='Asia/Kolkata'
)
page = ctx.new_page()
stealth_instance.apply_stealth_sync(page)

page.goto('https://www.justdial.com/Bangalore/Electrician-in-Jayanagar', wait_until='domcontentloaded')
page.wait_for_timeout(8000)

# Save screenshot
page.screenshot(path='debug_screenshot.png', full_page=False)
print('Screenshot saved.')

# Check for JS challenge indicators
html_snippet = page.content()[:2000]
print('HTML snippet:')
print(html_snippet)

# Check if JS is even rendering
js_result = page.evaluate("() => document.title")
print('JS document.title:', js_result)
js_body = page.evaluate("() => document.body ? document.body.innerText.slice(0, 200) : 'NO BODY'")
print('JS body text:', js_body)

browser.close()
p.stop()
