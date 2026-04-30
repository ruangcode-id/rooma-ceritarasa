'use client';

import React from 'react';
import {
  InstagramLogo,
  WhatsappLogo,
  MapPin,
  Phone,
} from '@phosphor-icons/react';

const LOGO_H = 'h-24 md:h-28';

const SESSIONS = [
  { time: '15.00 - 17.00', label: 'Session one' },
  { time: '17.30 - 19.30', label: 'Session two' },
  { time: '20.00 - 22.00', label: 'Session three' },
];

const SOCIAL_LINKS = [
  {
    href: 'https://www.instagram.com/rooma.ceritarasa/',
    label: 'Instagram',
    Icon: InstagramLogo,
  },
  {
    href: 'https://tr.ee/x_mE3wmVJZ',
    label: 'WhatsApp',
    Icon: WhatsappLogo,
  },
];

function SocialLink({ href, label, Icon }: { href: string; label: string; Icon: any }) {
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

export default function Footer() {
  return (
    <footer className="bg-[#fcfbf9] bg-texture text-gray-800 pt-20 pb-10 px-6 flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 w-full">

        {/* ── Brand ── */}
        <div>
          <img
            src="/assets/logo_no_background.png"
            alt="Rooma Ceritarasa"
            className={`${LOGO_H} w-auto object-contain mb-4 drop-shadow-sm`}
          />
          <p className="text-gray-600 font-light leading-relaxed space-y-1">
            <span className="block">Refined Comfort Dish, Intimate Casual Dining</span>
            <span className="block">3PM - 10 PM</span>
            <span className="block">Closed On Mondays</span>
          </p>
          <div className="flex space-x-4 mt-6">
            {SOCIAL_LINKS.map((link) => (
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
              <span>
                Jl. Lawu No.2, Kotabaru, Kec. Gondokusuman,
                <br />
                Kota Yogyakarta, DI Yogyakarta 55224
              </span>
            </li>
            <li className="flex items-center group">
              <Phone
                size={18}
                weight="fill"
                className="text-primary mr-2 shrink-0 transition-transform group-hover:scale-110"
              />
              <span>+62 857 2553 9262</span>
            </li>
          </ul>
        </div>

        {/* ── Session Times ── */}
        <div>
          <div className={`${LOGO_H} flex items-center mb-4`}>
            <h3 className="text-lg font-semibold text-gray-900">Session Times</h3>
          </div>
          <ul className="space-y-3 text-gray-600 font-medium">
            {SESSIONS.map(({ time, label }) => (
              <li
                key={time}
                className="
                  flex justify-between
                  border-b border-dashed border-gray-300 pb-2
                  transition-transform duration-300 hover:translate-x-2 cursor-default
                "
              >
                <span className="font-semibold text-gray-800">{time}</span>
                <span className="w-28 text-right text-sm">{label}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      <div className="mt-16 pt-8 border-t border-black/10 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Rooma Ceritarasa. All rights reserved.
      </div>
    </footer>
  );
}
