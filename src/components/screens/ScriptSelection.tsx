import { useState } from 'react'
import { useI18n, interpolate } from '../../lib/i18n'
import { SCRIPTS, ScriptId, setImportedScript } from '../../lib/scripts'
import { parseScriptJson, ScriptImportResult } from '../../lib/scripts/import'
import { getRoleName } from '../../lib/i18n'
import { Icon, BackButton, Button } from '../atoms'
import { cn } from '../../lib/utils'

type Props = {
  players: string[]
  onSelect: (scriptId: ScriptId) => void
  onBack: () => void
}

const SCRIPT_ORDER: ScriptId[] = ['trouble-brewing', 'custom']

export function ScriptSelection({ players, onSelect, onBack }: Props) {
  const { t, language } = useI18n()
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importResult, setImportResult] = useState<ScriptImportResult | null>(
    null,
  )
  const [importError, setImportError] = useState<string | null>(null)

  const getScriptName = (id: ScriptId) => {
    return t.scripts[id as keyof typeof t.scripts] ?? id
  }

  const handleLoad = () => {
    try {
      setImportResult(parseScriptJson(importText))
      setImportError(null)
    } catch {
      setImportResult(null)
      setImportError(t.scripts.importInvalid)
    }
  }

  const handleUseImport = () => {
    if (!importResult || importResult.roles.length === 0) return
    setImportedScript(importResult.roles)
    onSelect('imported')
  }

  return (
    <div className='min-h-app bg-gradient-to-b from-grimoire-purple via-grimoire-dark to-grimoire-darker flex flex-col'>
      {/* Header */}
      <div className='sticky top-0 z-10 bg-grimoire-dark/95 backdrop-blur-sm border-b border-mystic-gold/20 px-4 py-3'>
        <div className='flex items-center gap-3 max-w-3xl mx-auto'>
          <BackButton onClick={onBack} />
          <div className='flex-1'>
            <h1 className='font-tarot text-lg text-parchment-100 tracking-wider uppercase'>
              {t.scripts.selectScript}
            </h1>
            <p className='text-xs text-parchment-500'>
              {t.scripts.selectScriptSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Player count badge */}
      <div className='px-4 py-3 bg-white/5 border-b border-white/10'>
        <div className='max-w-3xl mx-auto flex items-center gap-2'>
          <Icon name='users' size='sm' className='text-mystic-gold/70' />
          <span className='text-sm text-parchment-300'>
            {players.length} {t.common.players.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Script cards */}
      <div className='flex-1 px-4 py-6 max-w-3xl mx-auto w-full'>
        <div className='grid gap-4 sm:grid-cols-2'>
          {SCRIPT_ORDER.map((scriptId) => {
            const script = SCRIPTS[scriptId]
            const isCustom = scriptId === 'custom'

            return (
              <button
                key={scriptId}
                type='button'
                onClick={() => onSelect(scriptId)}
                className={cn(
                  'w-full rounded-2xl border-2 transition-all',
                  'p-5 text-left',
                  'active:scale-[0.98]',
                  isCustom
                    ? 'border-parchment-500/30 bg-gradient-to-br from-white/5 to-white/[0.02] hover:border-parchment-400/40'
                    : 'border-mystic-gold/30 bg-gradient-to-br from-mystic-gold/10 to-mystic-gold/[0.02] hover:border-mystic-gold/50',
                )}
                style={
                  !isCustom
                    ? {
                        boxShadow:
                          '0 0 20px rgba(212, 175, 55, 0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
                      }
                    : undefined
                }
              >
                <div className='flex items-start gap-4'>
                  {/* Icon */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                      isCustom
                        ? 'bg-parchment-500/10 border border-parchment-500/20'
                        : 'bg-mystic-gold/10 border border-mystic-gold/30',
                    )}
                  >
                    <Icon
                      name={script.icon}
                      size='lg'
                      className={
                        isCustom ? 'text-parchment-400' : 'text-mystic-gold'
                      }
                    />
                  </div>

                  {/* Content */}
                  <div className='flex-1 min-w-0'>
                    <h2
                      className={cn(
                        'font-tarot text-base tracking-wider uppercase mb-1',
                        isCustom ? 'text-parchment-200' : 'text-mystic-gold',
                      )}
                    >
                      {getScriptName(scriptId)}
                    </h2>
                    <p className='text-xs text-parchment-500 leading-relaxed'>
                      {isCustom
                        ? t.scripts.freeformSelection
                        : t.scripts.enforceDistribution}
                    </p>

                    {/* Role count */}
                    {!isCustom && (
                      <div className='mt-2 flex items-center gap-1.5'>
                        <Icon
                          name='users'
                          size='xs'
                          className='text-parchment-500'
                        />
                        <span className='text-[11px] text-parchment-500'>
                          {script.roles.length} {t.common.roles.toLowerCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <Icon
                    name='chevronRight'
                    size='md'
                    className={cn(
                      'flex-shrink-0 mt-1',
                      isCustom
                        ? 'text-parchment-500/50'
                        : 'text-mystic-gold/50',
                    )}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {/* Import a script JSON */}
        <div className='mt-6'>
          <button
            type='button'
            onClick={() => setShowImport((v) => !v)}
            className='flex w-full items-center justify-center gap-2 rounded-xl border border-board-gold/25 bg-white/5 px-4 py-3 text-sm text-parchment-300 transition-colors hover:bg-white/10'
          >
            <Icon name='bookMarked' size='sm' className='text-board-gold/70' />
            {t.scripts.importScript}
          </button>

          {showImport && (
            <div className='mt-3 rounded-2xl border border-board-gold/30 bg-parchment-100 p-4'>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={t.scripts.importPlaceholder}
                rows={5}
                className='w-full resize-y rounded-lg border border-board-ink/20 bg-parchment-50 p-3 font-mono text-xs text-board-ink placeholder:text-board-ink/40 focus:outline-none focus:ring-2 focus:ring-board-gold/40'
              />
              <div className='mt-2 flex justify-end'>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={handleLoad}
                  disabled={!importText.trim()}
                >
                  {t.scripts.importLoad}
                </Button>
              </div>

              {importError && (
                <p className='mt-3 text-sm text-red-700'>{importError}</p>
              )}

              {importResult && (
                <div className='mt-3 border-t border-board-ink/15 pt-3'>
                  {importResult.name && (
                    <p className='font-tarot text-sm uppercase tracking-wider text-board-ink'>
                      {importResult.name}
                    </p>
                  )}
                  <p className='mt-1 text-sm text-board-ink/80'>
                    {interpolate(t.scripts.importRolesFound, {
                      count: importResult.roles.length,
                    })}
                  </p>
                  {importResult.dropped.length > 0 && (
                    <p className='mt-1 text-xs text-board-ink/55'>
                      {interpolate(t.scripts.importDropped, {
                        count: importResult.dropped.length,
                        names: importResult.dropped.join(', '),
                      })}
                    </p>
                  )}
                  {importResult.roles.length === 0 ? (
                    <p className='mt-2 text-sm text-red-700'>
                      {t.scripts.importEmpty}
                    </p>
                  ) : (
                    <div className='mt-3'>
                      <Button variant='dawn' size='sm' onClick={handleUseImport}>
                        {t.scripts.importUse}
                      </Button>
                      <p className='mt-2 text-xs text-board-ink/50'>
                        {importResult.roles
                          .map((r) => getRoleName(r, language))
                          .join(' · ')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
