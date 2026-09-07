type Props = { message: string | null };

export default function Toast({ message }: Props) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}
