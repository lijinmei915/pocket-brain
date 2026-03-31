import { useEffect, useState, useCallback } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import Sidebar from '@/components/Sidebar'
import ItemGrid from '@/components/ItemGrid'
import AddItemDialog from '@/components/AddItemDialog'
import { fetchItems, fetchFolders, createItem, updateItem, deleteItem, createFolder, renameFolder, deleteFolder } from '@/lib/supabase'

function guessType(url) {
  const u = (url || '').toLowerCase()
  if (/youtube\.com|youtu\.be|vimeo\.com|bilibili\.com/.test(u)) return 'video'
  if (/twitter\.com|x\.com|weibo\.com|xiaohongshu/.test(u)) return 'tweet'
  if (/spotify\.com|podcast|\.mp3|\.wav/.test(u)) return 'audio'
  return 'article'
}

export default function App() {
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
    Promise.all([fetchItems(), fetchFolders()])
      .then(([fetchedItems, fetchedFolders]) => {
        setItems(fetchedItems)
        setFolders(fetchedFolders)
      })
      .finally(() => setLoading(false))
  }, [])

  // Chrome extension autosave via URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('autosave') === '1') {
      const url = params.get('url') || ''
      const title = params.get('title') || url
      const type = params.get('type') || guessType(url)
      const note = params.get('note') || ''
      const folderId = params.get('folderId') || null
      if (url) {
        createItem({ url, title, type, note, folderId })
          .then(item => setItems(prev => [item, ...prev]))
          .catch(console.error)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  const openAdd = useCallback(() => setDialogItem({}), [])
  const openEdit = useCallback((item) => setDialogItem(item), [])
  const closeDialog = useCallback(() => setDialogItem(null), [])

  const handleSave = useCallback(async (data) => {
    if (data.id) {
      // Edit mode
      const { id, ...changes } = data
      const item = await updateItem(id, changes)
      setItems(prev => prev.map(i => i.id === id ? item : i))
    } else {
      // Create mode
      const item = await createItem(data)
      setItems(prev => [item, ...prev])
    }
    setDialogItem(null)
  }, [])

  const handleUpdateItem = useCallback(async (id, changes) => {
    const item = await updateItem(id, changes)
    setItems(prev => prev.map(i => i.id === id ? item : i))
  }, [])

  const handleDeleteItem = useCallback(async (id) => {
    await deleteItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const handleCreateFolder = useCallback(async (name, parentId) => {
    const folder = await createFolder(name, parentId)
    setFolders(prev => [...prev, folder])
  }, [])

  const handleRenameFolder = useCallback(async (id, name) => {
    const folder = await renameFolder(id, name)
    setFolders(prev => prev.map(f => f.id === id ? folder : f))
  }, [])

  const handleDeleteFolder = useCallback(async (id) => {
    await deleteFolder(id)
    setFolders(prev => prev.filter(f => f.id !== id))
    setItems(prev => prev.map(i => i.folderId === id ? { ...i, folderId: null } : i))
    if (selectedFolder === id) setSelectedFolder('inbox')
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

  return (
    <TooltipProvider>
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
      </div>
    </TooltipProvider>
  )
}
