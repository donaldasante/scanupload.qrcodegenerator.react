"use client";

import dynamic from "next/dynamic";

const GeneralForm = dynamic(() => import("./GeneralForm"), { ssr: false });

export default function ClientPage() {
  return <GeneralForm />;
}