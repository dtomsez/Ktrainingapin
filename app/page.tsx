import { prisma } from "@/lib/prisma";
import RequestForm from "./RequestForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const items = await prisma.optionItem.findMany({ orderBy: { id: "asc" } });
  const byCategory = (c: string) => items.filter((i) => i.category === c).map((i) => i.name);

  return (
    <RequestForm
      options={{
        businessLines: byCategory("BUSINESS_LINE"),
        districts: byCategory("DISTRICT"),
        networkGroups: byCategory("NETWORK_GROUP"),
        positions: byCategory("POSITION"),
      }}
    />
  );
}
