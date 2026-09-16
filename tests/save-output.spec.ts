import { goto } from "./util";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

// A saved wiki ends with a newline after </html>. When that file is loaded
// again, the HTML parser moves the newline inside <body>. Saving must drop it
// or a blank line builds up before </body> with every load and save.
test("Saved wiki does not accumulate newlines before </body>", async ({
    page
}) => {
    await page.route(
        (url) => url.pathname === "/",
        async (route) => {
            const response = await route.fetch();
            await route.fulfill({
                response,
                body: `${await response.text()}\n`
            });
        }
    );
    await goto(page);

    const downloadPromise = page.waitForEvent("download");
    await page.keyboard.press("Control+S");
    const download = await downloadPromise;
    const content = await readFile(await download.path(), "utf-8");

    expect(content.endsWith("</script></body></html>\n")).toBe(true);
});
