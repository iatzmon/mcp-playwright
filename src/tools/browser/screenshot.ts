import type { Page } from 'playwright';
import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse } from '../common/types.js'; // Removed createSuccessResponse as we won't return text

/**
 * Tool for taking screenshots, mimicking playwright-alt's browser_take_screenshot.
 * Returns only the image data.
 */
export class ScreenshotTool extends BrowserToolBase {

  /**
   * Execute the screenshot tool.
   * @param args Arguments, expecting an optional 'raw' boolean.
   * @param context Tool context containing the page.
   */
  async execute(args: { raw?: boolean }, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const isRaw = args.raw === true;
      const screenshotType = isRaw ? 'png' : 'jpeg';
      const mimeType = isRaw ? 'image/png' : 'image/jpeg';

      // Screenshot options: default to full page, adjust quality for jpeg
      const screenshotOptions: any = {
        type: screenshotType,
        fullPage: true, // Defaulting to full page, similar to how snapshot works
        scale: 'css', // Use CSS pixels
        ...(screenshotType === 'jpeg' && { quality: 80 }), // Reasonable quality for JPEG
      };

      const screenshotBuffer = await page.screenshot(screenshotOptions);
      const base64Screenshot = screenshotBuffer.toString('base64');

      // Return only the image content, no text confirmation
      return {
        content: [{
          type: 'image',
          data: base64Screenshot,
          mimeType: mimeType,
        }],
        isError: false,
      };
    });
  }

  // Removed getScreenshots method as we no longer store them
}