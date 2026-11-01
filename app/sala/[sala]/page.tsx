import { notFound } from "next/navigation";
import Sala from "@/components/Sala";
import { SALA_REGEX } from "@/lib/sala";

export default async function PaginaSala({ params }: { params: Promise<{ sala: string }> }) {
  const { sala } = await params;
  if (!SALA_REGEX.test(sala)) notFound();
  return <Sala sala={sala} />;
}
