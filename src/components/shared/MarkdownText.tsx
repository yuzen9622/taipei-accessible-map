import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
export default function MarkdownText({ children }: { children: string }) {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeSanitize]}
      components={{
        // 自定義元素樣式
        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
        a: ({ node, ...props }) => (
          <a
            className="text-primary underline hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),
        ul: ({ node, ...props }) => (
          <ul className="list-disc ml-4 mb-2" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal ml-4 mb-2" {...props} />
        ),
        li: ({ node, ...props }) => <li className="mb-1" {...props} />,
        h1: ({ node, ...props }) => (
          <h1 className="text-base font-bold my-2" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="text-base font-semibold my-1.5" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="text-sm font-medium my-1" {...props} />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
