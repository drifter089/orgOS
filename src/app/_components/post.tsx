"use client";

import { useState } from "react";

import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LatestPost() {
  const [latestPost] = api.post.getLatest.useSuspenseQuery();

  const utils = api.useUtils();
  const [name, setName] = useState("");
  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
      setName("");
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Latest Post</CardTitle>
        <CardDescription>
          {latestPost ? (
            <span className="truncate">Your most recent post: {latestPost.name}</span>
          ) : (
            <span>You have no posts yet.</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createPost.mutate({ name });
          }}
          className="flex flex-col gap-4"
        >
          <Input
            type="text"
            placeholder="Enter post title..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            type="submit"
            disabled={createPost.isPending}
            className="w-full"
          >
            {createPost.isPending ? "Submitting..." : "Create Post"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
