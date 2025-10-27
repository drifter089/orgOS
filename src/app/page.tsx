import Link from "next/link";

import { LatestPost } from "@/app/_components/post";
import { api, HydrateClient } from "@/trpc/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });

  void api.post.getLatest.prefetch();

  return (
    <HydrateClient>
      <main className="bg-background flex min-h-screen flex-col items-center justify-center">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <div className="space-y-4 text-center">
            <h1 className="text-foreground text-5xl font-extrabold tracking-tight sm:text-[5rem]">
              Create <span className="text-primary">T3</span> App
            </h1>
            <Badge variant="secondary" className="text-base">
              Next.js • tRPC • Tailwind • Prisma
            </Badge>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <Link
              href="https://create.t3.gg/en/usage/first-steps"
              target="_blank"
              className="transition-transform hover:scale-105"
            >
              <Card className="h-full hover:border-primary">
                <CardHeader>
                  <CardTitle className="text-2xl">First Steps →</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Just the basics - Everything you need to know to set up your
                    database and authentication.
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>

            <Link
              href="https://create.t3.gg/en/introduction"
              target="_blank"
              className="transition-transform hover:scale-105"
            >
              <Card className="h-full hover:border-primary">
                <CardHeader>
                  <CardTitle className="text-2xl">Documentation →</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    Learn more about Create T3 App, the libraries it uses, and how
                    to deploy it.
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-foreground text-2xl">
              {hello ? hello.greeting : "Loading tRPC query..."}
            </p>
          </div>

          <LatestPost />
        </div>
      </main>
    </HydrateClient>
  );
}
