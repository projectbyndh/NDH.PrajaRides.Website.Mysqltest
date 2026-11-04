"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, MailOpen, Trash2 } from "lucide-react";
import { Modal } from "@/components/admin/form";
import { btn } from "@/components/admin/ui";
import { useHydrated } from "@/components/SubmitButton";
import { deleteMessageAction, setMessageReadAction } from "./actions";

export function MessageActions({ id, read }: { id: string; read: boolean }) {
  const hydrated = useHydrated();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex gap-1">
      <button
        disabled={!hydrated || pending}
        onClick={() => start(() => setMessageReadAction(id, !read))}
        title={read ? "Mark as unread" : "Mark as read"}
        aria-label={read ? "Mark as unread" : "Mark as read"}
        className="rounded-lg p-2 text-ink/45 hover:bg-ink/5 hover:text-ink disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
      </button>
      <button disabled={!hydrated} onClick={() => setConfirm(true)} title="Delete" aria-label="Delete message" className="rounded-lg p-2 text-ink/45 hover:bg-pin/10 hover:text-pin">
        <Trash2 className="h-4 w-4" />
      </button>
      <Modal open={confirm} onClose={() => setConfirm(false)} label="Delete message">
        <h2 className="text-lg font-bold">Delete this message?</h2>
        <p className="mt-1 text-sm text-ink/60">This can&apos;t be undone.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setConfirm(false)} className={btn.secondary}>
            Cancel
          </button>
          <button
            onClick={() => start(async () => { await deleteMessageAction(id); setConfirm(false); })}
            className="inline-flex items-center gap-2 rounded-xl bg-pin px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
