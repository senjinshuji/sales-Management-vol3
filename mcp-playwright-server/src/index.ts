#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import { chromium, firefox, webkit, Browser, Page } from "playwright";

// Browser management
interface BrowserState {
  browser: Browser | null;
  page: Page | null;
  context: any | null;
}

const browsers: Record<string, BrowserState> = {
  chromium: { browser: null, page: null, context: null },
  firefox: { browser: null, page: null, context: null },
  webkit: { browser: null, page: null, context: null },
};

// Create server instance
const server = new Server(
  {
    name: "mcp-playwright",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "launch_browser",
      description: "Launch a browser instance",
      inputSchema: {
        type: "object",
        properties: {
          browserType: {
            type: "string",
            enum: ["chromium", "firefox", "webkit"],
            description: "Type of browser to launch",
          },
          headless: {
            type: "boolean",
            description: "Run browser in headless mode",
            default: true,
          },
        },
        required: ["browserType"],
      },
    },
    {
      name: "navigate_to",
      description: "Navigate to a URL in the browser",
      inputSchema: {
        type: "object",
        properties: {
          browserType: {
            type: "string",
            enum: ["chromium", "firefox", "webkit"],
          },
          url: {
            type: "string",
            description: "URL to navigate to",
          },
        },
        required: ["browserType", "url"],
      },
    },
    {
      name: "click_element",
      description: "Click an element by selector",
      inputSchema: {
        type: "object",
        properties: {
          browserType: {
            type: "string",
            enum: ["chromium", "firefox", "webkit"],
          },
          selector: {
            type: "string",
            description: "CSS selector or text selector",
          },
        },
        required: ["browserType", "selector"],
      },
    },
    {
      name: "type_text",
      description: "Type text into an input field",
      inputSchema: {
        type: "object",
        properties: {
          browserType: {
            type: "string",
            enum: ["chromium", "firefox", "webkit"],
          },
          selector: {
            type: "string",
            description: "CSS selector for the input field",
          },
          text: {
            type: "string",
            description: "Text to type",
          },
        },
        required: ["browserType", "selector", "text"],
      },
    },
    {
      name: "take_screenshot",
      description: "Take a screenshot of the current page",
      inputSchema: {
        type: "object",
        properties: {
          browserType: {
            type: "string",
            enum: ["chromium", "firefox", "webkit"],
          },
          path: {
            type: "string",
            description: "Path to save the screenshot",
          },
          fullPage: {
            type: "boolean",
            description: "Capture full page screenshot",
            default: false,
          },
        },
        required: ["browserType", "path"],
      },
    },
    {
      name: "get_page_content",
      description: "Get the current page content (HTML)",
      inputSchema: {
        type: "object",
        properties: {
          browserType: {
            type: "string",
            enum: ["chromium", "firefox", "webkit"],
          },
        },
        required: ["browserType"],
      },
    },
    {
      name: "close_browser",
      description: "Close a browser instance",
      inputSchema: {
        type: "object",
        properties: {
          browserType: {
            type: "string",
            enum: ["chromium", "firefox", "webkit"],
          },
        },
        required: ["browserType"],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "launch_browser": {
        const { browserType, headless = true } = args as any;
        const BrowserClass = { chromium, firefox, webkit }[browserType];
        
        if (!BrowserClass) {
          throw new Error(`Unknown browser type: ${browserType}`);
        }

        const browser = await BrowserClass.launch({ headless });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        browsers[browserType] = { browser, page, context };
        
        return {
          content: [
            {
              type: "text",
              text: `Launched ${browserType} browser${headless ? " in headless mode" : ""}`,
            },
          ],
        };
      }

      case "navigate_to": {
        const { browserType, url } = args as any;
        const state = browsers[browserType];
        
        if (!state || !state.browser) {
          throw new Error(`${browserType} browser is not launched`);
        }

        if (!state.page) {
          state.context = await state.browser.newContext();
          state.page = await state.context.newPage();
        }
        
        await state.page.goto(url);
        return {
          content: [
            {
              type: "text",
              text: `Navigated to ${url}`,
            },
          ],
        };
      }

      case "click_element": {
        const { browserType, selector } = args as any;
        const state = browsers[browserType];
        
        if (!state || !state.page) {
          throw new Error(`No active page for ${browserType}`);
        }

        await state.page.click(selector);
        return {
          content: [
            {
              type: "text",
              text: `Clicked element: ${selector}`,
            },
          ],
        };
      }

      case "type_text": {
        const { browserType, selector, text } = args as any;
        const state = browsers[browserType];
        
        if (!state || !state.page) {
          throw new Error(`No active page for ${browserType}`);
        }

        await state.page.fill(selector, text);
        return {
          content: [
            {
              type: "text",
              text: `Typed "${text}" into ${selector}`,
            },
          ],
        };
      }

      case "take_screenshot": {
        const { browserType, path, fullPage = false } = args as any;
        const state = browsers[browserType];
        
        if (!state || !state.page) {
          throw new Error(`No active page for ${browserType}`);
        }

        await state.page.screenshot({ path, fullPage });
        return {
          content: [
            {
              type: "text",
              text: `Screenshot saved to ${path}`,
            },
          ],
        };
      }

      case "get_page_content": {
        const { browserType } = args as any;
        const state = browsers[browserType];
        
        if (!state || !state.page) {
          throw new Error(`No active page for ${browserType}`);
        }

        const content = await state.page.content();
        return {
          content: [
            {
              type: "text",
              text: content,
            },
          ],
        };
      }

      case "close_browser": {
        const { browserType } = args as any;
        const state = browsers[browserType];
        
        if (!state || !state.browser) {
          throw new Error(`${browserType} browser is not launched`);
        }

        await state.browser.close();
        browsers[browserType] = { browser: null, page: null, context: null };
        
        return {
          content: [
            {
              type: "text",
              text: `Closed ${browserType} browser`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Playwright server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});