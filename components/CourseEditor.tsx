"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { ModuleEditor } from "@/components/ModuleEditor";
import type { CourseStatus } from "@/lib/database.types";

export interface EditableLesson {
  id: string;
  title: string;
  position: number;
  body_md: string;
  youtube_url: string;
}

export interface EditableModule {
  id: string;
  title: string;
  position: number;
  lessons: EditableLesson[];
}

interface Course {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  status: CourseStatus;
}

export function CourseEditor({
  course,
  initialModules,
}: {
  course: Course;
  initialModules: EditableModule[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [coverUrl, setCoverUrl] = useState(course.cover_url ?? "");
  const [status, setStatus] = useState<CourseStatus>(course.status);
  const [modules, setModules] = useState<EditableModule[]>(initialModules);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // The status change and the server refresh commit together, so the new
  // status is only shown once no refresh is left in flight (an aborted RSC
  // refresh makes Next fall back to a hard reload of this page, hijacking
  // whatever navigation the user started next).
  const [refreshing, startRefresh] = useTransition();

  async function saveCourseFields(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("courses")
      .update({
        title,
        description: description || null,
        cover_url: coverUrl || null,
      })
      .eq("id", course.id);
    setPending(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  async function togglePublish() {
    setError(null);
    setPublishing(true);
    const next = status === "published" ? "draft" : "published";
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("courses")
      .update({ status: next })
      .eq("id", course.id);
    setPublishing(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    startRefresh(() => {
      setStatus(next);
      router.refresh();
    });
  }

  async function deleteCourse() {
    if (
      !confirm(
        "Delete this course? Modules, lessons, enrollments, and reviews will all be removed. This cannot be undone.",
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("courses")
      .delete()
      .eq("id", course.id);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.push("/dashboard/teaching");
    router.refresh();
  }

  async function moveModule(id: string, direction: -1 | 1) {
    const index = modules.findIndex((m) => m.id === id);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= modules.length) {
      return;
    }
    const a = modules[index];
    const b = modules[targetIndex];

    const supabase = createClient();
    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabase.from("modules").update({ position: b.position }).eq("id", a.id),
      supabase.from("modules").update({ position: a.position }).eq("id", b.id),
    ]);
    if (err1 || err2) {
      setError((err1 ?? err2)?.message ?? "Could not reorder modules.");
      return;
    }

    const reordered = modules.slice();
    reordered[index] = { ...b, position: a.position };
    reordered[targetIndex] = { ...a, position: b.position };
    reordered.sort((x, y) => x.position - y.position);
    setModules(reordered);
  }

  async function addModule() {
    const supabase = createClient();
    const nextPosition = modules.length;
    const { data, error: insertError } = await supabase
      .from("modules")
      .insert({
        course_id: course.id,
        title: "New module",
        position: nextPosition,
      })
      .select("id, title, position")
      .single();
    if (insertError || !data) {
      setError(insertError?.message ?? "Could not add module.");
      return;
    }
    setModules((prev) => [...prev, { ...data, lessons: [] }]);
  }

  return (
    <section>
      <p>
        <Link href="/dashboard/teaching">← Back to your courses</Link>
      </p>
      <h1>Edit course</h1>
      {error && <div className="error">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={saveCourseFields}>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label htmlFor="cover_url">Cover image URL</label>
          <input
            id="cover_url"
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
          />
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save details"}
          </button>
        </form>
      </div>

      <div
        className="card"
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <strong data-testid="course-status">
            Status: {status === "published" ? "Published" : "Draft"}
          </strong>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {status === "published"
              ? "Visible in the public catalog."
              : "Only visible to you until published."}
          </p>
        </div>
        <button
          className="btn"
          onClick={togglePublish}
          disabled={publishing || refreshing}
          data-testid="toggle-publish"
        >
          {status === "published" ? "Unpublish" : "Publish"}
        </button>
      </div>

      <h2>Modules & lessons</h2>
      {modules.map((m, i) => (
        <ModuleEditor
          key={m.id}
          courseId={course.id}
          module={m}
          canMoveUp={i > 0}
          canMoveDown={i < modules.length - 1}
          onMove={(direction) => moveModule(m.id, direction)}
          onModuleChange={(updated) =>
            setModules((prev) =>
              prev.map((x) => (x.id === updated.id ? updated : x)),
            )
          }
          onModuleDeleted={(id) =>
            setModules((prev) => prev.filter((x) => x.id !== id))
          }
        />
      ))}
      <button className="btn secondary" onClick={addModule}>
        + Add module
      </button>

      <div style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <button
          className="btn"
          style={{ background: "#b91c1c", borderColor: "#b91c1c" }}
          onClick={deleteCourse}
          disabled={deleting}
        >
          {deleting ? "Deleting…" : "Delete course"}
        </button>
      </div>
    </section>
  );
}
