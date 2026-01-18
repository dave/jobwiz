import React from "react";

interface ReactMarkdownProps {
  children: string;
}

function ReactMarkdown({ children }: ReactMarkdownProps) {
  // Simple mock that renders the text with basic markdown parsing
  const content = children
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  return <span dangerouslySetInnerHTML={{ __html: content }} />;
}

export default ReactMarkdown;
