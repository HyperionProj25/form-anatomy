import { Link2 } from "lucide-react";

type Props = { onCopied: (message: string) => void; label?: string };

/** Copies the current URL (which mirrors app state) so a teacher can link to this exact view. */
export default function CopyLink({ onCopied, label = "Copy link" }: Props) {
  return (
    <button
      className="text-button copy-link"
      onClick={async () => {
        const url = window.location.href;
        try {
          await navigator.clipboard.writeText(url);
          onCopied("Link copied. It opens this exact view.");
        } catch {
          onCopied(url);
        }
      }}
    >
      <Link2 size={15} /> {label}
    </button>
  );
}
