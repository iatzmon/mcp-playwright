import type { Page, Frame } from 'playwright';
import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

// Removed AriaNode type and formatAriaNode function


/**
 * Captures an accessibility snapshot using ariaSnapshot, formatted like the reference server.
 * @param page The Playwright Page object.
 * @returns A promise that resolves to the formatted snapshot string.
 */
async function captureAccessibilitySnapshot(page: Page): Promise<string> {
  const lines: string[] = [];
  lines.push(`- Page URL: ${page.url()}`);
  lines.push(`- Page Title: ${await page.title()}`);
  // TODO: Add check for file chooser visibility if needed

  lines.push(`- Page Snapshot`);
  lines.push('```yaml');

  let mainSnapshotString = '# Main frame snapshot could not be captured.';
  // Main frame snapshot using ariaSnapshot on locator
  try {
    // Call ariaSnapshot directly on the locator
    const snapshotResult = await page.locator('html').ariaSnapshot({ ref: true });
    console.log('--- Main Frame ariaSnapshot Raw Result ---'); // DEBUG
    console.log(snapshotResult); // DEBUG
    mainSnapshotString = snapshotResult ?? '# Main frame snapshot returned null/undefined.';
  } catch (error) {
    console.error('--- Main Frame ariaSnapshot Error ---', error); // DEBUG
    mainSnapshotString = `# Error capturing main frame snapshot: ${(error as Error).message}`;
  }
  lines.push(mainSnapshotString);


  // IFrame snapshots using ariaSnapshot on locator
  try {
    const frameLocators = await page.locator('iframe').filter({ visible: true }).all();
    for (let i = 0; i < frameLocators.length; i++) {
      const frameLocator = frameLocators[i];
      const frame = await frameLocator.contentFrame();
      if (!frame) continue;

      const src = await frameLocator.getAttribute('src') || '[unknown src]';
      const name = await frameLocator.getAttribute('name') || '[unknown name]';
      lines.push(''); // Separator
      lines.push(`# iframe src=${src} name=${name}`);

      let frameSnapshotString = '# iframe snapshot could not be captured.';
      try {
         // Call ariaSnapshot directly on the frame's locator
         const snapshotResult = await frame.locator('html').ariaSnapshot({ ref: true });
         console.log(`--- IFrame ${i} ariaSnapshot Raw Result ---`); // DEBUG
         console.log(snapshotResult); // DEBUG
         if (snapshotResult) {
            // Replicate the ref replacement logic from the reference server
            const refPrefix = `f${i}`;
            frameSnapshotString = snapshotResult.replace(/\[ref=/g, `[ref=${refPrefix}`); // Use snapshotResult directly
         }
      } catch (frameError) {
        frameSnapshotString = `# Error capturing iframe snapshot: ${(frameError as Error).message}`;
      }
      lines.push(frameSnapshotString);
    }
  } catch (error) {
     lines.push(`# Error processing iframes: ${(error as Error).message}`);
  }


  lines.push('```');
  lines.push(''); // Trailing newline

  return lines.join('\n');
}


/**
 * Tool for capturing accessibility snapshots.
 */
export class SnapshotTool extends BrowserToolBase {
  /**
   * Execute the snapshot tool.
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    // Use safeExecute, but the core logic is now in captureAccessibilitySnapshot
    return this.safeExecute(context, async (page) => {
      try {
        const snapshotString = await captureAccessibilitySnapshot(page);
        return createSuccessResponse(snapshotString);
      } catch (error) {
        // Catch errors during snapshot generation itself
        return createErrorResponse(`Failed to capture snapshot: ${(error as Error).message}`);
      }
    });
  }
}