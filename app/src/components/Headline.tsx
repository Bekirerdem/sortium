/** Headline split into masked words so the entrance can raise them one by one. */
export function Headline({ text, as: Tag = "h1" }: { text: string; as?: "h1" | "h2" }) {
  return (
    <Tag className="headline" aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span className="w" key={i} aria-hidden>
          <span data-word>{w}</span>
          {" "}
        </span>
      ))}
    </Tag>
  );
}
