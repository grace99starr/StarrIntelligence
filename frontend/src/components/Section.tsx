import React from 'react'

interface SectionProps {
  icon: string
  title: string
  children: React.ReactNode
  accent?: string
}

export default function Section({ icon, title, children, accent = 'border-gold-500' }: SectionProps) {
  return (
    <div className={`bg-navy-800 rounded-2xl border-l-4 ${accent} p-6 shadow-lg`}>
      <h2 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">
        <span className="text-base">{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  )
}
