'use client'

import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navigation() {
  const location = useLocation()
  
  const navItems = [
    { href: '/', label: 'ダッシュボード' },
    { href: '/kanban', label: 'カンバン' },
    { href: '/log', label: 'ログ記録' },
  ]

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-900">営業進捗管理ツール</h1>
            <div className="flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.href
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
} 