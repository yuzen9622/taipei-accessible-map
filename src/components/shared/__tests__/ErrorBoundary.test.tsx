import type React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  DefaultErrorFallback,
  ErrorBoundary,
  withErrorBoundary,
} from "../ErrorBoundary";

// A component that can conditionally throw
function ProblematicChild({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Test component crash!");
  }
  return <div data-testid="child-content">正常運作的元件內容</div>;
}

describe("ErrorBoundary", () => {
  it("renders children normally when no error occurs", () => {
    const html = renderToStaticMarkup(
      <ErrorBoundary>
        <ProblematicChild shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(html).toContain("正常運作的元件內容");
    expect(html).not.toContain("此區塊載入失敗");
  });

  it("getDerivedStateFromError updates state to hasError: true", () => {
    const testError = new Error("Custom crash message");
    const derived = ErrorBoundary.getDerivedStateFromError(testError);

    expect(derived).toEqual({
      hasError: true,
      error: testError,
    });
  });

  it("renders DefaultErrorFallback with accessible attributes when state has error", () => {
    const boundary = new ErrorBoundary({
      children: <div>Child</div>,
    });

    const testError = new Error("WebGL context lost");
    boundary.state = {
      hasError: true,
      error: testError,
    };

    const rendered = boundary.render();
    const html = renderToStaticMarkup(rendered as React.ReactElement);

    // Verify accessibility attributes (WCAG 2.1 AA)
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain("此區塊載入失敗");
    expect(html).toContain("這個元件遇到問題無法正常顯示，請嘗試重新載入。");
    expect(html).toContain("重新嘗試");
    expect(html).toContain('aria-label="重新嘗試載入此區塊"');
  });

  it("supports custom fallbackTitle and fallbackDescription", () => {
    const boundary = new ErrorBoundary({
      children: <div>Child</div>,
      fallbackTitle: "地圖圖層載入失敗",
      fallbackDescription: "無法載入即時通阻資訊，請重新整理。",
    });

    boundary.state = {
      hasError: true,
      error: new Error("Failed to fetch tiles"),
    };

    const html = renderToStaticMarkup(boundary.render() as React.ReactElement);

    expect(html).toContain("地圖圖層載入失敗");
    expect(html).toContain("無法載入即時通阻資訊，請重新整理。");
  });

  it("renders a custom ReactNode fallback when provided", () => {
    const customFallbackNode = (
      <div role="alert" className="custom-fallback">
        自訂錯誤提示區塊
      </div>
    );

    const boundary = new ErrorBoundary({
      children: <div>Child</div>,
      fallback: customFallbackNode,
    });

    boundary.state = {
      hasError: true,
      error: new Error("Custom error"),
    };

    const html = renderToStaticMarkup(boundary.render() as React.ReactElement);

    expect(html).toContain("自訂錯誤提示區塊");
    expect(html).toContain("custom-fallback");
  });

  it("renders a custom function fallback receiving error and reset callback", () => {
    const customFallbackFn = vi.fn(({ error, resetErrorBoundary }) => (
      <div role="alert">
        <p>自訂函式錯誤: {error.message}</p>
        <button type="button" onClick={resetErrorBoundary}>
          重設
        </button>
      </div>
    ));

    const boundary = new ErrorBoundary({
      children: <div>Child</div>,
      fallback: customFallbackFn,
    });

    const testError = new Error("Dynamic error");
    boundary.state = {
      hasError: true,
      error: testError,
    };

    const html = renderToStaticMarkup(boundary.render() as React.ReactElement);

    expect(customFallbackFn).toHaveBeenCalledTimes(1);
    expect(customFallbackFn).toHaveBeenCalledWith({
      error: testError,
      resetErrorBoundary: boundary.resetErrorBoundary,
    });
    expect(html).toContain("自訂函式錯誤: Dynamic error");
    expect(html).toContain("重設");
  });

  it("calls onReset callback and resets state when resetErrorBoundary is triggered", () => {
    const onResetMock = vi.fn();
    const boundary = new ErrorBoundary({
      children: <div>Child</div>,
      onReset: onResetMock,
    });

    boundary.state = {
      hasError: true,
      error: new Error("Temporary crash"),
    };

    const setStateSpy = vi.spyOn(boundary, "setState");

    boundary.resetErrorBoundary();

    expect(onResetMock).toHaveBeenCalledTimes(1);
    expect(setStateSpy).toHaveBeenCalledWith({
      hasError: false,
      error: null,
    });
  });

  it("calls onError callback in componentDidCatch", () => {
    const onErrorMock = vi.fn();
    const boundary = new ErrorBoundary({
      children: <div>Child</div>,
      onError: onErrorMock,
    });

    const testError = new Error("Voice stream error");
    const errorInfo: React.ErrorInfo = {
      componentStack: "\n    in ProblematicChild\n    in ErrorBoundary",
    };

    boundary.componentDidCatch(testError, errorInfo);

    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledWith(testError, errorInfo);
  });

  it("DefaultErrorFallback displays error details when showDetails is true", () => {
    const testError = new Error("Network timeout: 504 Gateway");
    testError.stack = "Error: Network timeout\n    at fetchData (api.ts:42)";

    const html = renderToStaticMarkup(
      <DefaultErrorFallback
        error={testError}
        resetErrorBoundary={vi.fn()}
        showDetails={true}
      />,
    );

    expect(html).toContain("詳細錯誤資訊");
    expect(html).toContain("Network timeout: 504 Gateway");
  });
});

describe("withErrorBoundary HOC", () => {
  it("wraps a component and sets displayName", () => {
    function TestWidget({ text }: { text: string }) {
      return <span>Widget: {text}</span>;
    }
    TestWidget.displayName = "TestWidget";

    const Wrapped = withErrorBoundary(TestWidget, {
      fallbackTitle: "Widget Error",
    });

    expect(Wrapped.displayName).toBe("withErrorBoundary(TestWidget)");

    const html = renderToStaticMarkup(<Wrapped text="Hello" />);
    expect(html).toContain("Widget: Hello");
  });
});
