export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-black font-sans text-white antialiased">
      <div className="flex items-center gap-5">
        <h1 className="inline-block border-r border-white/30 pr-5 text-2xl font-medium leading-[49px] tracking-tight">
          404
        </h1>
        <div className="inline-block text-left">
          <h2 className="text-sm font-normal leading-[49px]">
            This page could not be found.
          </h2>
        </div>
      </div>
    </div>
  );
}
