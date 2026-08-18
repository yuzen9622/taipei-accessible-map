import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MarkdownText from "../MarkdownText";

describe("MarkdownText", () => {
  it("renders basic markdown headings and paragraphs", () => {
    const markdown = "# 標題一\n\n這是一段內容。";
    const html = renderToStaticMarkup(
      React.createElement(MarkdownText, null, markdown),
    );

    expect(html).toContain("<h1");
    expect(html).toContain("標題一</h1>");
    expect(html).toContain("<p");
    expect(html).toContain("這是一段內容。</p>");
  });

  it("renders links and lists correctly", () => {
    const markdown = "- 項目 1\n- 項目 2\n\n[連結](https://example.com)";
    const html = renderToStaticMarkup(
      React.createElement(MarkdownText, null, markdown),
    );

    expect(html).toContain("<ul");
    expect(html).toContain("<li");
    expect(html).toContain("項目 1");
    expect(html).toContain(
      '<a class="text-primary underline hover:no-underline"',
    );
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
  });

  it("renders GFM markdown tables with proper table, thead, tbody, th, td structure and styles", () => {
    const markdown = `
| 捷運站 | 無障礙電梯 | 輪椅席 |
| :--- | :---: | ---: |
| 台北車站 | 有 | 充足 |
| 市政府站 | 有 | 一般 |
    `.trim();

    const html = renderToStaticMarkup(
      React.createElement(MarkdownText, null, markdown),
    );

    // Verify wrapper with overflow
    expect(html).toContain("overflow-x-auto");
    // Verify table structure
    expect(html).toContain("<table");
    expect(html).toContain("<thead");
    expect(html).toContain("<tbody");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
    // Verify table cell contents
    expect(html).toContain("捷運站");
    expect(html).toContain("無障礙電梯");
    expect(html).toContain("輪椅席");
    expect(html).toContain("台北車站");
    expect(html).toContain("市政府站");
  });
});
