import { Fragment, type ReactNode } from "react";
import { PageHero, Section } from "./ui";

export type LegalContent = { eyebrow: string; title: string; updated: string; intro: string; sections: { heading: string; body: string }[] };

/** "**bold**" → <b>bold</b>; everything else as plain text. */
function inline(text: string): ReactNode {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>));
}

/** Section text from admin: paragraphs split by blank lines; "- " lines become a bullet list. */
function Body({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) out.push(<p key={out.length}>{inline(para.join(" "))}</p>);
    if (list.length) out.push(<ul key={out.length}>{list.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>);
    para = [];
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) flush();
    else if (line.startsWith("- ")) {
      if (para.length) flush();
      list.push(line.slice(2));
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();
  return <>{out}</>;
}

export function LegalPage({ content: c }: { content: LegalContent }) {
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} intro={`Last updated ${c.updated}`} />
      <Section>
        <article className="mx-auto max-w-3xl space-y-5 leading-relaxed text-ink/75 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-navy [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {c.intro && <Body text={c.intro} />}
          {c.sections.map((s, i) => (
            <Fragment key={i}>
              {s.heading && <h2>{s.heading}</h2>}
              <Body text={s.body} />
            </Fragment>
          ))}
        </article>
      </Section>
    </>
  );
}
