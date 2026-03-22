import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto('http://localhost:3000')

        # Click the chat header to open
        await page.click('.ai-chat-header')

        # Wait for chat input to be visible
        await page.wait_for_selector('#ai-chat-input', state='visible')

        # Type a message
        await page.fill('#ai-chat-input', 'What is injera?')

        # Click send
        await page.click('.btn-send')

        # Wait until there's more than one .bot-message that doesn't say "..."
        await page.wait_for_function('Array.from(document.querySelectorAll(".bot-message")).some(el => el.innerText.includes("Injera"))', timeout=30000)

        # Get all AI messages
        messages = await page.eval_on_selector_all('.bot-message', 'els => els.map(el => el.innerText)')

        print("AI Responses found:", messages)

        await browser.close()

asyncio.run(run())
