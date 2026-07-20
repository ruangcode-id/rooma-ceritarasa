'use client';

import React from 'react';
import Image from 'next/image';
import {
  InstagramLogo,
  WhatsappLogo,
  MapPin,
  Phone,
  type Icon,
} from '@phosphor-icons/react';
import type { RestaurantSettingEntity } from '@/domain/settings/types';

const LOGO_H = 'h-24 md:h-28';

// Removed hardcoded SESSIONS and SOCIAL_LINKS

type SocialLinkProps = {
  href: string;
  label: string;
  Icon: Icon;
};

type FooterSession = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

type FooterProps = {
  settings?: RestaurantSettingEntity;
  sessions?: FooterSession[];
};

function SocialLink({ href, label, Icon }: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="
        w-10 h-10 rounded-full
        bg-white shadow-sm border border-black/5
        flex items-center justify-center
        text-gray-600
        transition-all duration-300
        hover:scale-110 hover:bg-primary hover:text-white hover:border-primary
      "
    >
      <span className="sr-only">{label}</span>
      <Icon size={20} />
    </a>
  );
}

export default function Footer({ settings, sessions }: FooterProps) {
  // Construct dynamic social links based on settings
  const dynamicSocialLinks: SocialLinkProps[] = [];
  if (settings?.socialLinks?.instagram) {
    dynamicSocialLinks.push({ href: settings.socialLinks.instagram, label: 'Instagram', Icon: InstagramLogo });
  }
  if (settings?.whatsappNumber) {
    // Generate a basic WA link if only number is provided, or use actual tree link if you prefer. 
    // Here we'll just format it to standard wa.me link
    const waLink = `https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`;
    dynamicSocialLinks.push({ href: waLink, label: 'WhatsApp', Icon: WhatsappLogo });
  }

  const tagline = settings?.tagline || "Refined Comfort Dish, Intimate Casual Dining";
  return (
    <footer className="relative z-10 bg-[#fcfbf9] bg-texture text-gray-800 pt-20 pb-10 px-6 flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 w-full">

        {/* ── Brand ── */}
        <div>
          <Image
            src="/assets/logo_no_background.png"
            alt="Rooma Ceritarasa"
            width={1241}
            height={1241}
            sizes="(max-width: 767px) 6rem, 7rem"
            className={`${LOGO_H} w-auto object-contain mb-4 drop-shadow-sm`}
          />
          <p className="text-gray-600 font-light leading-relaxed space-y-1 whitespace-pre-line">
            <span className="block">{tagline}</span>
            <span className="block mt-2">Closed On Mondays</span>
          </p>
          <div className="flex space-x-4 mt-6">
            {dynamicSocialLinks.map((link) => (
              <SocialLink key={link.label} {...link} />
            ))}
          </div>
        </div>

        {/* ── Contact ── */}
        <div>
          <div className={`${LOGO_H} flex items-center mb-4`}>
            <h3 className="text-lg font-semibold text-gray-900">Contact</h3>
          </div>
          <ul className="space-y-3 text-gray-600 font-medium">
            <li className="flex items-start group">
              <MapPin
                size={18}
                weight="fill"
                className="text-primary mr-2 mt-0.5 shrink-0 transition-transform group-hover:scale-110"
              />
              <span className="whitespace-pre-line">
                {settings?.address || "Jl. Lawu No.4, Kotabaru, Kec. Gondokusuman,\nKota Yogyakarta, DI Yogyakarta 55224"}
              </span>
            </li>
            <li className="flex items-center group">
              <Phone
                size={18}
                weight="fill"
                className="text-primary mr-2 shrink-0 transition-transform group-hover:scale-110"
              />
              <span>{settings?.phone || "+62 857 2553 9262"}</span>
            </li>
          </ul>
        </div>

        {/* ── Session Times ── */}
        <div>
          <div className={`${LOGO_H} flex items-center mb-4`}>
            <h3 className="text-lg font-semibold text-gray-900">Session Times</h3>
          </div>
          <ul className="space-y-3 text-gray-600 font-medium">
            {sessions && sessions.length > 0 ? sessions.map((session) => (
              <li
                key={session.id || session.name}
                className="
                  flex justify-between
                  border-b border-dashed border-gray-300 pb-2
                  transition-transform duration-300 hover:translate-x-2 cursor-default
                "
              >
                <span className="font-semibold text-gray-800">{session.startTime} - {session.endTime}</span>
                <span className="w-28 text-right text-sm">{session.name}</span>
              </li>
            )) : (
              <li className="text-sm italic text-gray-400">Belum ada sesi operasional</li>
            )}
          </ul>
        </div>

      </div>

      <div className="mt-16 pt-8 border-t border-black/10 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Rooma Ceritarasa. All rights reserved.
      </div>
    </footer>
  );
}
