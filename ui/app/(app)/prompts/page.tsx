import Link from "next/link";
import { fetchPrompts } from "@/lib/actions";
import { PromptsTable } from "@/components/prompts-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; q?: string }>;
}) {
  const { state = "all", q = "" } = await searchParams;
  const validState = ["pending", "answered", "expired", "all"].includes(state)
    ? (state as "pending" | "answered" | "expired" | "all")
    : "all";

  const prompts = await fetchPrompts(validState).catch(() => []);
  const filtered = q
    ? prompts.filter((p) => p.correlation_id?.includes(q) || p.id.includes(q))
    : prompts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Prompts</h1>
          <p className="text-sm text-neutral-500">History across all states</p>
        </div>
        <Button asChild>
          <Link href="/prompts/new">New prompt</Link>
        </Button>
      </div>

      <Tabs defaultValue={validState}>
        <TabsList>
          {(["pending", "answered", "expired", "all"] as const).map((s) => (
            <TabsTrigger key={s} value={s} asChild>
              <Link href={`/prompts?state=${s}${q ? `&q=${q}` : ""}`}>{s}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={validState}>
          <form className="mb-4">
            <input
              name="q"
              defaultValue={q}
              placeholder="Filter by correlation_id or id"
              className="h-9 w-full max-w-sm rounded-md border border-neutral-300 px-3 text-sm"
            />
          </form>
          <PromptsTable prompts={filtered} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
