"use client";

import { useCallback, useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { CITIES } from "@/lib/cities";
import type { EducationInput, ExperienceInput } from "@/lib/applicantProfile";
import type { ProfileDraft, ProfileSaveResult } from "@/app/my/profile/actions";

const input =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400";
const CV_ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

export interface ProfileEditorDefaults {
  name: string;
  phone: string;
  headline: string;
  about: string;
  skills: string;
  languages: string;
  city: string;
  linkedinUrl: string;
  portfolioUrl: string;
  seniority: string;
  desiredTitle: string;
  yearsOfExperience: string;
  workAuthorization: string;
  remotePreference: string;
  noticePeriod: string;
  salaryExpectation: string;
  savedCoverNote: string;
  openToWork: boolean;
  hasSavedCv: boolean;
  experiences: ExperienceInput[];
  educations: EducationInput[];
}

const emptyExperience = (): ExperienceInput => ({ title: "", company: "", location: "", startDate: "", endDate: "", description: "" });
const emptyEducation = (): EducationInput => ({ school: "", qualification: "", field: "", startYear: "", endYear: "" });

function Section({ title, hint, required, children }: { title: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <section className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">
          {title} {required && <span className="text-red-500 text-sm" aria-label="required">*</span>}
        </h2>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Label({ children, optional }: { children: ReactNode; optional?: boolean }) {
  return (
    <label className="block text-sm font-medium text-zinc-700 mb-1">
      {children} {optional && <span className="text-zinc-400 font-normal">(optional)</span>}
    </label>
  );
}

export default function ProfileEditor({
  defaults,
  saveAction,
  draftFromCvAction,
}: {
  defaults: ProfileEditorDefaults;
  saveAction: (formData: FormData) => Promise<ProfileSaveResult>;
  draftFromCvAction: (formData: FormData) => Promise<{ draft: ProfileDraft } | { error: string }>;
}) {
  const router = useRouter();
  const [headline, setHeadline] = useState(defaults.headline);
  const [skills, setSkills] = useState(defaults.skills);
  const [languages, setLanguages] = useState(defaults.languages);
  const [experiences, setExperiences] = useState<ExperienceInput[]>(
    defaults.experiences.length ? defaults.experiences : [emptyExperience()]
  );
  const [educations, setEducations] = useState<EducationInput[]>(
    defaults.educations.length ? defaults.educations : [emptyEducation()]
  );
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [importing, startImport] = useTransition();

  const citiesByCountry = useMemo(() => {
    const groups = new Map<string, typeof CITIES>();
    for (const c of CITIES) groups.set(c.country, [...(groups.get(c.country) ?? []), c]);
    return [...groups.entries()];
  }, []);

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) {
      setCvFile(files[0]);
      setNotice(null);
    }
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: CV_ACCEPT,
    multiple: false,
    maxSize: 4 * 1024 * 1024,
    disabled: saving || importing,
  });

  function fillFromCv() {
    setError(null);
    setNotice(null);
    const fd = new FormData();
    if (cvFile) fd.set("cv", cvFile);
    startImport(async () => {
      const res = await draftFromCvAction(fd).catch(() => ({ error: "Couldn't read your CV right now." }));
      if ("error" in res) {
        setError(res.error);
        return;
      }
      const d = res.draft;
      const realExp = experiences.filter((e) => e.title || e.company);
      const realEdu = educations.filter((e) => e.school || e.qualification);
      setExperiences(realExp.length ? [...realExp, ...d.experiences] : d.experiences.length ? d.experiences : [emptyExperience()]);
      setEducations(realEdu.length ? [...realEdu, ...d.educations] : d.educations.length ? d.educations : [emptyEducation()]);
      if (!headline && d.headline) setHeadline(d.headline);
      if (!skills && d.skills) setSkills(d.skills);
      if (!languages && d.languages) setLanguages(d.languages);
      setNotice(
        `Added ${d.experiences.length} role${d.experiences.length === 1 ? "" : "s"} and ${d.educations.length} education entr${d.educations.length === 1 ? "y" : "ies"} from your CV. Check them, write your About section, then save.`
      );
    });
  }

  function updateExp(i: number, patch: Partial<ExperienceInput>) {
    setExperiences((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
  function updateEdu(i: number, patch: Partial<EducationInput>) {
    setEducations((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const fd = new FormData(e.currentTarget);
    fd.set("experiences", JSON.stringify(experiences));
    fd.set("educations", JSON.stringify(educations));
    if (cvFile) fd.set("cv", cvFile);
    startSave(async () => {
      const res = await saveAction(fd).catch(() => ({ error: "Something went wrong — please try again." }));
      if ("error" in res) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setCvFile(null);
      router.push("/my/profile");
      router.refresh();
    });
  }

  const busy = saving || importing;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
      {notice && <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">{notice}</div>}

      <Section title="Your CV" hint="Save a CV to apply in one click — and let us fill your experience and education from it.">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl px-6 py-6 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-blue-200 hover:border-blue-300"
          } ${busy ? "opacity-60 pointer-events-none" : ""}`}
        >
          <input {...getInputProps()} />
          <p className="text-sm font-medium text-zinc-700">
            {cvFile ? `Selected: ${cvFile.name}` : "Drag & drop a CV (PDF or Word), or click to select"}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {defaults.hasSavedCv ? "✓ You have a CV on file — choose a new one to replace it." : "Up to 4MB."}
          </p>
        </div>
        {(cvFile || defaults.hasSavedCv) && (
          <button
            type="button"
            onClick={fillFromCv}
            disabled={busy}
            className="text-sm font-medium rounded-md px-4 py-2 border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-60"
          >
            {importing ? "Reading your CV… (about 20 seconds)" : `✨ Fill my profile from ${cvFile ? "this" : "my saved"} CV`}
          </button>
        )}
      </Section>

      <Section title="Basics" required>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Full name *</Label>
            <input name="name" required defaultValue={defaults.name} disabled={busy} className={input} />
          </div>
          <div>
            <Label>Headline *</Label>
            <input
              name="headline"
              required
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              disabled={busy}
              placeholder="e.g. Frontend Developer · React & TypeScript"
              className={input}
            />
          </div>
          <div>
            <Label optional>Home city</Label>
            <select name="city" defaultValue={defaults.city} disabled={busy} className={`${input} bg-white`}>
              <option value="">Prefer not to say</option>
              {citiesByCountry.map(([country, cities]) => (
                <optgroup key={country} label={country}>
                  {cities.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-zinc-400 mt-1">Used to show jobs near you. Never your address.</p>
          </div>
          <div>
            <Label optional>Phone</Label>
            <input name="phone" type="tel" defaultValue={defaults.phone} disabled={busy} className={input} />
          </div>
          <div>
            <Label optional>LinkedIn</Label>
            <input name="linkedinUrl" defaultValue={defaults.linkedinUrl} disabled={busy} placeholder="https://linkedin.com/in/…" className={input} />
          </div>
          <div>
            <Label optional>Portfolio / website</Label>
            <input name="portfolioUrl" defaultValue={defaults.portfolioUrl} disabled={busy} placeholder="https://…" className={input} />
          </div>
        </div>
      </Section>

      <Section title="About" required hint="A few sentences about what you do, what you're good at and what you're looking for.">
        <textarea
          name="about"
          required
          minLength={50}
          rows={5}
          defaultValue={defaults.about}
          disabled={busy}
          placeholder="e.g. Frontend developer with 4 years building booking and payment flows in React…"
          className={input}
        />
      </Section>

      <Section title="Experience" required hint="Jobs, internships, freelance and volunteering. Add at least one experience or education entry.">
        <div className="space-y-4">
          {experiences.map((exp, i) => (
            <div key={i} className="border border-zinc-200 rounded-lg p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <input aria-label="Job title" placeholder="Job title" value={exp.title} onChange={(e) => updateExp(i, { title: e.target.value })} disabled={busy} className={input} />
                <input aria-label="Company" placeholder="Company" value={exp.company} onChange={(e) => updateExp(i, { company: e.target.value })} disabled={busy} className={input} />
                <input aria-label="Location" placeholder="Location (optional)" value={exp.location} onChange={(e) => updateExp(i, { location: e.target.value })} disabled={busy} className={input} />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-zinc-500">
                    Start
                    <input type="month" value={exp.startDate} onChange={(e) => updateExp(i, { startDate: e.target.value })} disabled={busy} className={input} />
                  </label>
                  <label className="text-xs text-zinc-500">
                    End
                    <input type="month" value={exp.endDate} onChange={(e) => updateExp(i, { endDate: e.target.value })} disabled={busy} className={input} />
                  </label>
                </div>
              </div>
              <p className="text-xs text-zinc-400 -mt-1">Leave the end month empty if you still work here.</p>
              <textarea
                aria-label="What you did"
                rows={3}
                placeholder="What you did and achieved — e.g. Built the checkout in React; cut load time by 40%"
                value={exp.description}
                onChange={(e) => updateExp(i, { description: e.target.value })}
                disabled={busy}
                className={input}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setExperiences((rows) => (rows.length > 1 ? rows.filter((_, j) => j !== i) : [emptyExperience()]))}
                  disabled={busy}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setExperiences((rows) => [...rows, emptyExperience()])} disabled={busy} className="text-sm font-medium text-blue-700 hover:underline">
            + Add experience
          </button>
        </div>
      </Section>

      <Section title="Education">
        <div className="space-y-4">
          {educations.map((ed, i) => (
            <div key={i} className="border border-zinc-200 rounded-lg p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <input aria-label="School" placeholder="School / university" value={ed.school} onChange={(e) => updateEdu(i, { school: e.target.value })} disabled={busy} className={input} />
                <input aria-label="Qualification" placeholder="Qualification (e.g. BSc, Diploma)" value={ed.qualification} onChange={(e) => updateEdu(i, { qualification: e.target.value })} disabled={busy} className={input} />
                <input aria-label="Field of study" placeholder="Field of study (optional)" value={ed.field} onChange={(e) => updateEdu(i, { field: e.target.value })} disabled={busy} className={input} />
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label="Start year" placeholder="Start year" inputMode="numeric" value={ed.startYear} onChange={(e) => updateEdu(i, { startYear: e.target.value })} disabled={busy} className={input} />
                  <input aria-label="End year" placeholder="End year" inputMode="numeric" value={ed.endYear} onChange={(e) => updateEdu(i, { endYear: e.target.value })} disabled={busy} className={input} />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setEducations((rows) => (rows.length > 1 ? rows.filter((_, j) => j !== i) : [emptyEducation()]))}
                  disabled={busy}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setEducations((rows) => [...rows, emptyEducation()])} disabled={busy} className="text-sm font-medium text-blue-700 hover:underline">
            + Add education
          </button>
        </div>
      </Section>

      <Section title="Skills & languages" required>
        <div>
          <Label>Skills * (comma-separated)</Label>
          <input name="skills" required value={skills} onChange={(e) => setSkills(e.target.value)} disabled={busy} placeholder="e.g. React, TypeScript, Figma" className={input} />
        </div>
        <div>
          <Label optional>Languages</Label>
          <input name="languages" value={languages} onChange={(e) => setLanguages(e.target.value)} disabled={busy} placeholder="e.g. English (fluent), Arabic (native)" className={input} />
        </div>
      </Section>

      <Section title="What you're looking for" hint="All optional — shown only to you and used for job alerts.">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label optional>Desired job title</Label>
            <input name="desiredTitle" defaultValue={defaults.desiredTitle} disabled={busy} className={input} />
          </div>
          <div>
            <Label optional>Experience level</Label>
            <select name="seniority" defaultValue={defaults.seniority} disabled={busy} className={`${input} bg-white`}>
              <option value="">Prefer not to say</option>
              <option value="ENTRY">Entry-level</option>
              <option value="MID">Mid-level</option>
              <option value="SENIOR">Senior</option>
              <option value="LEAD">Lead</option>
              <option value="EXECUTIVE">Executive</option>
            </select>
          </div>
          <div>
            <Label optional>Years of experience</Label>
            <input name="yearsOfExperience" type="number" min={0} defaultValue={defaults.yearsOfExperience} disabled={busy} className={input} />
          </div>
          <div>
            <Label optional>Remote preference</Label>
            <select name="remotePreference" defaultValue={defaults.remotePreference} disabled={busy} className={`${input} bg-white`}>
              <option value="">Prefer not to say</option>
              <option value="REMOTE_ONLY">Remote only</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ON_SITE">On-site</option>
              <option value="FLEXIBLE">Flexible</option>
            </select>
          </div>
          <div>
            <Label optional>Notice period</Label>
            <select name="noticePeriod" defaultValue={defaults.noticePeriod} disabled={busy} className={`${input} bg-white`}>
              <option value="">Prefer not to say</option>
              <option value="IMMEDIATE">Immediately available</option>
              <option value="TWO_WEEKS">2 weeks</option>
              <option value="ONE_MONTH">1 month</option>
              <option value="MORE_THAN_ONE_MONTH">More than 1 month</option>
            </select>
          </div>
          <div>
            <Label optional>Work authorization</Label>
            <select name="workAuthorization" defaultValue={defaults.workAuthorization} disabled={busy} className={`${input} bg-white`}>
              <option value="">Prefer not to say</option>
              <option value="AUTHORIZED">Authorized, no sponsorship needed</option>
              <option value="REQUIRES_SPONSORSHIP">Requires visa sponsorship</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label optional>Salary expectation</Label>
            <input name="salaryExpectation" defaultValue={defaults.salaryExpectation} disabled={busy} placeholder="e.g. AED 25k–30k / month" className={input} />
          </div>
        </div>
        <div>
          <Label optional>Default cover note</Label>
          <textarea name="savedCoverNote" rows={3} defaultValue={defaults.savedCoverNote} disabled={busy} placeholder="A short note you can reuse across applications." className={input} />
        </div>
      </Section>

      <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="openToWork" defaultChecked={defaults.openToWork} disabled={busy} className="mt-1 h-4 w-4 accent-blue-600" />
          <span>
            <span className="block text-sm font-semibold text-blue-950">Open to work — let recruiters find me</span>
            <span className="block text-xs text-blue-900/80 mt-1">
              Recruiters on RecruitAI can see your name, headline, city, About, experience, education, skills,
              languages and LinkedIn/portfolio links, and invite you to apply. They never see your email, phone, CV file, salary expectation or
              work authorization until you apply. Switch it off any time.
            </span>
          </span>
        </label>
      </section>

      <div className="flex justify-end gap-3 pb-8">
        <button
          type="submit"
          disabled={busy}
          className="bg-blue-600 text-white text-sm font-medium rounded-md px-6 py-2.5 hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
