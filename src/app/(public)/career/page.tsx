import { listPublicCareerJobs } from "@/features/careers/career.service";
import { format } from "date-fns";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers | Rooma Ceritarasa",
  description: "Join Rooma Ceritarasa and discover exciting career opportunities in culinary and hospitality.",
};

export default async function CareerPage() {
  const { data: jobs } = await listPublicCareerJobs({ page: 1, limit: 100, sort: "latest" });



  return (
    <div className="min-h-screen bg-white pt-32 pb-24 font-sans text-slate-900">
      <style dangerouslySetInnerHTML={{
        __html: `
        .dotted-leader {
            border-bottom: 2px dotted #e5e7eb;
            flex-grow: 1;
            margin: 0 1rem;
        }
      `}} />



      {/* Positions List Section */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-24">
        {jobs.length === 0 ? (
          <div className="text-center py-16 border-t border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Open Positions</h2>
            <p className="text-gray-500">We currently do not have any open positions. Please check back later.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-16">
            <div>
              <h2 className="text-xs font-bold tracking-[0.1em] text-gray-500 uppercase mb-8 border-b border-gray-200 pb-3">
                Current Openings
              </h2>
              <ul className="space-y-16">
                {jobs.map((job) => (
                  <li key={job.id} className="group">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between py-2 gap-2 sm:gap-0">
                      <span className="text-2xl md:text-3xl font-bold text-gray-900 group-hover:text-primary transition-colors">
                        {job.title}
                      </span>
                      <div className="hidden sm:block dotted-leader transition-opacity group-hover:opacity-100"></div>
                      <span className="text-xs font-bold tracking-[0.1em] text-gray-500 uppercase whitespace-nowrap">
                        {job.deadline ? `Closing: ${format(new Date(job.deadline), "MM/dd/yyyy")}` : "Open"}
                      </span>
                    </div>

                    <div className="mt-6 max-w-4xl">
                      <p className="text-gray-600 text-lg leading-relaxed mb-6">
                        {job.description}
                      </p>

                      <div className="text-sm text-gray-500 mb-8 whitespace-pre-wrap leading-relaxed">
                        <strong className="text-gray-900 block mb-3 uppercase text-[10px] tracking-widest">Requirements</strong>
                        {job.requirements}
                      </div>

                      <Link
                        href={`https://wa.me/6281234567890?text=Hello%20Rooma%20Ceritarasa%20HR%20Team,%20I%20am%20interested%20in%20applying%20for%20the%20${encodeURIComponent(job.title)}%20position.%20Attached%20is%20my%20CV...`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block border-b border-primary text-primary uppercase tracking-[0.15em] text-xs font-bold pb-1 hover:text-primary-dark hover:border-primary-dark transition-colors"
                      >
                        Submit Candidacy
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
