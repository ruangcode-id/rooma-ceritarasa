import type { Metadata } from "next";
import ComponentPlayground from "./ComponentPlayground";

export const metadata: Metadata = {
  title: "Test Components | Rooma Ceritarasa",
  description: "Halaman internal untuk mencoba komponen Rooma Ceritarasa.",
};

export default function TestPage() {
  return <ComponentPlayground />;
}
