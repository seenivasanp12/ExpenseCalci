import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

// Slide-in left navigation drawer — replaces the old horizontal tab strip.
export default function NavDrawer({ open, onClose, tabs, activeTab, onSelect }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-0 left-0 h-full w-64 max-w-[80%] bg-white z-50 shadow-2xl flex flex-col"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
              <p className="font-black text-lg text-gray-800">Menu</p>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              {tabs.map(tab => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => { onSelect(tab.id); onClose() }}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left font-semibold text-sm transition-colors ${
                      active ? `${tab.color} border-r-4` : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label || tab.id}
                  </button>
                )
              })}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
