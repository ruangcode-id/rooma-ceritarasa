import type { Metadata } from "next";
import {
  PublicEventsClient,
  type PublicEventItem,
} from "@/components/public/PublicEventsClient";
import { getPublishedEventsUseCase } from "@/application/use-cases/event/get-published-events.usecase";
import { SettingsUseCase } from "@/application/use-cases/settings/settings.usecase";

export const metadata: Metadata = {
  title: "Events | Rooma Ceritarasa",
  description:
    "Temukan event terbaru dan ajukan private event Anda di Rooma Ceritarasa.",
};

async function getPublicEvents(): Promise<PublicEventItem[]> {
  try {
    const events = await getPublishedEventsUseCase();

    return events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      imageUrl: event.imageUrl,
      eventDate: event.eventDate?.toISOString() ?? null,
    }));
  } catch (error) {
    console.error("[Public Events Page]", error);
    return [];
  }
}

export default async function EventsPage() {
  const events = await getPublicEvents();
  const settings = await SettingsUseCase.getSettingsAction();

  return <PublicEventsClient events={events} whatsappNumber={settings.whatsappNumber || "6285725539262"} />;
}
