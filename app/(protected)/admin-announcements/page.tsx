"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminAnnouncementsPage } from "../../page";
import { supabase } from "@/lib/supabase";
import { subscribeToTableChanges } from "@/lib/realtime";
import { deleteImage } from "@/lib/uploadImage";
import { useProtectedUser } from "../layout";

export default function AdminAnnouncementsRoutePage() {
  const { authUserId } = useProtectedUser();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadPosts() {
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      setPosts(
        (data ?? []).map((row: any) => ({
          id: String(row.id),
          title: row.title,
          body: row.content,
          date: new Date(row.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          author: row.posted_by ? "Admin" : "TapIn",
          badge: row.target_role === "admin" ? "Admin" : "General",
          photoUrl: row.media_url ?? "",
        })),
      );
    } catch (caughtError) {
      console.error(caughtError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const refreshPosts = async () => {
      if (!cancelled) {
        await loadPosts();
      }
    };

    void refreshPosts();

    const announcementsChannel = subscribeToTableChanges(
      "announcements",
      () => {
        if (!cancelled) {
          void refreshPosts();
        }
      },
    );

    return () => {
      cancelled = true;
      void announcementsChannel.unsubscribe();
    };
  }, []);

  const handleCreate = async (payload: {
    title: string;
    body: string;
    badge: string;
    photoUrl: string | null;
  }) => {
    if (!authUserId) {
      return;
    }

    const { error } = await supabase.from("announcements").insert({
      title: payload.title,
      content: payload.body,
      media_url: payload.photoUrl,
      posted_by: authUserId,
      target_role: "student",
    });

    if (error) {
      console.error(error);
      return;
    }

    await loadPosts();
  };

  const handleUpdate = async (payload: {
    id: string;
    title: string;
    body: string;
    badge: string;
    photoUrl: string | null;
    previousPhotoUrl?: string;
  }) => {
    const { error } = await supabase
      .from("announcements")
      .update({
        title: payload.title,
        content: payload.body,
        media_url: payload.photoUrl,
      })
      .eq("id", payload.id);

    if (error) {
      console.error(error);
      return;
    }

    if (
      payload.previousPhotoUrl &&
      payload.previousPhotoUrl !== payload.photoUrl &&
      payload.previousPhotoUrl.startsWith("https://")
    ) {
      await deleteImage(payload.previousPhotoUrl);
    }

    await loadPosts();
  };

  const handleDelete = async (id: string, photoUrl?: string) => {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    if (photoUrl && photoUrl.startsWith("https://")) {
      await deleteImage(photoUrl);
    }

    await loadPosts();
  };

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        <Skeleton className="h-8 w-40 rounded-lg" />
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <AdminAnnouncementsPage
      posts={posts}
      setPosts={setPosts}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  );
}
