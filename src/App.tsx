import { useEffect, useState, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import ItemDetailPage from '@/pages/ItemDetailPage'
import SharePage from '@/pages/SharePage'
import SavePage from '@/pages/SavePage'
import DesignShowcasePage from '@/pages/DesignShowcasePage'
import LoginPage from '@/pages/LoginPage'
import Sidebar from '@/components/layout/Sidebar'
import ItemGrid from '@/components/patterns/ItemGrid'
import AddItemDialog from '@/components/patterns/AddItemDialog'
import DesignPanel from '@/components/patterns/DesignPanel'
import { fetchItems, fetchFolders, deleteItem, updateItem, createFolder, renameFolder, deleteFolder } from '@/utils/supabase'
import { createItemWithClassification, updateItemWithClassification } from '@/utils/item-service'
import { useAuth } from '@/hooks/use-auth'

function guessType(url) {
  const u = (url || '').toLowerCase()
  if (/youtube\.com|youtu\.be|vimeo\.com|bilibili\.com/.test(u)) return 'video'
  if (/twitter\.com|x\.com|weibo\.com|xiaohongshu/.test(u)) return 'tweet'
  if (/spotify\.com|podcast|\.mp3|\.wav/.test(u)) return 'audio'
  return 'article'
}

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [items, setItems] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFolder, setSelectedFolder] = useState('inbox')
  const [search, setSearch] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Dialog state: null = closed, undefined = new, item object = edit
  const [dialogItem, setDialogItem] = useState(null)
  const dialogOpen = dialogItem !== null
  const editItem = dialogItem && dialogItem.id ? dialogItem : null

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setItems([])
      setFolders([])
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([fetchItems(), fetchFolders()])
      .then(([fetchedItems, fetchedFolders]) => {
        setItems(fetchedItems)
        setFolders(fetchedFolders)
      })
      .catch(err => {
        console.error('[PB] load error:', err)
      })
      .finally(() => setLoading(false))
  }, [authLoading, user?.id])

  // Chrome extension autosave via URL params
  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('autosave') === '1') {
      const url = params.get('url') || ''
      const title = params.get('title') || url
      const type = params.get('type') || guessType(url)
      const note = params.get('note') || ''
      const folderId = params.get('folderId') || null
      if (url) {
        createItemWithClassification({ url, title, type, note, folderId })
          .then(item => setItems(prev => [item, ...prev]))
          .catch(console.error)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [user?.id])

  const handleSignOut = useCallback(async () => {
    const { error } = await signOut()
    if (error) {
      console.error('[PB] sign out error:', error)
    }
  }, [signOut])

  const openAdd = useCallback(() => setDialogItem({}), [])
  const openEdit = useCallback((item) => setDialogItem(item), [])
  const closeDialog = useCallback(() => setDialogItem(null), [])

  const handleSave = useCallback(async (data) => {
    try {
      if (data.id) {
        // Edit mode
        const { id, ...changes } = data
        const item = await updateItemWithClassification(id, changes)
        setItems(prev => prev.map(i => i.id === id ? item : i))
      } else {
        // Create mode
        const item = await createItemWithClassification(data)
        setItems(prev => [item, ...prev])
      }
      setDialogItem(null)
    } catch (err) {
      console.error('[PB] save error:', err)
    }
  }, [])

  const handleUpdateItem = useCallback(async (id, changes) => {
    try {
      const item = await updateItemWithClassification(id, changes)
      setItems(prev => prev.map(i => i.id === id ? item : i))
    } catch (err) {
      console.error('[PB] update error:', err)
    }
  }, [])

  const handleMoveItem = useCallback(async (id, newFolderId) => {
    // 乐观更新：先改 UI，再写库
    setItems(prev => prev.map(i => i.id === id ? { ...i, folderId: newFolderId } : i))
    try {
      await updateItem(id, { folderId: newFolderId })
    } catch (err) {
      console.error('[PB] move error:', err)
      // 失败回滚：重新拉取
      const fresh = await fetchItems()
      setItems(fresh)
    }
  }, [])

  const handleDeleteItem = useCallback(async (id) => {
    try {
      await deleteItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error('[PB] delete error:', err)
    }
  }, [])

  const handleCreateFolder = useCallback(async (name, parentId) => {
    try {
      const folder = await createFolder(name, parentId)
      setFolders(prev => [...prev, folder])
    } catch (err) {
      console.error('[PB] create folder error:', err)
    }
  }, [])

  const handleRenameFolder = useCallback(async (id, name) => {
    try {
      const folder = await renameFolder(id, name)
      setFolders(prev => prev.map(f => f.id === id ? folder : f))
    } catch (err) {
      console.error('[PB] rename folder error:', err)
    }
  }, [])

  const handleDeleteFolder = useCallback(async (id) => {
    try {
      await deleteFolder(id)
      setFolders(prev => prev.filter(f => f.id !== id))
      setItems(prev => prev.map(i => i.folderId === id ? { ...i, folderId: null } : i))
      if (selectedFolder === id) setSelectedFolder('inbox')
    } catch (err) {
      console.error('[PB] delete folder error:', err)
    }
  }, [selectedFolder])

  const filteredItems = items.filter(item => {
    const matchFolder = selectedFolder === 'all'
      ? true
      : selectedFolder === 'inbox'
        ? !item.folderId
        : item.folderId === selectedFolder
    const q = search.toLowerCase()
    const matchSearch = !q
      || item.title.toLowerCase().includes(q)
      || item.url.toLowerCase().includes(q)
      || (item.note || '').toLowerCase().includes(q)
    return matchFolder && matchSearch
  })

  const mainLayout = (
    <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar
          folders={folders}
          items={items}
          selected={selectedFolder}
          onSelect={setSelectedFolder}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          search={search}
          onSearch={setSearch}
          onAdd={openAdd}
          currentUserEmail={user?.email ?? ''}
          onSignOut={handleSignOut}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
        <main className="flex-1 overflow-auto">
          <ItemGrid
            items={filteredItems}
            folders={folders}
            loading={loading}
            selectedFolder={selectedFolder}
            onUpdate={handleUpdateItem}
            onMove={handleMoveItem}
            onDelete={handleDeleteItem}
            onAdd={openAdd}
            onEdit={openEdit}
            onMobileMenuOpen={() => setMobileMenuOpen(true)}
          />
        </main>
        <AddItemDialog
          open={dialogOpen}
          onOpenChange={open => { if (!open) closeDialog() }}
          folders={folders}
          onSave={handleSave}
          defaultFolderId={selectedFolder !== 'all' && selectedFolder !== 'inbox' ? selectedFolder : null}
          editItem={editItem}
        />
        <DesignPanel />
      </div>
  )

  return (
    <TooltipProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth loading={authLoading} user={user}>{mainLayout}</RequireAuth>} />
        <Route path="/item/:id" element={<RequireAuth loading={authLoading} user={user}><ItemDetailPage /></RequireAuth>} />
        <Route path="/share" element={<RequireAuth loading={authLoading} user={user}><SharePage /></RequireAuth>} />
        <Route path="/save" element={<RequireAuth loading={authLoading} user={user}><SavePage /></RequireAuth>} />
        <Route path="/design-showcase" element={<DesignShowcasePage />} />
      </Routes>
    </TooltipProvider>
  )
}

function RequireAuth({ children, loading, user }) {
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-background text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        正在检查登录状态…
      </div>
    )
  }

  if (!user) {
    const redirect = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />
  }

  return children
}
