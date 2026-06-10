import { goto } from "./util";
import { test, expect } from "@playwright/test";

const scenarios = [
    {
        name: "basic formatting",
        markdown: `# Heading 1


## Heading 2

watermelon


### Heading 3

**bold text**

*italic text*`,
        html: `
<h1>Heading 1</h1>


<h2>Heading 2</h2>

<p>watermelon</p>


<h3>Heading 3</h3>

<p><b>bold text</b></p>

<p><i>italic text</i></p>
`
    },
    {
        name: "basic lists",
        markdown: `unordered list

- item 1
- item 2 **bold**
- item 3 \`code\`

ordered list

1. item 1
2. item 2 *italic*
3. item 3 \`code\``,
        html: `
<p>unordered list</p>

<ul>
<li>item 1</li>
<li>item 2 <b>bold</b></li>
<li>item 3 <code>code</code></li>
</ul>

<p>ordered list</p>

<ol>
<li>item 1</li>
<li>item 2 <i>italic</i></li>
<li>item 3 <code>code</code></li>
</ol>
`
    },
    {
        name: "enhancement: bold + italics",
        markdown: `**bold** *italics* ***both***`,
        html: `
<p><b>bold</b> <i>italics</i> <b><i>both</i></b></p>
`
    }
];

for (const scenario of scenarios) {
    test(scenario.name, async ({ page }) => {
        await goto(page, "blank-page");
        await expect(page.locator("#of_input")).toBeVisible();
        await page.locator("#of_input").fill(scenario.markdown);
        await page.locator("#of_save").click();
        await expect(page.locator("#of_input")).toBeHidden();
        await expect(await page.locator("article#blank-page").innerHTML()).toBe(
            scenario.html
        );
        await page.locator("#of_edit").click();
        await expect(page.locator("#of_input")).toBeVisible();
        await expect(await page.locator("#of_input").inputValue()).toBe(
            scenario.markdown
        );
    });
}
