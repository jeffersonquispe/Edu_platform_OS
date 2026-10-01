"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCoursePage() {
  const router = useRouter();
  // Uncontrolled inputs: anything typed before hydration stays in the DOM
  // (a controlled input would be reset to its initial "" state by React).
  const titleRef = useRef<HTMLInputElement>(null);
  const [hydrated, setHydrated] = useState(false);
  const [hasTitle, setHasTitle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setHasTitle(Boolean(titleRef.current?.value));
    setHydrated(true);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        cover_url: form.get("cover_url"),
      }),
    });
    const json = await res.json();
    setPending(false);

    if (!res.ok) {
      setError(json.error ?? "Could not create the course.");
      return;
    }

    router.push(`/dashboard/teaching/${json.course.slug}`);
  }

  return (
    <section style={{ maxWidth: 480 }}>
      <h1>New course</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          required
          ref={titleRef}
          onInput={(e) => setHasTitle(Boolean(e.currentTarget.value))}
        />

        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" />

        <label htmlFor="cover_url">Cover image URL</label>
        <input id="cover_url" name="cover_url" type="url" />

        {/* Disabled until hydrated so a pre-hydration click can't trigger a
            native GET submit that bypasses handleSubmit. */}
        <button
          className="btn"
          type="submit"
          disabled={!hydrated || pending || !hasTitle}
          data-testid="create-course-submit"
        >
          {pending ? "Creating…" : "Create course (draft)"}
        </button>
      </form>
    </section>
  );
}
