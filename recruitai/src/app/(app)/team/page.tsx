import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { inviteRecruiter, updateCompanyProfile } from "./actions";

export default async function TeamPage() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "admin") redirect("/dashboard");

  const [members, company] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.company.findUnique({ where: { id: session.user.companyId } }),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Team</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Recruiters here share all jobs and candidates for your company.
        </p>
      </div>

      <form action={updateCompanyProfile} className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Company profile</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Shown to applicants on your careers page.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Industry</label>
            <input
              name="industry"
              defaultValue={company?.industry ?? ""}
              placeholder="e.g. Fintech, Healthcare, SaaS"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Website</label>
            <input
              name="website"
              defaultValue={company?.website ?? ""}
              placeholder="https://acme.com"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Company size</label>
            <select
              name="size"
              defaultValue={company?.size ?? ""}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            >
              <option value="">Prefer not to say</option>
              <option value="SIZE_1_10">1–10</option>
              <option value="SIZE_11_50">11–50</option>
              <option value="SIZE_51_200">51–200</option>
              <option value="SIZE_201_1000">201–1,000</option>
              <option value="SIZE_1000_PLUS">1,000+</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-1">About</label>
            <textarea
              name="about"
              rows={3}
              defaultValue={company?.about ?? ""}
              placeholder="A couple sentences applicants will see on your careers page."
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            Save company profile
          </button>
        </div>
      </form>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-500 uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 font-medium text-zinc-900">{m.name}</td>
                <td className="px-4 py-3 text-zinc-600">{m.email}</td>
                <td className="px-4 py-3 text-zinc-600 capitalize">{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={inviteRecruiter} className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">Add a recruiter</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
            <input
              name="name"
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Temporary password
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Role</label>
            <select
              name="role"
              defaultValue="recruiter"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
            >
              <option value="recruiter">Recruiter</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-indigo-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            Add to team
          </button>
        </div>
      </form>
    </div>
  );
}
