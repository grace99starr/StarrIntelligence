import React from 'react'

interface SectionProps {
  icon: string
  title: string
  children: React.ReactNode
  accent?: string
  headerRight?: React.ReactNode
}

export default function Section({ icon, title, children, accent = 'border-gold-500', headerRight }: SectionProps) {
  return (
    <div className={`bg-navy-800 rounded-2xl border-l-4 ${accent} p-6 shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
          <span className="text-base">{icon}</span>
          {title}
        </h2>
        {headerRight}
      </div>
      {children}
    </div>
  )
}
