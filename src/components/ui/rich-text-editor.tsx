"use client";

import { useEffect } from "react";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        autolink: true,
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "Start typing...",
      }),
    ],
    content: value,
    immediatelyRender: false, // Prevent SSR hydration mismatch
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[80px]",
      },
    },
  });

  // Sync external value changes with editor
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  return (
    <div
      className={cn(
        "bg-background ring-offset-background focus-within:ring-ring rounded-md border px-3 py-2 focus-within:ring-2 focus-within:ring-offset-2",
        className,
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
