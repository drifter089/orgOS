export default function Home() {
  return (
    <main className="bg-background relative flex h-screen w-full items-center justify-center overflow-hidden">
      {/* Gradient background with blur orbs */}
      <div className="absolute inset-0">
        {/* Animated blur orbs with different colors */}
        <div className="bg-primary/40 absolute top-0 left-0 h-[500px] w-[500px] rounded-full blur-[120px]" />
        <div className="bg-secondary/40 absolute top-1/3 right-0 h-[600px] w-[600px] rounded-full blur-[120px]" />
        <div className="bg-accent/30 absolute bottom-0 left-1/3 h-[550px] w-[550px] rounded-full blur-[120px]" />
        <div className="bg-destructive/20 absolute top-1/2 right-1/3 h-[450px] w-[450px] rounded-full blur-[120px]" />

        {/* Blur overlay to soften the background */}
        <div className="bg-background/40 absolute inset-0 backdrop-blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl px-6 text-center">
        <h1 className="from-foreground via-foreground/90 to-foreground/70 bg-gradient-to-br bg-clip-text text-[6rem] leading-[0.85] font-black tracking-tighter text-transparent sm:text-[10rem] md:text-[14rem] lg:text-[18rem]">
          ORG-OS
        </h1>
        <p className="text-foreground/80 mt-12 text-xl font-semibold sm:text-2xl md:text-3xl">
          Your organizational operating system
        </p>
      </div>
    </main>
  );
}
