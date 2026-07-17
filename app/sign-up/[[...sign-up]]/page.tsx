import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen bg-base">
      {/* Left panel — branding, hidden on small screens */}
      <div className="hidden md:flex md:w-1/2 flex-col justify-center px-12 lg:px-20 bg-surface">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold text-copy-primary">
            Ghost AI
          </h1>
          <p className="mt-3 text-copy-secondary leading-relaxed">
            AI-powered design tool for creating stunning interfaces,
            collaborating in real time, and shipping production-ready code.
          </p>
          <ul className="mt-8 space-y-3 text-copy-muted">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-brand">•</span>
              <span>Generate designs from natural language prompts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-brand">•</span>
              <span>Collaborate in real time with your team</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-brand">•</span>
              <span>Export to production-ready React code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-brand">•</span>
              <span>Version history and branching for every project</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Right panel — Clerk form */}
      <div className="flex w-full md:w-1/2 items-center justify-center px-4">
        <SignUp />
      </div>
    </div>
  );
}
