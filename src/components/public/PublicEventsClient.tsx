"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarBlank,
  ForkKnife,
  Sparkle,
  UsersThree,
} from "@phosphor-icons/react";
import { EventRequestForm } from "@/components/public/EventRequestForm";

export type PublicEventItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  eventDate: string | null;
};

const COMMON_EVENT_TYPES = [
  "Private Dining",
  "Birthday Celebration",
  "Corporate Gathering",
  "Wedding Reception",
  "Community Event",
];

const FALLBACK_IMAGES = [
  "/assets/slider3.webp",
  "/assets/slider4.webp",
  "/assets/slider5.webp",
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function PublicEventsClient({
  events,
}: {
  events: PublicEventItem[];
}) {
  const [selectedEventType, setSelectedEventType] = useState("");

  const eventTypeOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...events.map((event) => event.title),
          ...COMMON_EVENT_TYPES,
        ])
      ),
    [events]
  );

  function selectEvent(title: string) {
    setSelectedEventType(title);
    document
      .getElementById("event-request")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="bg-[#fcfbf9] text-slate-900">
      <section className="relative min-h-[620px] overflow-hidden pt-20">
        <Image
          src="/assets/slider4.webp"
          alt="Private event at Rooma Ceritarasa"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-slate-950/20" />

        <div className="relative mx-auto flex min-h-[540px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white animate-fade-in-up">
            <p className="text-xs uppercase tracking-[0.35em] text-white/70">
              Gather at Rooma
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
              Special moments,
              <br />
              designed more personally.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
              From intimate dinners to corporate gatherings, tell us the event you envision and our team will prepare a special offer.
            </p>
            <a
              href="#event-request"
              className="mt-8 inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-all duration-300 hover:scale-105 hover:bg-primary hover:text-white"
            >
              Request Event
              <ArrowRight size={18} weight="bold" />
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            What&apos;s Happening
          </p>
          <h2 className="mt-3 text-4xl font-semibold text-slate-950 sm:text-5xl">
            Events at Rooma
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Discover our latest agenda or use it as inspiration to design your own experience.
          </p>
        </div>

        {events.length > 0 ? (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, index) => (
              <article
                key={event.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-500 hover:shadow-2xl"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <Image
                    src={
                      event.imageUrl ||
                      FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]
                    }
                    alt={event.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  {event.eventDate ? (
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary">
                      <CalendarBlank size={15} weight="bold" />
                      {formatDate(event.eventDate)}
                    </p>
                  ) : (
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Special Event
                    </p>
                  )}
                  <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                    {event.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                    {event.description ??
                      "Special dining and gathering experiences designed at Rooma Ceritarasa."}
                  </p>
                  <button
                    type="button"
                    onClick={() => selectEvent(event.title)}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
                  >
                    Inquire about this event
                    <ArrowRight size={16} weight="bold" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <Sparkle size={30} className="mx-auto text-primary" />
            <h3 className="mt-4 text-2xl font-semibold text-slate-950">
              Latest agenda coming soon
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              You can still request a private event. Tell us your needs and our team will contact you with a special offer.
            </p>
          </div>
        )}
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-3 lg:px-8">
          {[
            {
              number: "01",
              title: "Tell us your needs",
              description:
                "Fill in the date, pax, and the event concept you want.",
            },
            {
              number: "02",
              title: "Receive offer",
              description:
                "The Rooma team reviews the request and sends pricing and offer documents.",
            },
            {
              number: "03",
              title: "Confirm with Down Payment",
              description:
                "Approve the offer by securely completing the Down Payment via Midtrans.",
            },
          ].map((step) => (
            <article key={step.number}>
              <p className="text-sm font-semibold text-primary">
                {step.number}
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="event-request"
        className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Private Events
            </p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              Start planning your event.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              This request is not a final booking. Our team will contact you and send an offer via the request details.
            </p>

            <div className="mt-10 space-y-5">
              <EventBenefit
                Icon={ForkKnife}
                title="Flexible menu and experience"
                description="Customize the dining format and event needs with our team."
              />
              <EventBenefit
                Icon={UsersThree}
                title="Dedicated assistance"
                description="One PIC assists the process from offer to confirmation."
              />
            </div>
          </div>

          <EventRequestForm
            key={selectedEventType || "general-event-request"}
            initialEventType={selectedEventType}
            eventTypeOptions={eventTypeOptions}
          />
        </div>
      </section>
    </div>
  );
}

function EventBenefit({
  Icon,
  title,
  description,
}: {
  Icon: typeof ForkKnife;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon size={20} />
      </span>
      <div>
        <p className="font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}
