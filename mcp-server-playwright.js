#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { chromium, firefox, webkit } from "playwright";

const server = new Server(
  {
    name: "playwright-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Browser instances
let browsers = {
  chromium: null,
  firefox: null,
  webkit: null,
};

// Tool definitions
server.addTool(
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
  async (args) => {
    const { browserType, headless = true } = args;
    const BrowserClass = { chromium, firefox, webkit }[browserType];
    
    if (!BrowserClass) {
      throw new Error(`Unknown browser type: ${browserType}`);
    }

    browsers[browserType] = await BrowserClass.launch({ headless });
    return {
      content: [
        {
          type: "text",
          text: `Launched ${browserType} browser${headless ? " in headless mode" : ""}`,
        },
      ],
    };
  }
);

server.addTool(
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
  async (args) => {
    const { browserType, url } = args;
    const browser = browsers[browserType];
    
    if (!browser) {
      throw new Error(`${browserType} browser is not launched`);
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Store the page for later use
    if (!browsers[`${browserType}_page`]) {
      browsers[`${browserType}_page`] = page;
    }
    
    await page.goto(url);
    return {
      content: [
        {
          type: "text",
          text: `Navigated to ${url}`,
        },
      ],
    };
  }
);

server.addTool(
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
  async (args) => {
    const { browserType, selector } = args;
    const page = browsers[`${browserType}_page`];
    
    if (!page) {
      throw new Error(`No active page for ${browserType}`);
    }

    await page.click(selector);
    return {
      content: [
        {
          type: "text",
          text: `Clicked element: ${selector}`,
        },
      ],
    };
  }
);

server.addTool(
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
  async (args) => {
    const { browserType, selector, text } = args;
    const page = browsers[`${browserType}_page`];
    
    if (!page) {
      throw new Error(`No active page for ${browserType}`);
    }

    await page.fill(selector, text);
    return {
      content: [
        {
          type: "text",
          text: `Typed "${text}" into ${selector}`,
        },
      ],
    };
  }
);

server.addTool(
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
  async (args) => {
    const { browserType, path, fullPage = false } = args;
    const page = browsers[`${browserType}_page`];
    
    if (!page) {
      throw new Error(`No active page for ${browserType}`);
    }

    await page.screenshot({ path, fullPage });
    return {
      content: [
        {
          type: "text",
          text: `Screenshot saved to ${path}`,
        },
      ],
    };
  }
);

server.addTool(
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
  async (args) => {
    const { browserType } = args;
    const page = browsers[`${browserType}_page`];
    
    if (!page) {
      throw new Error(`No active page for ${browserType}`);
    }

    const content = await page.content();
    return {
      content: [
        {
          type: "text",
          text: content,
        },
      ],
    };
  }
);

server.addTool(
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
  async (args) => {
    const { browserType } = args;
    const browser = browsers[browserType];
    
    if (!browser) {
      throw new Error(`${browserType} browser is not launched`);
    }

    await browser.close();
    browsers[browserType] = null;
    browsers[`${browserType}_page`] = null;
    
    return {
      content: [
        {
          type: "text",
          text: `Closed ${browserType} browser`,
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Playwright MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});