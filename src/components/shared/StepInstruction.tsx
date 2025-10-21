import DOMPurify from "dompurify";
import parse, { type DOMNode, domToReact, Element } from "html-react-parser";

function SafeInstruction({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
 
  const clean = DOMPurify.sanitize(html);

  return (
    <div className={className}>
      {parse(clean, {
        replace: (node) => {
          if (node instanceof Element && node.name === "b") {
            return (
              <strong className="text-base lg:text-lg">
                {domToReact(node.children as DOMNode[])}
              </strong>
            );
          }
        },
      })}
    </div>
  );
}
export default SafeInstruction;
