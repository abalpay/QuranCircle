import type { Metadata } from "next";
import MyCirclesContent from "@/components/my-circles-content";

export const metadata: Metadata = {
  title: "My Circles",
  description:
    "View circles you created or contributed to, including archived history.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function MyCirclesPage() {
  return (
    <main className="page-shell grow">
      <MyCirclesContent />
    </main>
  );
}
