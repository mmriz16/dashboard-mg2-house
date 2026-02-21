"use client";

import { useMemo, useState } from "react";
import { Editor, EditorContent, Extension, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

type TextEditorProps = {
  onSubmit: (content: string) => void;
};

type SlashCommand = {
  command: string;
  description: string;
};

const SLASH_COMMANDS: SlashCommand[] = [
  { command: "/help", description: "Bantuan command" },
  { command: "/commands", description: "Daftar command" },
  { command: "/status", description: "Status session saat ini" },
  { command: "/usage", description: "Atur / lihat usage" },
  { command: "/model", description: "Lihat / ubah model" },
  { command: "/skill", description: "Jalankan skill" },
  { command: "/whoami", description: "Lihat sender id" },
  { command: "/id", description: "Alias /whoami" },
  { command: "/allowlist", description: "Kelola allowlist" },
  { command: "/approve", description: "Approve/deny prompt exec" },
  { command: "/context", description: "Lihat detail context" },
  { command: "/export-session", description: "Export session HTML" },
  { command: "/export", description: "Alias /export-session" },
  { command: "/subagents", description: "Kontrol sub-agent" },
  { command: "/kill", description: "Stop sub-agent" },
  { command: "/steer", description: "Arahkan sub-agent" },
  { command: "/tell", description: "Alias /steer" },
  { command: "/config", description: "Baca/tulis config" },
  { command: "/debug", description: "Runtime override debug" },
  { command: "/tts", description: "Kontrol text-to-speech" },
  { command: "/stop", description: "Hentikan run aktif" },
  { command: "/restart", description: "Restart gateway" },
  { command: "/dock-telegram", description: "Route balasan ke Telegram" },
  { command: "/dock-discord", description: "Route balasan ke Discord" },
  { command: "/dock-slack", description: "Route balasan ke Slack" },
  { command: "/activation", description: "Mode aktivasi group" },
  { command: "/send", description: "Atur delivery send" },
  { command: "/reset", description: "Reset / new session" },
  { command: "/new", description: "Mulai session baru" },
  { command: "/think", description: "Atur level thinking" },
  { command: "/thinking", description: "Alias /think" },
  { command: "/t", description: "Alias singkat /think" },
  { command: "/verbose", description: "Toggle verbose mode" },
  { command: "/v", description: "Alias /verbose" },
  { command: "/reasoning", description: "Toggle reasoning mode" },
  { command: "/reason", description: "Alias /reasoning" },
  { command: "/elevated", description: "Atur permission exec" },
  { command: "/elev", description: "Alias /elevated" },
  { command: "/exec", description: "Set host/security/ask" },
  { command: "/queue", description: "Atur mode queue" },
  { command: "/bash", description: "Run host command (jika enabled)" },
  { command: "/compact", description: "Compact context session" },
];

export function TextEditor({ onSubmit }: TextEditorProps) {
  const [showAlert, setShowAlert] = useState(false);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);

  const filteredCommands = useMemo(() => {
    if (slashQuery === null) return [];
    const q = slashQuery.toLowerCase();
    return SLASH_COMMANDS.filter((item) => item.command.toLowerCase().startsWith(`/${q}`));
  }, [slashQuery]);

  const handleSend = (currentEditor: Editor | null) => {
    if (!currentEditor || currentEditor.getText().trim() === "") {
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    onSubmit(currentEditor.getHTML());
    currentEditor.commands.clearContent();
    setSlashQuery(null);
  };

  const applySlashCommand = (command: string) => {
    if (!editor) return;

    const plain = editor.getText().trim();
    if (/^\/[^\s]*$/.test(plain)) {
      editor.commands.setContent(command);
    } else {
      editor.chain().focus().insertContent(command).run();
    }

    setSlashQuery(null);
  };

  const KeyboardShortcuts = Extension.create({
    name: "keyboardShortcuts",
    addKeyboardShortcuts() {
      return {
        Enter: () => {
          if (slashQuery !== null && filteredCommands.length > 0) {
            applySlashCommand(filteredCommands[0].command);
            return true;
          }
          handleSend(this.editor);
          return true;
        },
        "Shift-Enter": () => {
          return this.editor.commands.setHardBreak();
        },
      };
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Type your message here...",
        emptyEditorClass: "is-editor-empty",
      }),
      KeyboardShortcuts,
    ],
    content: "",
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      const plain = currentEditor.getText();
      const lines = plain.split("\n");
      const lastLine = (lines[lines.length - 1] || "").trim();

      const match = lastLine.match(/^\/([a-zA-Z0-9_-]*)$/);
      setSlashQuery(match ? match[1] : null);
    },
    editorProps: {
      attributes: {
        class: "w-full focus:outline-none min-h-[68px] text-white text-sm font-ibm-plex-mono",
        spellcheck: "false",
      },
    },
  });

  return (
    <div className="bg-surface-card border border-border flex flex-col items-start overflow-visible p-1 relative rounded-[14px] w-full">
      <div className="bg-surface w-full p-4 rounded-[10px] min-h-25 flex items-start relative">
        <style jsx global>{`
          .is-editor-empty:first-child::before {
            color: rgba(255, 255, 255, 0.4);
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
          }
        `}</style>
        <EditorContent editor={editor} className="w-full" />

        {slashQuery !== null && filteredCommands.length > 0 && (
          <div className="absolute left-2 right-2 bottom-[calc(100%+8px)] z-30 rounded-xl border border-border bg-[#0B101A] p-2 shadow-2xl">
            <div className="mb-2 px-2 text-[11px] uppercase tracking-wide text-white/40">Command suggestions</div>
            <div className="max-h-52 overflow-y-auto">
              {filteredCommands.map((item) => (
                <button
                  key={item.command}
                  type="button"
                  onClick={() => applySlashCommand(item.command)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-white/5"
                >
                  <span className="text-sm text-white">{item.command}</span>
                  <span className="ml-3 text-xs text-white/50">{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 w-full">
        <div className="flex gap-1 items-center">
          <button className="bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center p-2.5 rounded-[10px] w-10 h-10 text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          <button className="bg-white/5 hover:bg-white/10 transition-colors flex gap-2.5 items-center justify-center px-3 py-2.5 rounded-[10px] text-white text-sm font-manrope">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="M4.93 4.93l2.83 2.83" />
              <path d="M16.24 16.24l2.83 2.83" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <path d="M4.93 19.07l2.83-2.83" />
              <path d="M16.24 7.76l2.83-2.83" />
            </svg>
            Normal
          </button>

          <button className="bg-white/5 hover:bg-white/10 transition-colors flex gap-2.5 items-center justify-center px-3 py-2.5 rounded-[10px] text-white text-sm font-manrope">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="M4.93 4.93l2.83 2.83" />
              <path d="M16.24 16.24l2.83 2.83" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <path d="M4.93 19.07l2.83-2.83" />
              <path d="M16.24 7.76l2.83-2.83" />
            </svg>
            Deep Think
          </button>
        </div>

        <button
          onClick={() => handleSend(editor)}
          className="bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center p-2.5 rounded-[10px] w-10 h-10 text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>

      <div
        className={`absolute left-0 right-0 -top-14 flex justify-center transition-all duration-300 ease-in-out pointer-events-none ${
          showAlert ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <div className="bg-[rgba(240,177,0,0.1)] border border-[rgba(240,177,0,0.1)] flex gap-2.5 items-center justify-center p-2.5 rounded-lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f0b100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p className="font-manrope font-normal text-[#f0b100] text-sm">Please input text first!</p>
        </div>
      </div>
    </div>
  );
}
