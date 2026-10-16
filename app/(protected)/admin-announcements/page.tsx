"use client";

import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { FeedbackState } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteImages } from "@/lib/uploadImage";
import { supabase } from "@/lib/supabase";
import { AdminAnnouncementsPage } from "../../shared-page";
import { useProtectedUser } from "../layout";

const PAGE_SIZE = 20;

export default function AdminAnnouncementsRoutePage() {
  const { authUserId } = useProtectedUser();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  async function loadPosts() {
    try {
      setLoadError(null);
      const { data, error, count } = await supabase
        .from("announcements")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (error) {
        console.error(error);
        setLoadError("Announcements could not be loaded.");
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
          author: row.posted_by ? "Admin" : "Adesse",
          badge: row.target_role === "admin" ? "Admin" : "General",
          photoUrl: row.media_url ?? "",
        })),
      );
      setTotalCount(count ?? 0);
    } catch (caughtError) {
      console.error(caughtError);
      setLoadError("Announcements could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const refreshPosts = async () => {
      if (!cancelled) await loadPosts();
    };

    void refreshPosts();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        void refreshPosts();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [page]);

  const handleCreate = async (payload: {
    title: string;
    body: string;
    badge: string;
    photoUrl: string | null;
  }): Promise<boolean> => {
    if (!authUserId) {
      toast.error("Your session is not ready. Please try again.");
      return false;
    }

    const { error } = await supabase.from("announcements").insert({
      title: payload.title,
      content: payload.body,
      media_url: payload.photoUrl,
      posted_by: authUserId,
      target_role: "student",
    });

    if (error) {
      if (payload.photoUrl) await deleteImages([payload.photoUrl]);
      console.error(error);
      toast.error("Announcement could not be published. Please try again.");
      return false;
    }

    await loadPosts();
    toast.success("Announcement published.");
    return true;
  };

  const handleUpdate = async (payload: {
    id: string;
    title: string;
    body: string;
    badge: string;
    photoUrl: string | null;
    previousPhotoUrl?: string;
  }): Promise<boolean> => {
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
      toast.error("Announcement could not be updated. Please try again.");
      return false;
    }

    let cleanupFailed = false;
    if (
      payload.previousPhotoUrl &&
      payload.previousPhotoUrl !== payload.photoUrl
    ) {
      const cleanup = await deleteImages([payload.previousPhotoUrl]);
      if (cleanup.some((result) => !result.success)) {
        cleanupFailed = true;
        toast.warning(
          "Announcement updated, but the old image could not be removed.",
        );
      }
    }

    await loadPosts();
    if (!cleanupFailed) toast.success("Announcement updated.");
    return true;
  };

  const handleDelete = async (
    id: string,
    photoUrl?: string,
  ): Promise<boolean> => {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      toast.error("Announcement could not be deleted. Please try again.");
      return false;
    }

    let cleanupFailed = false;
    if (photoUrl) {
      const cleanup = await deleteImages([photoUrl]);
      if (cleanup.some((result) => !result.success)) {
        cleanupFailed = true;
        toast.warning(
          "Announcement deleted, but its image could not be removed.",
        );
      }
    }

    await loadPosts();
    if (!cleanupFailed) toast.success("Announcement deleted.");
    return true;
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

  if (loadError) {
    return (
      <FeedbackState
        title="Announcements unavailable"
        message={loadError}
        onRetry={() => void loadPosts()}
      />
    );
  }

  return (
    <Suspense fallback={<Skeleton className="mt-2 h-8 w-40 rounded-lg" />}>
      <AdminAnnouncementsPage
        posts={posts}
        setPosts={setPosts}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={setPage}
      />
    </Suspense>
  );
}
