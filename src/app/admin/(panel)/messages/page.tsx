import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Building2, Inbox, Mail, Phone, Tag } from "lucide-react";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { listContactMessages } from "@/lib/contact";
import { requireAdmin } from "@/lib/session";
import { CONTACT_TOPICS } from "@/lib/validation";
import { MessageActions } from "./MessageActions";

export const metadata = { title: "Messages · Admin" };

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kathmandu" });

export default function MessagesPage(props: PageProps<"/admin/messages">) {
  return (
    <Suspense fallback={<div className="h-[480px] animate-pulse rounded-2xl bg-ink/[0.06]" />}>
      <Messages {...props} />
    </Suspense>
  );
}

async function Messages({ searchParams }: PageProps<"/admin/messages">) {
  await connection();
  await requireAdmin();
  const { topic } = await searchParams;
  const all = await listContactMessages();
  const active = typeof topic === "string" && CONTACT_TOPICS.some((t) => t.value === topic) ? topic : null;
  const messages = active ? all.filter((m) => m.topic === active) : all;
  const unread = all.filter((m) => !m.read).length;
  const counts = new Map<string, number>();
  for (const m of all) if (!m.read) counts.set(m.topic, (counts.get(m.topic) ?? 0) + 1);

  return (
    <>
      <PageHeader title="Messages" description={`From the website forms (contact, business, careers, safety) · ${unread} unread`} />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {[{ value: null, label: "All" }, ...CONTACT_TOPICS].map((t) => {
          const on = active === t.value;
          const n = t.value ? counts.get(t.value) : unread;
          return (
            <Link
              key={t.label}
              href={t.value ? `/admin/messages?topic=${t.value}` : "/admin/messages"}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${on ? "bg-ink text-white" : "bg-white text-ink/65 ring-1 ring-ink/10 hover:text-ink"}`}
            >
              {t.label}
              {!!n && <span className={`rounded-full px-1.5 text-[11px] ${on ? "bg-white/20" : "bg-brand-light text-ink"}`}>{n}</span>}
            </Link>
          );
        })}
      </div>
      {messages.length === 0 ? (
        <Card>
          <EmptyState icon={Inbox} title={active ? "Nothing in this topic" : "No messages yet"}>
            Messages sent from the website forms appear here.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m.id} className={m.read ? "" : "ring-2 ring-brand/60"}>
              <div className="flex items-start gap-3">
                <Avatar name={m.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`truncate ${m.read ? "font-semibold" : "font-extrabold"}`}>{m.name}</h3>
                    {!m.read && <Badge tone="brand">New</Badge>}
                    <Badge>{CONTACT_TOPICS.find((t) => t.value === m.topic)?.label ?? m.topic}</Badge>
                  </div>
                  <p className="text-xs text-ink/50">{when.format(new Date(m.createdAt))}</p>
                </div>
                <MessageActions id={m.id} read={m.read} />
              </div>
              {(m.organization || m.subject) && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {m.organization && (
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <Building2 className="h-4 w-4 text-ink/40" /> {m.organization}
                    </span>
                  )}
                  {m.subject && (
                    <span className="inline-flex items-center gap-1.5 text-ink/70">
                      <Tag className="h-4 w-4 text-ink/40" /> {m.subject}
                    </span>
                  )}
                </div>
              )}
              <p className="mt-3 whitespace-pre-line text-sm text-ink/80">{m.message}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
                {m.phone && (
                  <>
                    <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Phone className="h-4 w-4 text-ink/40" /> {m.phone}
                    </a>
                    <a href={`https://wa.me/977${m.phone}`} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                      Reply on WhatsApp
                    </a>
                  </>
                )}
                {m.email && (
                  <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 hover:underline">
                    <Mail className="h-4 w-4 text-ink/40" /> {m.email}
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
