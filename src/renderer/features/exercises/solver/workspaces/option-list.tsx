import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Keyboard-accessible single-choice list used by option based exercise types.
 */
export function OptionList({
  options,
  selected,
  onSelect,
  disabled,
  render
}: {
  options: string[]
  selected: number | null
  onSelect: (index: number) => void
  disabled?: boolean
  render?: (option: string, index: number) => ReactNode
}) {
  return (
    <div role="radiogroup" className="space-y-2">
      {options.map((option, index) => {
        const isSelected = selected === index
        return (
          <motion.button
            key={index}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(index)}
            whileTap={{ scale: 0.995 }}
            data-testid={`option-${index}`}
            className={cn(
              'flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-70',
              isSelected && 'border-primary/70 bg-primary/8 ring-1 ring-primary/30'
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold text-muted-foreground',
                isSelected && 'border-primary bg-primary text-primary-foreground'
              )}
            >
              {String.fromCharCode(65 + index)}
            </span>
            <span className="min-w-0 flex-1 text-sm">{render ? render(option, index) : option}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
