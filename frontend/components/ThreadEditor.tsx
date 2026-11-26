"use client";

import { useRef, useState } from "react";

export interface ThreadItem {
  id: number;
  author_name?: string;
  title: string;
  content: string;
  content_html: string;
  topic_tag: string;
  hashtags: string;
  media_url: string | null;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
}

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}hrs ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

export default function ThreadEditor({
  initialThreads,
  authorName,
}: {
  initialThreads: ThreadItem[];
  authorName: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [topicTag, setTopicTag] = useState("iQOO 16");
  const [hashtags, setHashtags] = useState("#iQOO16 #BuiltForBuilders");
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [threads, setThreads] = useState<ThreadItem[]>(initialThreads);
  const [likedIds, setLikedIds] = useState<Record<number, boolean>>({});
  const [sharedId, setSharedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setHasContent((editorRef.current?.innerText ?? "").trim().length > 0);
  };

  const handleInsertLink = () => {
    const url = window.prompt("Enter link URL (https://...)");
    if (url) exec("createLink", url);
  };

  const handleInsertImage = () => {
    const url = window.prompt("Enter image URL (https://...)");
    if (url) exec("insertImage", url);
  };

  const handleInsertEmoji = () => {
    const emoji = window.prompt("Enter emoji (e.g. 🔥, 📱, 🚀)", "🔥");
    if (emoji) exec("insertText", emoji);
  };

  const handleClearFormatting = () => {
    exec("removeFormat");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Image upload failed.");
        return;
      }

      setMediaUrl(data.url);
    } catch {
      setError("Network error while uploading image to AWS S3.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const plainText = (editorRef.current?.innerText ?? "").trim();
    const html = (editorRef.current?.innerHTML ?? "").trim();

    if (!title.trim()) {
      setError("Please enter an Article Title.");
      return;
    }
    if (!plainText) {
      setError("Please enter Article Content.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: plainText,
          contentHtml: html,
          topicTag: topicTag.trim() || "iQOO Connect",
          hashtags: hashtags.trim(),
          mediaUrl: mediaUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to publish post.");
        return;
      }

      setThreads((prev) => [data.thread, ...prev]);
      setTitle("");
      setMediaUrl("");
      setTopicTag("iQOO 16");
      setHashtags("#iQOO16 #BuiltForBuilders");
      if (editorRef.current) editorRef.current.innerHTML = "";
      setHasContent(false);
      setIsOpen(false);
    } catch {
      setError("Network error while publishing post.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (id: number) => {
    const currentlyLiked = !!likedIds[id];
    const nextLiked = !currentlyLiked;
    setLikedIds((prev) => ({ ...prev, [id]: nextLiked }));
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, likes_count: Math.max(0, t.likes_count + (nextLiked ? 1 : -1)) }
          : t
      )
    );

    try {
      const res = await fetch(`/api/threads/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liked: nextLiked }),
      });
      if (res.ok) {
        const data = await res.json();
        setThreads((prev) =>
          prev.map((t) => (t.id === id ? { ...t, likes_count: data.likes_count } : t))
        );
      }
    } catch {
      // ignore transient network error
    }
  };

  const handleShare = async (thread: ThreadItem) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === thread.id ? { ...t, shares_count: t.shares_count + 1 } : t
      )
    );
    setSharedId(thread.id);
    setTimeout(() => setSharedId((cur) => (cur === thread.id ? null : cur)), 2000);

    try {
      if (navigator.share) {
        await navigator.share({
          title: thread.title,
          text: `${thread.title}\n${thread.hashtags}`.trim(),
          url: window.location.href,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          `${thread.title} ${thread.hashtags} - ${window.location.href}`.trim()
        );
      }
    } catch {
      // User cancelled native share or clipboard unavailable
    }

    try {
      const res = await fetch(`/api/threads/${thread.id}/share`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id ? { ...t, shares_count: data.shares_count } : t
          )
        );
      }
    } catch {
      // ignore transient network error
    }
  };

  const handleRecordView = async (id: number) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, views_count: t.views_count + 1 } : t))
    );
    try {
      const res = await fetch(`/api/threads/${id}/view`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setThreads((prev) =>
          prev.map((t) => (t.id === id ? { ...t, views_count: data.views_count } : t))
        );
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/threads/${id}`, { method: "DELETE" });
      if (res.ok) {
        setThreads((prev) => prev.filter((t) => t.id !== id));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete post.");
      }
    } catch {
      setError("Network error while deleting post.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 mt-8">
      {/* Section Header with Plus (+) Trigger */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Your Posts ({threads.length})
          </h2>
          <button
            type="button"
            onClick={() => {
              setError("");
              setIsOpen(true);
            }}
            aria-label="Create new post"
            title="Create new post"
            className="w-10 h-10 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 flex items-center justify-center shadow-lg shadow-amber-400/20 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        {threads.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400 text-sm">
            No posts yet. Press the{" "}
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-zinc-950 font-bold text-xs mx-0.5">+</span>{" "}
            button to publish your first social post!
          </div>
        ) : (
          <div className="space-y-5">
            {threads.map((thread) => {
              const displayAuthor = thread.author_name || authorName;
              const isLiked = !!likedIds[thread.id];

              return (
                <article
                  key={thread.id}
                  className="bg-white text-zinc-900 rounded-2xl border border-zinc-200 p-6 shadow-md"
                >
                  {/* Top Author & Topic Row */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-9 h-9 rounded-full bg-zinc-950 text-amber-400 flex items-center justify-center text-xs font-extrabold tracking-tight shrink-0">
                        {displayAuthor[0]?.toUpperCase() ?? "U"}
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 text-zinc-950 text-[9px] font-bold flex items-center justify-center border border-white">
                          ✓
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-zinc-900">
                          {displayAuthor}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
                          Member
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {thread.topic_tag && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-200">
                          <span className="w-2 h-2 rounded-full bg-zinc-400" />
                          {thread.topic_tag}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(thread.id)}
                        disabled={deletingId === thread.id}
                        title="Delete post"
                        className="px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                      >
                        {deletingId === thread.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  {/* Post Title */}
                  <h3
                    onClick={() => handleRecordView(thread.id)}
                    className="text-lg font-bold text-zinc-900 mb-1.5 cursor-pointer hover:text-zinc-700 transition"
                  >
                    {thread.title}
                  </h3>

                  {/* Post Content */}
                  <div
                    className="text-zinc-600 text-[15px] leading-relaxed mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-zinc-900 [&_h2]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-600 [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: thread.content_html }}
                  />

                  {/* Hashtags */}
                  {thread.hashtags && (
                    <div className="flex flex-wrap gap-1.5 mb-4 text-[14px] text-zinc-500">
                      {thread.hashtags.split(/\s+/).filter(Boolean).map((tag, idx) => (
                        <span key={`${thread.id}-tag-${idx}`} className="hover:text-zinc-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Optional Media Card (Image or Video) */}
                  {thread.media_url && (
                    <div
                      onClick={() => handleRecordView(thread.id)}
                      className="mb-4 max-w-lg rounded-xl overflow-hidden bg-zinc-950 border border-zinc-200 cursor-pointer"
                    >
                      {isVideoUrl(thread.media_url) ? (
                        <video
                          src={thread.media_url}
                          controls
                          className="w-full max-h-80 object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thread.media_url}
                          alt={thread.title}
                          className="w-full max-h-80 object-cover"
                        />
                      )}
                    </div>
                  )}

                  {/* Footer Engagement Bar: Views, Comments, Like, Share */}
                  <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                    <div className="flex items-center gap-5">
                      <button
                        type="button"
                        onClick={() => handleRecordView(thread.id)}
                        title="Views"
                        className="inline-flex items-center gap-1.5 hover:text-zinc-800 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {thread.views_count}
                      </button>

                      <span className="inline-flex items-center gap-1.5" title="Comments">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
                            d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {thread.comments_count}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleLike(thread.id)}
                        title="Like"
                        className={`inline-flex items-center gap-1.5 transition ${
                          isLiked ? "text-amber-600 font-semibold" : "hover:text-zinc-800"
                        }`}
                      >
                        <svg className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
                            d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                        </svg>
                        {thread.likes_count}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShare(thread)}
                        title="Share post"
                        className="inline-flex items-center gap-1.5 hover:text-zinc-800 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        {sharedId === thread.id ? "Copied!" : thread.shares_count}
                      </button>
                    </div>

                    <span>{formatRelativeTime(thread.created_at)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Pop-out Modal Editor */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setIsOpen(false)}
        >
          <form
            onSubmit={handlePublish}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white text-zinc-900 rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden"
          >
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-1 px-4 py-2.5 border-b border-zinc-200 bg-zinc-50 text-zinc-700">
              <div className="flex flex-wrap items-center gap-1">
                <ToolbarBtn label="Bold" onClick={() => exec("bold")}>
                  <span className="font-bold text-sm">B</span>
                </ToolbarBtn>
                <ToolbarBtn label="Heading" onClick={() => exec("formatBlock", "H2")}>
                  <span className="font-semibold text-sm">H</span>
                </ToolbarBtn>
                <ToolbarBtn label="Underline" onClick={() => exec("underline")}>
                  <span className="underline text-sm">U</span>
                </ToolbarBtn>

                <Divider />

                <ToolbarBtn label="Quote" onClick={() => exec("formatBlock", "BLOCKQUOTE")}>
                  <span className="font-serif font-bold text-base leading-none">&ldquo;</span>
                </ToolbarBtn>
                <ToolbarBtn label="Insert Link" onClick={handleInsertLink}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </ToolbarBtn>
                <ToolbarBtn label="Numbered List" onClick={() => exec("insertOrderedList")}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                </ToolbarBtn>
                <ToolbarBtn label="Bullet List" onClick={() => exec("insertUnorderedList")}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </ToolbarBtn>

                <Divider />

                <ToolbarBtn label="Align Left" onClick={() => exec("justifyLeft")}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
                  </svg>
                </ToolbarBtn>
                <ToolbarBtn label="Align Center" onClick={() => exec("justifyCenter")}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />
                  </svg>
                </ToolbarBtn>
                <ToolbarBtn label="Align Right" onClick={() => exec("justifyRight")}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />
                  </svg>
                </ToolbarBtn>

                <Divider />

                <ToolbarBtn label="Insert Emoji" onClick={handleInsertEmoji}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </ToolbarBtn>
                <ToolbarBtn label="Insert Image" onClick={handleInsertImage}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </ToolbarBtn>

                <Divider />

                <ToolbarBtn label="Clear Formatting" onClick={handleClearFormatting}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 11l-8-8-8.5 8.5a5.5 5.5 0 007.778 7.778L19 11zm-8 8h10" />
                  </svg>
                </ToolbarBtn>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close editor"
                className="w-8 h-8 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 transition"
              >
                ✕
              </button>
            </div>

            {/* Editor Body */}
            <div className="p-6 space-y-5">
              {error && (
                <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="thread-title" className="block text-sm font-medium text-zinc-800 mb-1.5">
                  Article Title
                </label>
                <input
                  id="thread-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setError("");
                  }}
                  placeholder="Your post title"
                  maxLength={255}
                  autoFocus
                  className="w-full pb-2 text-lg text-zinc-900 placeholder-zinc-400 border-b border-zinc-300 focus:border-amber-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-800 mb-1.5">
                  Article Content
                </label>
                <div className="relative min-h-[170px] max-h-[35vh] overflow-y-auto">
                  {!hasContent && (
                    <div className="pointer-events-none absolute top-0 left-0 text-zinc-400 text-base select-none">
                      English language only
                    </div>
                  )}
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => {
                      setHasContent((editorRef.current?.innerText ?? "").trim().length > 0);
                      setError("");
                    }}
                    className="min-h-[170px] w-full text-zinc-900 text-base leading-relaxed focus:outline-none [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-blue-600 [&_a]:underline"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-100">
                <div>
                  <label htmlFor="thread-tag" className="block text-xs font-medium text-zinc-600 mb-1">
                    Topic Tag
                  </label>
                  <input
                    id="thread-tag"
                    type="text"
                    value={topicTag}
                    onChange={(e) => setTopicTag(e.target.value)}
                    placeholder="iQOO 16"
                    maxLength={60}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-50 border border-zinc-200 text-zinc-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="thread-hashtags" className="block text-xs font-medium text-zinc-600 mb-1">
                    Hashtags
                  </label>
                  <input
                    id="thread-hashtags"
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="#iQOO16 #BuiltForBuilders"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-50 border border-zinc-200 text-zinc-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="thread-media" className="block text-xs font-medium text-zinc-600 mb-1">
                    Media URL / AWS S3 Upload
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="thread-media"
                      type="url"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://... or upload"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-zinc-50 border border-zinc-200 text-zinc-900 focus:border-amber-500 focus:outline-none"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      title="Upload image to AWS S3"
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shrink-0 disabled:opacity-50 transition"
                    >
                      {uploadingImage ? "..." : "Upload"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-zinc-600 hover:bg-zinc-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm text-zinc-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-60 transition shadow-sm"
                >
                  {submitting ? "Publishing..." : "Publish"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-zinc-200 active:bg-zinc-300 transition"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="h-5 w-px bg-zinc-300 mx-1.5" />;
}
