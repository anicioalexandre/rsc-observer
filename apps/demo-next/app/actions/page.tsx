import { revalidatePath } from "next/cache";

async function slowAction(formData: FormData): Promise<void> {
  "use server";
  const name = String(formData.get("name") ?? "world");
  // Simulate a slow action with a nested fetch (so we can see the cascade).
  await new Promise((r) => setTimeout(r, 250));
  await fetch("http://localhost:3000/api/delay?ms=200&step=action-inner", {
    cache: "no-store",
  });
  // eslint-disable-next-line no-console
  console.log(`[server-action] processed: ${name}`);
  revalidatePath("/actions");
}

export default function ActionsPage() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>Server Actions</h1>
      <p>Click the button below to invoke a slow {"`use server`"} function.</p>
      <form
        action={slowAction}
        style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}
      >
        <input
          name="name"
          defaultValue="hello"
          style={{
            padding: "0.4rem 0.6rem",
            border: "1px solid #ccc",
            borderRadius: 4,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "0.4rem 0.8rem",
            background: "#0b57d0",
            color: "#fff",
            border: 0,
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Run action
        </button>
      </form>
    </main>
  );
}
