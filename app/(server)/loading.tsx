export default function ServerLoading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-7 w-56 rounded bg-surface-card" />
      <div className="h-4 w-80 rounded bg-surface-card/70" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 w-full">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-28 rounded-lg bg-surface-card" />
        ))}
      </div>
    </div>
  );
}
