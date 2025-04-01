import type { Page } from 'playwright';
import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

/**
 * Captures an accessibility snapshot of the current page.
 * Replicates the logic from the reference implementation, including iframe handling.
 * @param page The Playwright Page object.
 * @returns A promise that resolves to the formatted snapshot string.
 */
async function captureAccessibilitySnapshot(page: Page): Promise<string> {
  const lines: string[] = [];
  lines.push(`- Page URL: ${page.url()}`);
  lines.push(`- Page Title: ${await page.title()}`);
  // TODO: Add check for file chooser visibility if needed later, similar to reference's context.hasFileChooser()

  lines.push(`- Page Snapshot`);
  lines.push('```yaml');

  // Main frame snapshot
  try {
    const mainSnapshot = await page.accessibility.snapshot({ interestingOnly: false, root: await page.locator(':root').elementHandle() ?? undefined });
    if (mainSnapshot) {
      // Basic formatting, might need refinement based on actual output structure
      lines.push(JSON.stringify(mainSnapshot, null, 2)); // Placeholder formatting
    } else {
      lines.push('# Main frame snapshot could not be captured.');
    }
  } catch (error) {
    lines.push(`# Error capturing main frame snapshot: ${(error as Error).message}`);
  }


  // IFrame snapshots (replicating reference logic structure)
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

      try {
        const rootHandle = await frame.locator(':root').elementHandle();
        if (rootHandle) {
          // Use page.accessibility.snapshot with the frame's root handle
          const frameSnapshot = await page.accessibility.snapshot({ interestingOnly: false, root: rootHandle });
          if (frameSnapshot) {
            // Basic formatting, might need refinement
            lines.push(JSON.stringify(frameSnapshot, null, 2)); // Placeholder formatting
          } else {
            lines.push('# iframe snapshot could not be captured.');
          }
        } else {
           lines.push('# Could not get root element handle for iframe.');
        }
      } catch (frameError) {
        lines.push(`# Error capturing iframe snapshot: ${(frameError as Error).message}`);
      }
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
    return this.safeExecute(context, async (page) => {
      try {
        const snapshotString = await captureAccessibilitySnapshot(page);
        return createSuccessResponse(snapshotString);
      } catch (error) {
        return createErrorResponse(`Failed to capture snapshot: ${(error as Error).message}`);
      }
    });
  }
}