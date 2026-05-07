"use client";

type InboxTask = {
  id: string;
  submissionId: string;
  createdAt: string | Date;
  submission: {
    id: string;
    form: {
      title: string;
    };
  };
};

export default function InboxClient({ tasks }: { tasks: InboxTask[] }) {
  async function decide(
    submissionId: string,
    taskId: string,
    action: "approve" | "reject" | "revise",
  ) {
    await fetch(`/api/submissions/${submissionId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });

    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f4ec_0%,#efe7d7_100%)] p-8 text-black">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-[28px] border border-black/10 bg-white/80 p-8 shadow-[0_24px_80px_rgba(33,24,10,0.08)] backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-800/70">
            Approver workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Approval Inbox
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Review pending submissions and route decisions back through the
            approval workflow.
          </p>
        </header>

        {tasks.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-black/15 bg-white/70 p-10 text-center shadow-sm">
            <h2 className="text-xl font-medium">No pending tasks</h2>
            <p className="mt-2 text-sm text-neutral-500">
              New approval requests will appear here when they are assigned to
              you.
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            {tasks.map((task, index) => (
              <article
                key={task.id}
                className="rounded-[24px] border border-black/10 bg-white p-6 shadow-[0_16px_40px_rgba(20,14,6,0.08)]"
                style={{
                  animationDelay: `${index * 80}ms`,
                }}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.28em] text-neutral-400">
                      Pending review
                    </p>
                    <h2 className="text-xl font-medium">
                      {task.submission.form.title}
                    </h2>
                    <p className="text-sm text-neutral-500">
                      Submission {task.submission.id}
                    </p>
                  </div>

                  <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-amber-900">
                    Awaiting decision
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
                    onClick={() =>
                      decide(task.submissionId, task.id, "approve")
                    }
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-50"
                    onClick={() =>
                      decide(task.submissionId, task.id, "reject")
                    }
                    type="button"
                  >
                    Reject
                  </button>
                  <button
                    className="rounded-full border border-amber-300 bg-amber-100 px-5 py-2.5 text-sm font-medium text-amber-950 transition hover:bg-amber-200"
                    onClick={() =>
                      decide(task.submissionId, task.id, "revise")
                    }
                    type="button"
                  >
                    Request revision
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
