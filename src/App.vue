<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { 
  Settings, 
  Plus, 
  MoreVertical,
  Trash2,
  ArrowLeft,
  Download, 
  Upload, 
  ShieldCheck,
  Search,
  Command,
  Layout,
  Minus,
  Square,
  X as CloseIcon
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { VisuallyHidden } from 'reka-ui'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import BoardView from '@/components/BoardView.vue'

const store = useTodoStore()
const { addProject, updateProject, addBoard, updateBoard } = store

type View = 'projects' | 'project-detail' | 'board-detail'

const currentView = ref<View>('projects')
const selectedProjectId = ref<string | null>(null)
const selectedBoardId = ref<string | null>(null)

// Sidebar state
const isSidebarHovered = ref(false)
const hoveredProjectId = ref<string | null>(null)

// Settings state
const isSettingsOpen = ref(false)
const importFileRef = ref<HTMLInputElement | null>(null)

// Search state
const isSearchOpen = ref(false)
const searchQuery = ref('')

// Responsive state
const isScreenTooSmall = ref(false)
const checkScreenSize = () => {
  isScreenTooSmall.value = window.innerWidth < 1024 || window.innerHeight < 600
}

const searchResults = computed(() => {
  if (!searchQuery.value) return []
  const query = searchQuery.value.toLowerCase()
  const results: any[] = []
  store.projects.forEach(project => {
    if (project.title.toLowerCase().includes(query)) results.push({ type: 'project', id: project.id, title: project.title, parent: 'Projekt' })
    store.getBoardsByProject(project.id).forEach(board => {
      if (board.title.toLowerCase().includes(query)) results.push({ type: 'board', id: board.id, title: board.title, parent: `Projekt: ${project.title}` })
      board.columns.forEach(column => {
        column.cards.forEach(card => {
          if (card.title.toLowerCase().includes(query) || (card.description && card.description.toLowerCase().includes(query))) {
            results.push({ type: 'card', id: card.id, boardId: board.id, title: card.title, parent: `Board: ${board.title}` })
          }
        })
      })
    })
  })
  return results.slice(0, 10)
})

const navigateToResult = (result: any) => {
  if (result.type === 'project') navigateToProject(result.id)
  else if (result.type === 'board') navigateToBoard(result.id)
  else if (result.type === 'card') navigateToBoard(result.boardId)
  isSearchOpen.value = false
  searchQuery.value = ''
}

// Forms
const newProjectTitle = ref('')
const newProjectDescription = ref('')
const isProjectDialogOpen = ref(false)
const editingProjectId = ref<string | null>(null)
const editingBoardId = ref<string | null>(null)
const newBoardTitle = ref('')
const isBoardDialogOpen = ref(false)

const currentProject = computed(() => store.projects.find(p => p.id === selectedProjectId.value))
const currentBoard = computed(() => store.boards.find(b => b.id === selectedBoardId.value))
const projectBoards = computed(() => selectedProjectId.value ? store.getBoardsByProject(selectedProjectId.value) : [])

const handleAddProject = () => {
  if (!newProjectTitle.value) return
  if (editingProjectId.value) updateProject(editingProjectId.value, { title: newProjectTitle.value, description: newProjectDescription.value })
  else addProject(newProjectTitle.value, newProjectDescription.value)
  newProjectTitle.value = ''; newProjectDescription.value = ''; isProjectDialogOpen.value = false; editingProjectId.value = null
}

const openEditProject = (project: any) => {
  newProjectTitle.value = project.title; newProjectDescription.value = project.description || ''; editingProjectId.value = project.id; isProjectDialogOpen.value = true
}

const openNewProject = () => {
  newProjectTitle.value = ''; newProjectDescription.value = ''; editingProjectId.value = null; isProjectDialogOpen.value = true
}

const handleAddBoard = () => {
  if (!newBoardTitle.value || !selectedProjectId.value) return
  if (editingBoardId.value) updateBoard(editingBoardId.value, newBoardTitle.value)
  else addBoard(selectedProjectId.value, newBoardTitle.value)
  newBoardTitle.value = ''; isBoardDialogOpen.value = false; editingBoardId.value = null
}

const openEditBoard = (board: any) => {
  newBoardTitle.value = board.title; editingBoardId.value = board.id; isBoardDialogOpen.value = true
}

const openNewBoard = () => {
  newBoardTitle.value = ''; editingBoardId.value = null; isBoardDialogOpen.value = true
}

const navigateToProject = (id: string) => {
  selectedProjectId.value = id; currentView.value = 'project-detail'
}

const navigateToBoard = (id: string) => {
  selectedBoardId.value = id; currentView.value = 'board-detail'
  const board = store.boards.find(b => b.id === id)
  if (board) selectedProjectId.value = board.projectId
}

const goBack = () => {
  if (currentView.value === 'board-detail') {
    currentView.value = 'project-detail'
    selectedBoardId.value = null
  } else if (currentView.value === 'project-detail') {
    currentView.value = 'projects'
    selectedProjectId.value = null
  }
}

const handleExport = () => {
  const data = { projects: store.projects, boards: store.boards }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `todo-pro-backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url)
}

const handleImport = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string; const data = JSON.parse(content)
      if (data.projects && data.boards) { store.importData(data); isSettingsOpen.value = false; alert('Daten erfolgreich importiert!') }
    } catch (err) { console.error(err) }
  }
  reader.readAsText(file)
}

const triggerImport = () => importFileRef.value?.click()

// Window Controls
const minimizeWindow = () => {
  const electron = (window as any).require ? (window as any).require('electron') : null
  if (electron) electron.ipcRenderer.send('window-minimize')
}
const maximizeWindow = () => {
  const electron = (window as any).require ? (window as any).require('electron') : null
  if (electron) electron.ipcRenderer.send('window-maximize')
}
const closeWindow = () => {
  const electron = (window as any).require ? (window as any).require('electron') : null
  if (electron) electron.ipcRenderer.send('window-close')
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  const handleKeyDown = (e: KeyboardEvent) => {
    const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
    if (isInput) return
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); isSearchOpen.value = true; return }
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); if (currentView.value === 'projects') openNewProject(); if (currentView.value === 'project-detail') openNewBoard() }
    if (e.key === 'Backspace' || e.key === 'Escape') { if (!isProjectDialogOpen.value && !isBoardDialogOpen.value && !isSearchOpen.value && !isSettingsOpen.value) goBack() }
  }
  window.addEventListener('keydown', handleKeyDown)
  onUnmounted(() => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('resize', checkScreenSize) })
})

const getFirstLetter = (title: string) => title.charAt(0).toUpperCase()

const vFocus = { mounted: (el: HTMLElement) => { const input = el.tagName === 'INPUT' ? el : el.querySelector('input'); input?.focus() } }
</script>

<template>
  <div class="flex h-screen bg-black overflow-hidden text-white font-sans selection:bg-white selection:text-black">
    
    <!-- Sidebar -->
    <aside 
      class="h-full flex flex-col border-r border-white/10 bg-white/[0.02] backdrop-blur-3xl transition-all duration-500 ease-in-out z-50 shrink-0 relative shadow-[10px_0_30px_rgba(0,0,0,0.5)]"
      :class="[isSidebarHovered ? 'w-60' : 'w-16']"
      @mouseenter="isSidebarHovered = true"
      @mouseleave="isSidebarHovered = false; hoveredProjectId = null"
    >
      <!-- Logo: Aligned with Header -->
      <div 
        class="h-16 border-b border-white/10 flex flex-col items-center justify-center cursor-pointer no-drag group/logo shrink-0"
        @click="currentView = 'projects'; selectedProjectId = null; selectedBoardId = null"
      >
        <div class="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-black text-xs shadow-[0_0_20px_rgba(255,255,255,0.2)] group-hover/logo:scale-110 transition-all duration-500">
          TD
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex-1 flex flex-col min-h-0 pt-4">
        <!-- Search -->
        <div class="px-3 mb-4">
          <button 
            @click="isSearchOpen = true"
            class="w-full flex items-center h-10 rounded-xl transition-all duration-300"
            :class="isSidebarHovered ? 'px-3 bg-white/5 hover:bg-white/10' : 'justify-center hover:bg-white/5'"
          >
            <Search class="w-4 h-4 shrink-0 text-white/40" />
            <span v-if="isSidebarHovered" class="ml-3 text-xs font-bold text-white/60">Suche</span>
          </button>
        </div>

        <ScrollArea class="flex-1 px-3">
          <div class="space-y-6">
            <div class="space-y-2">
              <div v-if="isSidebarHovered" class="px-3 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">Projekte</div>
              
              <div 
                v-for="project in store.projects" 
                :key="project.id"
                class="space-y-1"
                @mouseenter="hoveredProjectId = project.id"
                @mouseleave="hoveredProjectId = null"
              >
                <button 
                  @click="navigateToProject(project.id)"
                  class="w-full flex items-center h-10 rounded-xl transition-all duration-300 relative group/item"
                  :class="[
                    selectedProjectId === project.id 
                      ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                      : 'text-white/40 hover:text-white hover:bg-white/5',
                    !isSidebarHovered && 'justify-center'
                  ]"
                >
                  <div class="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 transition-colors" :class="selectedProjectId === project.id ? 'bg-black/10' : 'bg-white/5 border border-white/5'">
                    {{ getFirstLetter(project.title) }}
                  </div>
                  <span v-if="isSidebarHovered" class="ml-3 text-xs font-bold truncate tracking-tight uppercase">{{ project.title }}</span>
                </button>

                <!-- Boards on Hover -->
                <div 
                  v-if="isSidebarHovered"
                  class="overflow-hidden transition-all duration-500 ease-in-out pl-8 space-y-1"
                  :style="{ 
                    maxHeight: hoveredProjectId === project.id ? (store.getBoardsByProject(project.id).length * 32 + 40) + 'px' : '0px',
                    opacity: hoveredProjectId === project.id ? '1' : '0',
                    marginTop: hoveredProjectId === project.id ? '4px' : '0px'
                  }"
                >
                  <button 
                    v-for="board in store.getBoardsByProject(project.id)" 
                    :key="board.id"
                    @click.stop="navigateToBoard(board.id)"
                    class="w-full flex items-center h-8 px-2 rounded-lg text-[10px] font-bold uppercase tracking-tight text-white/30 hover:text-white hover:bg-white/5 transition-all text-left"
                    :class="selectedBoardId === board.id && 'text-white bg-white/5'"
                  >
                    <Layout class="w-3 h-3 mr-2 opacity-20" /> {{ board.title }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <!-- Settings -->
      <div class="p-3 border-t border-white/10">
        <button 
          @click="isSettingsOpen = true"
          class="w-full flex items-center h-10 rounded-xl transition-all duration-300"
          :class="isSidebarHovered ? 'px-3 bg-white/5 hover:bg-white/10' : 'justify-center hover:bg-white/5'"
        >
          <Settings class="w-4 h-4 text-white/40" />
          <span v-if="isSidebarHovered" class="ml-3 text-xs font-bold text-white/60 uppercase tracking-widest">Settings</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 bg-black relative">
      
      <!-- HEADER -->
      <header class="h-16 flex items-center justify-between px-8 border-b border-white/10 relative z-40 bg-black/50 backdrop-blur-md">
        <!-- Draggable Zone (Behind Everything) -->
        <div class="absolute inset-0 drag-region"></div>

        <!-- Left: Nav & Title -->
        <div class="flex items-center gap-6 no-drag relative z-50">
          <Button 
            v-if="currentView !== 'projects'" 
            variant="ghost" 
            size="icon" 
            class="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
            @click="goBack"
          >
            <ArrowLeft class="w-4 h-4 text-white" />
          </Button>
          
          <div class="flex items-center gap-4">
            <h2 class="text-xl font-black italic uppercase tracking-tighter text-white">
              <template v-if="currentView === 'projects'">Dashboard</template>
              <template v-else-if="currentView === 'project-detail'">{{ currentProject?.title }}</template>
              <template v-else-if="currentView === 'board-detail'">{{ currentBoard?.title }}</template>
            </h2>
            
            <!-- Quick Add -->
            <button 
              v-if="currentView !== 'board-detail'"
              @click="currentView === 'projects' ? openNewProject() : openNewBoard()"
              class="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Right: Window Controls -->
        <div class="flex items-center gap-1 no-drag relative z-50">
          <button @click="minimizeWindow" class="w-9 h-9 flex items-center justify-center hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all">
            <Minus class="w-4 h-4" />
          </button>
          <button @click="maximizeWindow" class="w-9 h-9 flex items-center justify-center hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all">
            <Square class="w-3.5 h-3.5" />
          </button>
          <button @click="closeWindow" class="w-9 h-9 flex items-center justify-center hover:bg-red-500/10 rounded-lg text-white/20 hover:text-red-500 transition-all">
            <CloseIcon class="w-4 h-4" />
          </button>
        </div>
      </header>

      <!-- VIEW CONTENT -->
      <main class="flex-1 relative overflow-hidden flex flex-col">
        <div class="flex-1 relative overflow-hidden" :class="currentView !== 'board-detail' && 'overflow-auto p-10'">
          
          <!-- Dashboard View -->
          <div v-if="currentView === 'projects'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div v-for="project in store.projects" :key="project.id" class="relative group cursor-pointer high-tech-hover" @click="navigateToProject(project.id)">
              <div class="absolute inset-0 bg-white/[0.03] border border-white/10 rounded-3xl transition-all duration-500 group-hover:bg-white/[0.06] group-hover:border-white/40 group-hover:shadow-[0_20px_50px_rgba(255,255,255,0.05)]"></div>
              <div class="absolute inset-0 tech-grid opacity-10 rounded-3xl"></div>
              <div class="relative p-6 space-y-5">
                <div class="flex justify-between items-start">
                  <div class="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-all duration-500 italic">
                    {{ getFirstLetter(project.title) }}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child @click.stop><Button variant="ghost" size="icon" class="h-8 w-8 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical class="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="bg-black/95 backdrop-blur-xl border-white/10 text-white p-2">
                      <DropdownMenuItem @click="openEditProject(project)" class="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-md font-bold text-[10px] uppercase">Bearbeiten</DropdownMenuItem>
                      <DropdownMenuItem class="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer rounded-md font-bold text-[10px] uppercase" @click="store.deleteProject(project.id)">Löschen</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div class="space-y-1">
                  <h3 class="text-xl font-black tracking-tighter uppercase italic text-white/90 group-hover:text-white transition-colors line-clamp-1">{{ project.title }}</h3>
                  <p v-if="project.description" class="text-white/20 text-[10px] line-clamp-2 leading-relaxed font-medium tracking-tight">{{ project.description }}</p>
                </div>
              </div>
              <div class="bracket bracket-tl"></div><div class="bracket bracket-tr"></div><div class="bracket bracket-bl"></div><div class="bracket bracket-br"></div>
            </div>
          </div>

          <!-- Project Detail View -->
          <div v-else-if="currentView === 'project-detail'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div v-for="board in projectBoards" :key="board.id" class="relative group cursor-pointer high-tech-hover" @click="navigateToBoard(board.id)">
              <div class="absolute inset-0 bg-white/[0.03] border border-white/10 rounded-3xl transition-all duration-500 group-hover:bg-white/[0.06] group-hover:border-white/40"></div>
              <div class="absolute inset-0 tech-grid opacity-10 rounded-3xl"></div>
              <div class="relative p-6 space-y-6">
                <div class="flex justify-between items-start">
                  <div class="relative">
                    <div class="absolute inset-0 rounded-full border border-white animate-status-pulse" :style="{ '--pulse-speed': (board.columns.reduce((acc, col) => acc + col.cards.length, 0) > 10 ? '1s' : '3s') }"></div>
                    <div class="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-black text-[8px] z-10 relative shadow-[0_0_20px_rgba(255,255,255,0.3)] uppercase">Node</div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child @click.stop><Button variant="ghost" size="icon" class="h-8 w-8 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity text-white/40"><MoreVertical class="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="bg-black/95 backdrop-blur-xl border-white/10 text-white p-2">
                      <DropdownMenuItem @click="openEditBoard(board)" class="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-md font-bold text-[10px] uppercase">Bearbeiten</DropdownMenuItem>
                      <DropdownMenuItem class="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer rounded-md font-bold text-[10px] uppercase" @click="store.deleteBoard(board.id)">Löschen</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 class="text-xl font-black tracking-tighter uppercase italic text-white/90 group-hover:text-white transition-colors">{{ board.title }}</h3>
                <div class="space-y-3">
                  <div class="flex h-1.5 gap-1 rounded-full overflow-hidden bg-white/5 p-0.5 border border-white/5">
                    <div v-for="(column, idx) in board.columns" :key="column.id" class="h-full transition-all duration-1000 ease-out" :class="[idx % 3 === 0 ? 'bg-white/40' : (idx % 3 === 1 ? 'bg-white/20' : 'bg-white/10'), column.cards.length === 0 && 'hidden']" :style="{ width: (column.cards.length / Math.max(1, board.columns.reduce((acc, c) => acc + c.cards.length, 0)) * 100) + '%' }"></div>
                  </div>
                  <div class="flex items-center justify-between text-[8px] font-black text-white/20 uppercase tracking-widest italic"><span>Diagnostic_Link</span><span>Total: {{ board.columns.reduce((acc, col) => acc + col.cards.length, 0) }}</span></div>
                </div>
              </div>
              <div class="bracket bracket-tl"></div><div class="bracket bracket-tr"></div><div class="bracket bracket-bl"></div><div class="bracket bracket-br"></div>
            </div>
          </div>

          <!-- Board Detail View -->
          <BoardView v-else-if="currentView === 'board-detail' && selectedBoardId" :board-id="selectedBoardId" :key="selectedBoardId" />
        </div>
      </main>
    </div>

    <!-- Modals -->
    <Dialog v-model:open="isSearchOpen">
      <DialogContent class="max-w-2xl bg-black/95 backdrop-blur-3xl border border-white/30 text-white p-0 overflow-hidden top-[20%] translate-y-0 shadow-[0_0_100px_rgba(0,0,0,1)]">
        <VisuallyHidden><DialogTitle>Globale Suche</DialogTitle><DialogDescription>Suche nach Projekten, Boards oder Karten</DialogDescription></VisuallyHidden>
        <div class="p-4 border-b border-white/20 flex items-center gap-3"><Search class="w-5 h-5 text-white/40" /><input v-model="searchQuery" v-focus placeholder="Suche nach Projekten, Boards oder Karten..." class="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder:text-white/30" /></div>
        <ScrollArea class="max-h-[400px]">
          <div v-if="searchQuery && searchResults.length > 0" class="p-2"><button v-for="result in searchResults" :key="result.id" class="w-full p-3 rounded-xl flex flex-col items-start gap-1 hover:bg-white/5 transition-all text-left group" @click="navigateToResult(result)"><div class="flex items-center justify-between w-full"><span class="text-sm font-bold text-white/80 group-hover:text-white">{{ result.title }}</span><span class="text-[10px] font-black uppercase tracking-widest text-white/10">{{ result.type }}</span></div><span class="text-[10px] text-white/30 uppercase font-medium">{{ result.parent }}</span></button></div>
          <div v-else-if="searchQuery" class="p-12 text-center"><p class="text-white/20 text-sm font-medium italic">Keine Ergebnisse für "{{ searchQuery }}" gefunden.</p></div>
          <div v-else class="p-12 text-center"><p class="text-white/20 text-sm font-medium">Tippe etwas ein, um die globale Suche zu starten.</p></div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="isProjectDialogOpen">
      <DialogContent class="bg-black/95 backdrop-blur-3xl border border-white/20 text-white rounded-[2rem] p-10">
        <DialogHeader class="space-y-4">
          <DialogTitle class="text-3xl font-black italic uppercase tracking-tighter">{{ editingProjectId ? 'Projekt bearbeiten' : 'Neues Projekt' }}</DialogTitle>
          <DialogDescription class="text-white/30 uppercase text-[10px] font-bold tracking-[0.3em]">System_Initialization_Protocol</DialogDescription>
        </DialogHeader>
        <div class="space-y-6 py-8">
          <div class="space-y-2"><label class="text-[9px] font-black text-white/20 uppercase tracking-widest">Titel_Ident</label><Input v-model="newProjectTitle" v-focus placeholder="Projektname..." class="bg-white/5 border-white/10 h-12 text-lg font-bold italic uppercase" /></div>
          <div class="space-y-2"><label class="text-[9px] font-black text-white/20 uppercase tracking-widest">Description_Log</label><Input v-model="newProjectDescription" placeholder="Kurze Info..." class="bg-white/5 border-white/10 h-12 text-sm font-medium" /></div>
        </div>
        <DialogFooter><Button class="bg-white text-black hover:bg-white/90 w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs" @click="handleAddProject">{{ editingProjectId ? 'Commit_Changes' : 'Initialize_Project' }}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="isBoardDialogOpen">
      <DialogContent class="bg-black/95 backdrop-blur-3xl border border-white/20 text-white rounded-[2rem] p-10">
        <DialogHeader class="space-y-4">
          <DialogTitle class="text-3xl font-black italic uppercase tracking-tighter">{{ editingBoardId ? 'Board bearbeiten' : 'Neues Board' }}</DialogTitle>
          <DialogDescription class="text-white/30 uppercase text-[10px] font-bold tracking-[0.3em]">Node_Sync_Protocol</DialogDescription>
        </DialogHeader>
        <div class="space-y-6 py-8"><div class="space-y-2"><label class="text-[9px] font-black text-white/20 uppercase tracking-widest">Node_Name</label><Input v-model="newBoardTitle" v-focus placeholder="Name..." class="bg-white/5 border-white/10 h-14 text-xl font-black italic uppercase" /></div></div>
        <DialogFooter><Button class="bg-white text-black hover:bg-white/90 w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs" @click="handleAddBoard">{{ editingBoardId ? 'Commit_Changes' : 'Sync_Node' }}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Fullscreen Warning Overlay -->
    <div v-if="isScreenTooSmall" class="fixed inset-0 z-[10000] bg-black backdrop-blur-3xl flex flex-col items-center justify-center p-10 text-center space-y-6 animate-in fade-in duration-500">
      <div class="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.1)]"><Layout class="w-10 h-10 text-white/40 animate-pulse" /></div>
      <div class="space-y-2"><h2 class="text-2xl font-black italic uppercase tracking-tighter">System_Resolution_Low</h2><p class="text-sm text-white/40 font-mono max-w-xs mx-auto">Das Interface benötigt eine höhere Auflösung. Bitte vergrößere das Fenster, um fortzufahren.</p></div>
      <div class="pt-4 flex items-center gap-4"><div class="text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">Min_Width: 1024px</div><div class="w-1 h-1 rounded-full bg-white/10"></div><div class="text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">Min_Height: 600px</div></div>
    </div>
  </div>
</template>

<style>
/* Electron Drag Region */
.drag-region { -webkit-app-region: drag; }
.no-drag { -webkit-app-region: no-drag; }

html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #000;
  color: #fff;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  overflow: hidden;
}

/* Transitions for Layout */
.w-60, .w-16 { transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); }

/* Custom Scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }

h2, h1 { user-select: none; }
</style>
