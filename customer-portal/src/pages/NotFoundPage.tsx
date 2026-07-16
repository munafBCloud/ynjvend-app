import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
      <p className="text-sm font-bold uppercase tracking-wider text-red-700">
        404
      </p>
      <h1 className="mt-4 text-4xl font-bold">Page not found</h1>
      <Link
        to="/"
        className="mt-8 inline-flex rounded-lg bg-red-700 px-5 py-3 font-semibold text-white"
      >
        Return Home
      </Link>
    </section>
  );
}
