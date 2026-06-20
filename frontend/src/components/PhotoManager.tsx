import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''
const UPLOAD_PASSWORD = import.meta.env.VITE_UPLOAD_PASSWORD || 'starr2026'

interface Photo {
  filename: string
  url: string
}

export default function PhotoManager() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const tryLogin = () => {
    if (password === UPLOAD_PASSWORD) {
      setAuthed(true)
      setError('')
    } else {
      setError('Wrong password.')
    }
  }

  const fetchPhotos = async () => {
    const res = await fetch(`${API_BASE}/api/photos`)
    const data = await res.json()
    setPhotos(data.photos || [])
  }

  useEffect(() => {
    if (authed) fetchPhotos()
  }, [authed])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    setSuccess('')

    const form = new FormData()
    Array.from(files).forEach(f => form.append('files', f))

    try {
      const res = await fetch(`${API_BASE}/api/photos/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPLOAD_PASSWORD}` },
        body: form
      })
      const data = await res.json()
      setSuccess(`Uploaded ${data.uploaded} photo${data.uploaded !== 1 ? 's' : ''}!`)
      await fetchPhotos()
    } catch {
      setError('Upload failed.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (filename: string) => {
    setDeleting(filename)
    try {
      await fetch(`${API_BASE}/api/photos/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${UPLOAD_PASSWORD}` }
      })
      await fetchPhotos()
    } catch {
      setError('Delete failed.')
    } finally {
      setDeleting(null)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="bg-[#141414] rounded-2xl border border-[#2a2a2a] p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <span className="text-4xl">📸</span>
            <h1 className="text-white font-bold text-lg mt-2">Photo Library</h1>
            <p className="text-gray-400 text-sm mt-1">Starr Intelligence</p>
          </div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryLogin()}
            className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm mb-3 outline-none focus:border-gold-500"
          />
          {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
          <button
            onClick={tryLogin}
            className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold py-3 rounded-lg text-sm transition-colors"
          >
            Enter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white font-bold text-xl flex items-center gap-2">
              <span>📸</span> Photo Library
            </h1>
            <p className="text-gray-400 text-sm mt-1">{photos.length} photo{photos.length !== 1 ? 's' : ''} in rotation</p>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                uploading
                  ? 'bg-[#2a2a2a] text-gray-400 cursor-not-allowed'
                  : 'bg-gold-500 hover:bg-gold-400 text-black'
              }`}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Uploading…
                </>
              ) : (
                <>+ Add Photos</>
              )}
            </label>
          </div>
        </div>

        {/* Feedback */}
        {success && (
          <div className="bg-green-900/30 border border-green-700 text-green-300 text-sm rounded-xl px-4 py-3 mb-6">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {/* Photo grid */}
        {photos.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <p className="text-4xl mb-3">🐱</p>
            <p className="text-sm">No photos yet. Add some!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map(photo => (
              <div key={photo.filename} className="group relative aspect-square rounded-xl overflow-hidden bg-[#1c1c1c]">
                <img
                  src={photo.url}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleDelete(photo.filename)}
                    disabled={deleting === photo.filename}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {deleting === photo.filename ? 'Removing…' : 'Remove'}
                  </button>
                </div>
                <p className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs text-gray-300 px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {photo.filename}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-gray-600 text-xs mt-12">
          Photos rotate randomly in the daily brief • Built by Grace • Father's Day 2026
        </p>
      </div>
    </div>
  )
}
