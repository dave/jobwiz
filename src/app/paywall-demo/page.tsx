"use client";

import { useState } from "react";
import { PaywallGate, clearUnlock, type PaywallVariant, type PaywallTrackEvent } from "@/components/paywall";

export default function PaywallDemoPage() {
  const [variant, setVariant] = useState<PaywallVariant>("hard");
  const [events, setEvents] = useState<PaywallTrackEvent[]>([]);

  const handleTrack = (event: PaywallTrackEvent) => {
    setEvents((prev) => [...prev, event]);
    console.log("Track event:", event);
  };

  const handleReset = () => {
    clearUnlock("demo-journey");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">Paywall Gate Demo</h1>
          <p className="text-sm text-gray-500">Issue #10 - AB Testing Variants</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Demo Controls</h2>

          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variant
              </label>
              <select
                value={variant}
                onChange={(e) => setVariant(e.target.value as PaywallVariant)}
                className="border rounded px-3 py-2"
              >
                <option value="hard">Hard Gate</option>
                <option value="soft">Soft Gate (Blurred)</option>
                <option value="teaser">Teaser Gate</option>
              </select>
            </div>

            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            >
              Reset Unlock Status
            </button>
          </div>
        </div>

        {/* Paywall Demo */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="font-semibold">
              {variant === "hard" && "Hard Gate - Complete Block"}
              {variant === "soft" && "Soft Gate - Blurred Preview"}
              {variant === "teaser" && "Teaser Gate - Partial Content"}
            </h2>
          </div>

          <div className="p-6">
            <PaywallGate
              journeyId="demo-journey"
              price={199}
              variant={variant}
              onTrack={handleTrack}
              mockMode={true}
              heading="Unlock Google Interview Prep"
              description="Get full access to expert strategies, insider tips, and practice questions specifically tailored for Google interviews."
              ctaText="Get Full Access"
              teaserContent={
                variant === "teaser" ? (
                  <div className="prose">
                    <h3>Google Interview Overview</h3>
                    <p>
                      Google is known for having one of the most rigorous interview processes
                      in tech. Their interviews focus on problem-solving, coding skills, and
                      cultural fit with their values of innovation and collaboration.
                    </p>
                    <p>
                      The typical process includes a phone screen, technical interviews, and
                      behavioral rounds. Each stage is designed to assess different aspects of
                      your capabilities...
                    </p>
                  </div>
                ) : undefined
              }
            >
              {/* Premium Content */}
              <div className="prose prose-indigo max-w-none">
                <h3>Premium: Google Interview Deep Dive</h3>

                <h4>1. Technical Interview Preparation</h4>
                <p>
                  Google technical interviews focus heavily on data structures and algorithms.
                  You should be comfortable with:
                </p>
                <ul>
                  <li>Arrays and strings manipulation</li>
                  <li>Hash tables and their applications</li>
                  <li>Trees, graphs, and graph traversal algorithms</li>
                  <li>Dynamic programming patterns</li>
                  <li>System design fundamentals</li>
                </ul>

                <h4>2. Behavioral Interview (Googleyness)</h4>
                <p>
                  Google evaluates candidates on &quot;Googleyness&quot; - their cultural fit with
                  Google&apos;s values. Be prepared to discuss:
                </p>
                <ul>
                  <li>Times you showed intellectual humility</li>
                  <li>How you handle ambiguity</li>
                  <li>Examples of going above and beyond</li>
                  <li>Collaboration experiences</li>
                </ul>

                <h4>3. Insider Tips</h4>
                <p>
                  Based on interviews with Google engineers, here are key strategies:
                </p>
                <ol>
                  <li>Always clarify the problem before coding</li>
                  <li>Think out loud throughout the process</li>
                  <li>Start with a brute force solution, then optimize</li>
                  <li>Test your code with edge cases</li>
                </ol>
              </div>
            </PaywallGate>
          </div>
        </div>

        {/* Analytics Events */}
        {events.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Analytics Events</h2>
            <div className="space-y-2 font-mono text-sm">
              {events.map((event, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                    event.eventType === "paywall_impression" ? "bg-blue-100 text-blue-800" :
                    event.eventType === "paywall_cta_click" ? "bg-yellow-100 text-yellow-800" :
                    "bg-green-100 text-green-800"
                  }`}>
                    {event.eventType}
                  </span>
                  <span className="text-gray-500">
                    variant={event.variant}, price=${event.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
