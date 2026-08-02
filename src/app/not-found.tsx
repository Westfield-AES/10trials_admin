import Link from "next/link";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center p-6"><section className="panel max-w-lg p-8 text-center"><p className="eyebrow">404</p><h1 className="mt-2 text-2xl font-black text-[#032e4d]">Admin view not found</h1><Link className="button-primary mt-6" href="/">Return to overview</Link></section></main>;
}
