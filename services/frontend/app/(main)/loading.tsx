export default function Loading() {
  return (
    <div className="w-full h-[calc(100vh-8rem)] flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
      
      <div className="h-96 w-full bg-muted animate-pulse rounded-xl" />
    </div>
  );
}
