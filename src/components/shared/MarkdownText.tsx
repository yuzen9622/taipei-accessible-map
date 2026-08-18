import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

export default function MarkdownText({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
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
        table: ({ node, ...props }) => (
          <div className="my-2 w-full overflow-x-auto rounded-md border border-border">
            <table
              className="w-full text-xs border-collapse text-left"
              {...props}
            />
          </div>
        ),
        thead: ({ node, ...props }) => (
          <thead className="bg-muted/60 border-b border-border" {...props} />
        ),
        tbody: ({ node, ...props }) => (
          <tbody className="divide-y divide-border" {...props} />
        ),
        tr: ({ node, ...props }) => (
          <tr className="hover:bg-muted/30 transition-colors" {...props} />
        ),
        th: ({ node, ...props }) => (
          <th
            className="px-3 py-2 font-medium text-foreground text-left align-middle"
            {...props}
          />
        ),
        td: ({ node, ...props }) => (
          <td
            className="px-3 py-2 text-foreground/90 align-middle"
            {...props}
          />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
