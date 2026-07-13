import { useState } from 'react'
import { Icon } from '../atoms'
import {
  getToken,
  isConnected,
  connect,
  disconnect,
} from '../../lib/sync'

// ponytail: strings hardcoded English — spike settings surface, app is
// English-locked. Move to i18n if this becomes a real screen.

const TOKEN_URL =
  'https://github.com/settings/personal-access-tokens/new'

type Props = { onClose: () => void }

/**
 * GitHub-Gist cloud backup, no login. Paste a fine-grained token (Gists
 * read/write) once — games + player history mirror to a secret Gist. Paste the
 * same token on another device to pull the backup down.
 */
export function CloudBackupModal({ onClose }: Props) {
  const [connected, setConnected] = useState(isConnected)
  const [token, setTokenInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doConnect = async () => {
    const t = token.trim()
    if (!t) return
    setBusy(true)
    setError(null)
    const result = await connect(t)
    if (result === 'error') {
      setBusy(false)
      setError('Could not connect. Check the token has Gists read/write access.')
      return
    }
    if (result === 'ok') {
      window.location.reload() // pulled an existing backup → adopt it
      return
    }
    // 'empty' — valid token, fresh backup created
    setConnected(true)
    setBusy(false)
  }

  const doDisconnect = () => {
    disconnect()
    setConnected(false)
    setTokenInput('')
  }

  return (
    <div className='fixed inset-0 z-50'>
      <div className='absolute inset-0 bg-black/60' onClick={onClose} />
      <div className='absolute bottom-0 left-0 right-0 bg-grimoire-dark rounded-t-2xl border-t border-parchment-500/10 max-h-[85vh] overflow-y-auto'>
        <div className='flex justify-center pt-3 pb-1'>
          <div className='w-10 h-1 rounded-full bg-parchment-500/30' />
        </div>

        <div className='flex items-center justify-between px-5 py-3'>
          <div className='flex items-center gap-2 text-parchment-300'>
            <Icon name='eye' size='sm' />
            <span className='font-tarot text-lg tracking-wider uppercase'>
              Cloud Backup
            </span>
          </div>
          <button
            onClick={onClose}
            className='p-2 -mr-2 rounded-lg hover:bg-white/5 transition-colors'
          >
            <Icon name='x' size='sm' className='text-parchment-400' />
          </button>
        </div>

        <div className='px-5 pb-8 space-y-5'>
          {connected ? (
            <>
              <div className='flex items-center gap-2 text-green-400 text-sm'>
                <Icon name='checkCircle' size='sm' />
                Connected — games back up automatically to a secret Gist.
              </div>
              <p className='text-sm text-parchment-400'>
                To recover on another device, open Cloud Backup there and paste
                the same GitHub token (
                <code className='text-parchment-300'>
                  {getToken()?.slice(0, 7)}…
                </code>
                ).
              </p>
              <button
                onClick={doDisconnect}
                className='w-full p-3 rounded-lg border border-parchment-500/20 text-parchment-300 text-sm tracking-wider uppercase hover:bg-white/5 transition-colors'
              >
                Disconnect this device
              </button>
              <p className='text-xs text-parchment-500'>
                Disconnecting only forgets the token here; your Gist stays on
                GitHub.
              </p>
            </>
          ) : (
            <>
              <p className='text-sm text-parchment-400'>
                Back up your games and player history to a private GitHub Gist.
                No database, no account beyond GitHub. Paste the same token on
                another device to restore.
              </p>

              <ol className='text-sm text-parchment-400 space-y-1 list-decimal list-inside'>
                <li>
                  Create a{' '}
                  <a
                    href={TOKEN_URL}
                    target='_blank'
                    rel='noreferrer'
                    className='text-mystic-gold underline underline-offset-2'
                  >
                    fine-grained token
                  </a>{' '}
                  with <span className='text-parchment-200'>Gists</span> →
                  Read and write.
                </li>
                <li>Paste it below.</li>
              </ol>

              <input
                value={token}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder='github_pat_…'
                type='password'
                autoComplete='off'
                className='w-full p-3 rounded-lg bg-black/30 border border-parchment-500/15 text-parchment-200 text-sm placeholder:text-parchment-500 focus:outline-none focus:border-mystic-gold/40'
              />
              <button
                onClick={doConnect}
                disabled={busy || !token.trim()}
                className='w-full p-3 rounded-lg bg-mystic-gold/15 border border-mystic-gold/25 text-mystic-gold text-sm tracking-wider uppercase disabled:opacity-40 transition-opacity'
              >
                {busy ? 'Connecting…' : 'Connect'}
              </button>

              <p className='text-xs text-parchment-500'>
                The token is stored only on this device. Use a fine-grained,
                Gists-only token and revoke it anytime from GitHub settings.
              </p>
            </>
          )}

          {error && <p className='text-sm text-red-400'>{error}</p>}
        </div>
      </div>
    </div>
  )
}
