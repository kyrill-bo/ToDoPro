<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
  ChevronRight,
  Layout
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

const searchResults = computed(() => {
  if (!searchQuery.value) return []
  const query = searchQuery.value.toLowerCase()
  const results: any[] = []

  store.projects.forEach(project => {
    if (project.title.toLowerCase().includes(query)) {
      results.push({ type: 'project', id: project.id, title: project.title, parent: 'Projekt' })
    }
    store.getBoardsByProject(project.id).forEach(board => {
      if (board.title.toLowerCase().includes(query)) {
        results.push({ type: 'board', id: board.id, title: board.title, parent: `Projekt: ${project.title}` })
      }
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
  if (result.type === 'project') {
    navigateToProject(result.id)
  } else if (result.type === 'board') {
    navigateToBoard(result.id)
  } else if (result.type === 'card') {
    navigateToBoard(result.boardId)
  }
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

const currentProject = computed(() => {
  return store.projects.find(p => p.id === selectedProjectId.value)
})

const currentBoard = computed(() => {
  return store.boards.find(b => b.id === selectedBoardId.value)
})

const projectBoards = computed(() => {
  if (!selectedProjectId.value) return []
  return store.getBoardsByProject(selectedProjectId.value)
})

const handleAddProject = () => {
  if (!newProjectTitle.value) return
  if (editingProjectId.value) {
    updateProject(editingProjectId.value, { 
      title: newProjectTitle.value, 
      description: newProjectDescription.value 
    })
  } else {
    addProject(newProjectTitle.value, newProjectDescription.value)
  }
  newProjectTitle.value = ''
  newProjectDescription.value = ''
  isProjectDialogOpen.value = false
  editingProjectId.value = null
}

const openEditProject = (project: any) => {
  newProjectTitle.value = project.title
  newProjectDescription.value = project.description || ''
  editingProjectId.value = project.id
  isProjectDialogOpen.value = true
}

const openNewProject = () => {
  newProjectTitle.value = ''
  newProjectDescription.value = ''
  editingProjectId.value = null
  isProjectDialogOpen.value = false // Dialog is managed by trigger usually but we clean state
  isProjectDialogOpen.value = true
}

const handleAddBoard = () => {
  if (!newBoardTitle.value || !selectedProjectId.value) return
  if (editingBoardId.value) {
    updateBoard(editingBoardId.value, newBoardTitle.value)
  } else {
    addBoard(selectedProjectId.value, newBoardTitle.value)
  }
  newBoardTitle.value = ''
  isBoardDialogOpen.value = false
  editingBoardId.value = null
}

const openEditBoard = (board: any) => {
  newBoardTitle.value = board.title
  editingBoardId.value = board.id
  isBoardDialogOpen.value = true
}

const openNewBoard = () => {
  newBoardTitle.value = ''
  editingBoardId.value = null
  isBoardDialogOpen.value = true
}

const navigateToProject = (id: string) => {
  selectedProjectId.value = id
  currentView.value = 'project-detail'
}

const navigateToBoard = (id: string) => {
  selectedBoardId.value = id
  currentView.value = 'board-detail'
  // Auto-select project when navigating to board
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
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `todo-pro-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const handleImport = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const data = JSON.parse(content)
      if (data.projects && data.boards) {
        store.importData(data)
        isSettingsOpen.value = false
        alert('Daten erfolgreich importiert!')
      }
    } catch (err) { console.error(err) }
  }
  reader.readAsText(file)
}

const triggerImport = () => {
  importFileRef.value?.click()
}

onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      isSearchOpen.value = true
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })
})

const getFirstLetter = (title: string) => {
  return title.charAt(0).toUpperCase()
}

const vFocus = {
  mounted: (el: HTMLElement) => {
    const input = el.tagName === 'INPUT' ? el : el.querySelector('input')
    input?.focus()
  }
}
</script>

<template>
  <div class="flex h-screen bg-black overflow-hidden text-white">
    <!-- Window Drag Handle (for Electron) -->
    <div class="fixed top-0 left-0 right-0 h-10 z-[100] pointer-events-none">
      <div class="w-full h-full pointer-events-auto drag-region"></div>
    </div>

    <!-- Sidebar -->
    <aside 
      class="fixed left-0 top-0 bottom-0 z-50 flex flex-col border-r border-white/5 bg-white/[0.02] backdrop-blur-3xl transition-all duration-500 ease-in-out group shadow-[20px_0_50px_rgba(0,0,0,0.5)]"
      :class="[isSidebarHovered ? 'w-64' : 'w-16']"
      @mouseenter="isSidebarHovered = true"
      @mouseleave="isSidebarHovered = false; hoveredProjectId = null"
    >
      <!-- Logo Area -->
      <div 
        class="pt-12 pb-6 px-4 flex items-center overflow-hidden cursor-pointer group/logo no-drag"
        @click="currentView = 'projects'; selectedProjectId = null; selectedBoardId = null"
      >
        <div class="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-black text-sm flex-shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.3)] group-hover/logo:scale-110 transition-transform">
          TD
        </div>
        <h1 
          class="ml-3 text-xl font-bold tracking-tighter transition-all duration-300 whitespace-nowrap"
          :class="isSidebarHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'"
        >
          ToDo<span class="text-white/40">Pro</span>
        </h1>
      </div>
      
      <!-- Search Button -->
      <div class="px-3 mb-2">
        <button 
          class="w-full flex items-center h-10 px-2 rounded-lg text-white/20 hover:text-white hover:bg-white/5 transition-all no-drag group/search"
          @click="isSearchOpen = true"
        >
          <Search class="w-5 h-5 flex-shrink-0" />
          <div class="ml-3 flex-1 flex items-center justify-between transition-all duration-300" :class="isSidebarHovered ? 'opacity-100' : 'opacity-0'">
            <span class="text-sm font-medium">Suche</span>
            <div class="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[9px] font-bold">
              <Command class="w-2.5 h-2.5" /> K
            </div>
          </div>
        </button>
      </div>

      <ScrollArea class="flex-1 px-3 mt-2">
        <div class="space-y-6">
          <div>
            <div class="flex items-center justify-between mb-4 px-1 h-6">
              <h2 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] transition-opacity duration-300" :class="isSidebarHovered ? 'opacity-100' : 'opacity-0'">Projekte</h2>
              <Dialog v-model:open="isProjectDialogOpen">
                <DialogTrigger as-child>
                  <Button variant="ghost" size="icon" class="h-6 w-6 no-drag hover:bg-white/10 transition-transform" :class="!isSidebarHovered && 'translate-x-[-2px] scale-110'" @click="openNewProject">
                    <Plus class="w-4 h-4 text-white/40" />
                  </Button>
                </DialogTrigger>
                <DialogContent class="bg-black/90 backdrop-blur-2xl border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle>{{ editingProjectId ? 'Projekt bearbeiten' : 'Neues Projekt' }}</DialogTitle>
                    <DialogDescription class="text-white/40">Verwalte deine Aufgaben mit Stil.</DialogDescription>
                  </DialogHeader>
                  <div class="space-y-4 py-4">
                    <div class="space-y-2">
                      <label class="text-xs font-semibold text-white/40">TITEL</label>
                      <Input v-model="newProjectTitle" v-focus placeholder="Projektname..." class="bg-white/5 border-white/10 h-11" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-xs font-semibold text-white/40">BESCHREIBUNG</label>
                      <Input v-model="newProjectDescription" placeholder="Kurze Info..." class="bg-white/5 border-white/10 h-11" />
                    </div>
                  </div>
                  <DialogFooter><Button class="bg-white text-black hover:bg-white/90 w-full" @click="handleAddProject">{{ editingProjectId ? 'Speichern' : 'Projekt erstellen' }}</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div class="space-y-1">
              <div 
                v-for="project in store.projects" 
                :key="project.id"
                class="relative"
                @mouseenter="hoveredProjectId = project.id"
                @mouseleave="hoveredProjectId = null"
              >
                <!-- Project Item -->
                <button 
                  class="w-full flex items-center group/item no-drag rounded-lg transition-all duration-300 h-10 px-2 relative z-10"
                  :class="[
                    selectedProjectId === project.id 
                      ? 'bg-white/10 text-white shadow-[inset_0_0_1px_rgba(255,255,255,0.2)]' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  ]"
                  @click="navigateToProject(project.id)"
                >
                  <div class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border border-white/10 flex-shrink-0 transition-colors" :class="selectedProjectId === project.id ? 'bg-white text-black' : 'bg-white/5'">
                    {{ getFirstLetter(project.title) }}
                  </div>
                  <span class="ml-3 text-sm font-medium truncate transition-all duration-300" :class="isSidebarHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'">
                    {{ project.title }}
                  </span>
                  <div v-if="selectedProjectId === project.id" class="absolute left-0 w-1 h-4 bg-white rounded-r-full"></div>
                </button>

                <!-- Animated Boards List (on Hover) -->
                <div 
                  class="overflow-hidden transition-all duration-500 ease-in-out pl-9 space-y-1"
                  :style="{ 
                    maxHeight: (hoveredProjectId === project.id && isSidebarHovered) ? (store.getBoardsByProject(project.id).length * 36 + 10) + 'px' : '0px',
                    opacity: (hoveredProjectId === project.id && isSidebarHovered) ? '1' : '0',
                    marginTop: (hoveredProjectId === project.id && isSidebarHovered) ? '4px' : '0px',
                    marginBottom: (hoveredProjectId === project.id && isSidebarHovered) ? '8px' : '0px'
                  }"
                >
                  <button 
                    v-for="board in store.getBoardsByProject(project.id)" 
                    :key="board.id"
                    class="w-full flex items-center h-8 px-2 rounded-md text-white/30 hover:text-white hover:bg-white/5 transition-all text-left group/board no-drag"
                    :class="selectedBoardId === board.id ? 'text-white bg-white/5' : ''"
                    @click.stop="navigateToBoard(board.id)"
                  >
                    <Layout class="w-3 h-3 mr-2 opacity-40 group-hover/board:opacity-100" />
                    <span class="text-xs font-medium truncate">{{ board.title }}</span>
                  </button>
                  
                  <button 
                    class="w-full flex items-center h-8 px-2 rounded-md text-white/10 hover:text-white/40 hover:bg-white/5 transition-all text-left no-drag border border-dashed border-white/5"
                    @click.stop="selectedProjectId = project.id; openNewBoard()"
                  >
                    <Plus class="w-3 h-3 mr-2" />
                    <span class="text-[10px] font-bold uppercase tracking-tighter">Neu</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      
      <div class="p-3 border-t border-white/5 flex flex-col gap-2">
        <Dialog v-model:open="isSettingsOpen">
          <DialogTrigger as-child>
            <button class="flex items-center h-10 px-2 rounded-lg text-white/20 hover:text-white hover:bg-white/5 transition-all no-drag group/settings w-full">
              <Settings class="w-5 h-5 flex-shrink-0" />
              <span class="ml-3 text-sm font-medium transition-all duration-300 whitespace-nowrap" :class="isSidebarHovered ? 'opacity-100' : 'opacity-0'">Einstellungen</span>
            </button>
          </DialogTrigger>
          <DialogContent class="bg-black/95 backdrop-blur-3xl border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle class="text-xl font-black italic uppercase italic tracking-tighter">Einstellungen</DialogTitle>
              <DialogDescription class="text-white/30">Verwalte deine App-Daten und Präferenzen.</DialogDescription>
            </DialogHeader>
            <div class="space-y-6 py-6">
              <div class="space-y-4">
                <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Daten-Verwaltung</h3>
                <div class="grid grid-cols-1 gap-3">
                  <Button variant="outline" class="justify-start gap-3 bg-white/5 border-white/10 hover:bg-white/10 text-white h-12 no-drag" @click="handleExport"><Download class="w-4 h-4 text-white/40" /><div class="text-left"><div class="text-sm font-bold">Daten exportieren</div><div class="text-[10px] text-white/30 uppercase font-medium">Backup als JSON speichern</div></div></Button>
                  <div class="relative"><input type="file" ref="importFileRef" class="hidden" accept=".json" @change="handleImport" /><Button variant="outline" class="w-full justify-start gap-3 bg-white/5 border-white/10 hover:bg-white/10 text-white h-12 no-drag" @click="triggerImport"><Upload class="w-4 h-4 text-white/40" /><div class="text-left"><div class="text-sm font-bold">Daten importieren</div><div class="text-[10px] text-white/30 uppercase font-medium">Aus JSON-Datei wiederherstellen</div></div></Button></div>
                </div>
              </div>
              <div class="space-y-2">
                <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">System</h3>
                <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div class="flex items-center gap-3"><ShieldCheck class="w-5 h-5 text-green-500/50" /><div class="text-[10px] font-black text-white/60 uppercase tracking-wider">Status: Online / Local</div></div>
                  <span class="text-[10px] font-black text-white/20 italic">v1.0.0</span>
                </div>
              </div>
            </div>
            <DialogFooter><Button class="bg-white text-black hover:bg-white/90 font-black px-8 rounded-full w-full" @click="isSettingsOpen = false">FERTIG</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-in-out" :class="[isSidebarHovered ? 'pl-64' : 'pl-16']">
      <!-- Header -->
      <header class="h-20 border-b border-white/5 flex items-end pb-4 justify-between px-8 bg-black relative">
        <div class="absolute inset-0 drag-region pointer-events-none"></div>
        <div class="flex items-center gap-6 relative z-10 no-drag">
          <Button v-if="currentView !== 'projects'" variant="ghost" size="icon" class="hover:bg-white/5 rounded-full" @click="goBack"><ArrowLeft class="w-5 h-5" /></Button>
          <div><h2 class="text-2xl font-black tracking-tighter uppercase italic"><template v-if="currentView === 'projects'">Dashboard</template><template v-else-if="currentView === 'project-detail'">{{ currentProject?.title }}</template><template v-else-if="currentView === 'board-detail'">{{ currentBoard?.title }}</template></h2></div>
        </div>
        <div v-if="currentView === 'project-detail'" class="relative z-10 no-drag">
          <Dialog v-model:open="isBoardDialogOpen">
            <DialogTrigger as-child><Button class="gap-2 bg-white text-black hover:bg-white/90 font-bold rounded-full px-6" @click="openNewBoard"><Plus class="w-4 h-4" />NEUES BOARD</Button></DialogTrigger>
            <DialogContent class="bg-black/90 backdrop-blur-2xl border-white/10 text-white"><DialogHeader><DialogTitle>{{ editingBoardId ? 'BOARD BEARBEITEN' : 'BOARD ERSTELLEN' }}</DialogTitle></DialogHeader><div class="space-y-4 py-4"><Input v-model="newBoardTitle" v-focus placeholder="Name..." class="bg-white/5 border-white/10 h-12" /></div><DialogFooter><Button class="bg-white text-black hover:bg-white/90 w-full" @click="handleAddBoard">{{ editingBoardId ? 'SPEICHERN' : 'ERSTELLEN' }}</Button></DialogFooter></DialogContent>
          </Dialog>
        </div>
      </header>

      <!-- View Container -->
      <div class="flex-1 relative overflow-hidden" :class="currentView !== 'board-detail' && 'overflow-auto p-8'">
        <!-- Projects View -->
        <div v-if="currentView === 'projects'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card v-for="project in store.projects" :key="project.id" class="hover:shadow-[0_20px_50px_rgba(255,255,255,0.05)] transition-all cursor-pointer bg-white/[0.03] border-white/5 backdrop-blur-md hover:bg-white/[0.06] hover:scale-[1.02] group border-t-0" @click="navigateToProject(project.id)"><CardHeader class="pb-4"><div class="flex justify-between items-start mb-2"><div class="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-lg">{{ getFirstLetter(project.title) }}</div><DropdownMenu><DropdownMenuTrigger as-child @click.stop><Button variant="ghost" size="icon" class="h-8 w-8 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical class="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" class="bg-black/95 backdrop-blur-xl border-white/10 text-white p-2"><DropdownMenuItem @click="openEditProject(project)" class="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-md"><Settings class="w-4 h-4 mr-2 text-white/40" />Bearbeiten</DropdownMenuItem><DropdownMenuItem class="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer rounded-md" @click="store.deleteProject(project.id)"><Trash2 class="w-4 h-4 mr-2" />Löschen</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><CardTitle class="text-xl font-black tracking-tight uppercase italic text-white">{{ project.title }}</CardTitle><CardDescription v-if="project.description" class="text-white/30 text-xs mt-2 line-clamp-2 leading-relaxed">{{ project.description }}</CardDescription></CardHeader><CardContent><div class="text-[10px] font-black text-white/10 uppercase tracking-[0.2em] flex items-center gap-2">{{ store.getBoardsByProject(project.id).length }} Boards</div></CardContent></Card>
          <button class="h-auto aspect-square border-2 border-dashed border-white/5 bg-transparent hover:bg-white/[0.02] hover:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all group no-drag" @click="isProjectDialogOpen = true"><div class="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/20 group-hover:scale-110 transition-transform"><Plus class="w-6 h-6" /></div><span class="text-white/20 text-xs font-black tracking-[0.2em] uppercase">Neu</span></button>
        </div>

        <!-- Project Detail View (Boards List) -->
        <div v-else-if="currentView === 'project-detail'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card v-for="board in projectBoards" :key="board.id" class="hover:shadow-[0_20px_50px_rgba(255,255,255,0.05)] transition-all cursor-pointer aspect-video flex flex-col justify-center items-center relative group bg-white/[0.03] border-white/5 backdrop-blur-md hover:bg-white/[0.06] hover:scale-[1.02]" @click="navigateToBoard(board.id)"><div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"><DropdownMenu><DropdownMenuTrigger as-child @click.stop><Button variant="ghost" size="icon" class="h-8 w-8 hover:bg-white/10 text-white/40"><MoreVertical class="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" class="bg-black/95 backdrop-blur-xl border-white/10 text-white p-2"><DropdownMenuItem @click="openEditBoard(board)" class="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-md"><Settings class="w-4 h-4 mr-2 text-white/40" />Bearbeiten</DropdownMenuItem><DropdownMenuItem class="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer rounded-md" @click="store.deleteBoard(board.id)"><Trash2 class="w-4 h-4 mr-2" />Löschen</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><CardTitle class="text-xl font-black italic uppercase tracking-tighter text-white/80">{{ board.title }}</CardTitle></Card>
          <button class="aspect-video border-2 border-dashed border-white/5 bg-transparent hover:bg-white/[0.02] hover:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all group no-drag" @click="isBoardDialogOpen = true"><div class="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/20 group-hover:scale-110 transition-transform"><Plus class="w-5 h-5" /></div><span class="text-white/20 text-xs font-black tracking-[0.2em] uppercase">Board</span></button>
        </div>

        <!-- Board Detail View (Kanban) -->
        <BoardView v-else-if="currentView === 'board-detail' && selectedBoardId" :board-id="selectedBoardId" />
      </div>
    </main>

    <!-- Global Search Dialog -->
    <Dialog v-model:open="isSearchOpen">
      <DialogContent class="max-w-2xl bg-black/95 backdrop-blur-3xl border-white/10 text-white p-0 overflow-hidden top-[20%] translate-y-0">
        <VisuallyHidden><DialogTitle>Globale Suche</DialogTitle><DialogDescription>Suche nach Projekten, Boards oder Karten</DialogDescription></VisuallyHidden>
        <div class="p-4 border-b border-white/10 flex items-center gap-3"><Search class="w-5 h-5 text-white/20" /><input v-model="searchQuery" v-focus placeholder="Suche nach Projekten, Boards oder Karten..." class="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder:text-white/20" /></div>
        <ScrollArea class="max-h-[400px]">
          <div v-if="searchQuery && searchResults.length > 0" class="p-2"><button v-for="result in searchResults" :key="result.id" class="w-full p-3 rounded-xl flex flex-col items-start gap-1 hover:bg-white/5 transition-all text-left group" @click="navigateToResult(result)"><div class="flex items-center justify-between w-full"><span class="text-sm font-bold text-white/80 group-hover:text-white">{{ result.title }}</span><span class="text-[10px] font-black uppercase tracking-widest text-white/10">{{ result.type }}</span></div><span class="text-[10px] text-white/30 uppercase font-medium">{{ result.parent }}</span></button></div>
          <div v-else-if="searchQuery" class="p-12 text-center"><p class="text-white/20 text-sm font-medium italic">Keine Ergebnisse für "{{ searchQuery }}" gefunden.</p></div>
          <div v-else class="p-12 text-center"><p class="text-white/20 text-sm font-medium">Tippe etwas ein, um die globale Suche zu starten.</p></div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style>
/* Electron Drag Region */
.drag-region {
  -webkit-app-region: drag;
}

.no-drag {
  -webkit-app-region: no-drag;
}

html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #000;
  color: #fff;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Transitions for Layout */
.pl-64, .pl-16 {
  transition: padding-left 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* High-Tech Typography Fixes */
h2, h1 {
  user-select: none;
}
</style>
