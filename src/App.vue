<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTodoStore } from '@/stores/todo'
import { 
  Settings, 
  Plus, 
  MoreVertical,
  Trash2,
  ArrowLeft,
  Download,
  Upload,
  ShieldCheck
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
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

// Settings state
const isSettingsOpen = ref(false)
const importFileRef = ref<HTMLInputElement | null>(null)

// Forms
const newProjectTitle = ref('')
const newProjectDescription = ref('')
const isProjectDialogOpen = ref(false)
const editingProjectId = ref<string | null>(null)

const newBoardTitle = ref('')
const isBoardDialogOpen = ref(false)
const editingBoardId = ref<string | null>(null)

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
  const data = {
    projects: store.projects,
    boards: store.boards
  }
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
      } else {
        alert('Ungültiges Dateiformat.')
      }
    } catch (err) {
      console.error(err)
      alert('Fehler beim Lesen der Datei.')
    }
  }
  reader.readAsText(file)
}

const triggerImport = () => {
  importFileRef.value?.click()
}

const getFirstLetter = (title: string) => {
  return title.charAt(0).toUpperCase()
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
      class="fixed left-0 top-0 bottom-0 z-50 flex flex-col border-r border-white/5 bg-white/[0.02] backdrop-blur-3xl transition-all duration-500 ease-in-out group"
      :class="[isSidebarHovered ? 'w-64' : 'w-16']"
      @mouseenter="isSidebarHovered = true"
      @mouseleave="isSidebarHovered = false"
    >
      <!-- Logo Area: Shifted down for Window Controls -->
      <div class="pt-12 pb-6 px-4 flex items-center overflow-hidden">
        <div class="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-black text-sm flex-shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          TD
        </div>
        <h1 
          class="ml-3 text-xl font-bold tracking-tighter transition-all duration-300 whitespace-nowrap"
          :class="isSidebarHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'"
        >
          ToDo<span class="text-white/40">Pro</span>
        </h1>
      </div>
      
      <ScrollArea class="flex-1 px-3 mt-4">
        <div class="space-y-6">
          <div>
            <div class="flex items-center justify-between mb-4 px-1 h-6">
              <h2 
                class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] transition-opacity duration-300"
                :class="isSidebarHovered ? 'opacity-100' : 'opacity-0'"
              >
                Projekte
              </h2>
              <Dialog v-model:open="isProjectDialogOpen">
                <DialogTrigger as-child>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-6 w-6 no-drag hover:bg-white/10 transition-transform"
                    :class="!isSidebarHovered && 'translate-x-[-2px] scale-110'"
                    @click="openNewProject"
                  >
                    <Plus class="w-4 h-4 text-white/40" />
                  </Button>
                </DialogTrigger>
                <DialogContent class="bg-black/90 backdrop-blur-2xl border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle>{{ editingProjectId ? 'Projekt bearbeiten' : 'Neues Projekt' }}</DialogTitle>
                    <DialogDescription class="text-white/40">
                      Verwalte deine Aufgaben mit Stil.
                    </DialogDescription>
                  </DialogHeader>
                  <div class="space-y-4 py-4">
                    <div class="space-y-2">
                      <label class="text-xs font-semibold text-white/40">TITEL</label>
                      <Input v-model="newProjectTitle" placeholder="Projektname..." class="bg-white/5 border-white/10 h-11" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-xs font-semibold text-white/40">BESCHREIBUNG</label>
                      <Input v-model="newProjectDescription" placeholder="Kurze Info..." class="bg-white/5 border-white/10 h-11" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button class="bg-white text-black hover:bg-white/90 w-full" @click="handleAddProject">{{ editingProjectId ? 'Speichern' : 'Projekt erstellen' }}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div class="space-y-2">
              <button 
                v-for="project in store.projects" 
                :key="project.id"
                class="w-full flex items-center group/item no-drag rounded-lg transition-all duration-300 h-10 px-2 relative"
                :class="[
                  selectedProjectId === project.id 
                    ? 'bg-white/10 text-white shadow-[inset_0_0_1px_rgba(255,255,255,0.2)]' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                ]"
                @click="navigateToProject(project.id)"
              >
                <!-- Project Letter Icon (Always visible) -->
                <div 
                  class="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold border border-white/10 flex-shrink-0 transition-colors"
                  :class="selectedProjectId === project.id ? 'bg-white text-black' : 'bg-white/5'"
                >
                  {{ getFirstLetter(project.title) }}
                </div>
                
                <!-- Project Title (Hidden when minimized) -->
                <span 
                  class="ml-3 text-sm font-medium truncate transition-all duration-300"
                  :class="isSidebarHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'"
                >
                  {{ project.title }}
                </span>

                <!-- Active Indicator -->
                <div 
                  v-if="selectedProjectId === project.id"
                  class="absolute left-0 w-1 h-4 bg-white rounded-r-full"
                ></div>
              </button>
            </div>
          </div>
        </div>
      </ScrollArea>
      
      <div class="p-3 border-t border-white/5 flex flex-col gap-2">
        <Dialog v-model:open="isSettingsOpen">
          <DialogTrigger as-child>
            <button class="flex items-center h-10 px-2 rounded-lg text-white/20 hover:text-white hover:bg-white/5 transition-all no-drag group/settings w-full">
              <Settings class="w-5 h-5 flex-shrink-0" />
              <span 
                class="ml-3 text-sm font-medium transition-all duration-300 whitespace-nowrap"
                :class="isSidebarHovered ? 'opacity-100' : 'opacity-0'"
              >
                Einstellungen
              </span>
            </button>
          </DialogTrigger>
          <DialogContent class="bg-black/95 backdrop-blur-3xl border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle class="text-xl font-black italic uppercase tracking-tighter">Einstellungen</DialogTitle>
              <DialogDescription class="text-white/30 text-xs">Verwalte deine App-Daten und Präferenzen.</DialogDescription>
            </DialogHeader>
            
            <div class="space-y-6 py-6">
              <div class="space-y-4">
                <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Daten-Verwaltung</h3>
                <div class="grid grid-cols-1 gap-3">
                  <Button variant="outline" class="justify-start gap-3 bg-white/5 border-white/10 hover:bg-white/10 text-white h-12 no-drag" @click="handleExport">
                    <Download class="w-4 h-4 text-white/40" />
                    <div class="text-left">
                      <div class="text-sm font-bold">Daten exportieren</div>
                      <div class="text-[10px] text-white/30 uppercase font-medium">Backup als JSON speichern</div>
                    </div>
                  </Button>

                  <div class="relative">
                    <input type="file" ref="importFileRef" class="hidden" accept=".json" @change="handleImport" />
                    <Button variant="outline" class="w-full justify-start gap-3 bg-white/5 border-white/10 hover:bg-white/10 text-white h-12 no-drag" @click="triggerImport">
                      <Upload class="w-4 h-4 text-white/40" />
                      <div class="text-left">
                        <div class="text-sm font-bold">Daten importieren</div>
                        <div class="text-[10px] text-white/30 uppercase font-medium">Aus JSON-Datei wiederherstellen</div>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">System</h3>
                <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <ShieldCheck class="w-5 h-5 text-green-500/50" />
                    <div class="text-[10px] font-black text-white/60 uppercase tracking-wider">Status: Online / Local</div>
                  </div>
                  <span class="text-[10px] font-black text-white/20 italic">v1.0.0</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button class="bg-white text-black hover:bg-white/90 font-black px-8 rounded-full w-full" @click="isSettingsOpen = false">FERTIG</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </aside>

    <!-- Main Content -->
    <main 
      class="flex-1 flex flex-col overflow-hidden transition-all duration-500 ease-in-out"
      :class="[isSidebarHovered ? 'pl-64' : 'pl-16']"
    >
      <!-- Header -->
      <header class="h-20 border-b border-white/5 flex items-end pb-4 justify-between px-8 bg-black relative">
        <div class="absolute inset-0 drag-region pointer-events-none"></div>
        
        <div class="flex items-center gap-6 relative z-10 no-drag">
          <Button v-if="currentView !== 'projects'" variant="ghost" size="icon" class="hover:bg-white/5 rounded-full" @click="goBack">
            <ArrowLeft class="w-5 h-5" />
          </Button>
          <div>
            <h2 class="text-2xl font-black tracking-tighter uppercase italic">
              <template v-if="currentView === 'projects'">Dashboard</template>
              <template v-else-if="currentView === 'project-detail'">{{ currentProject?.title }}</template>
              <template v-else-if="currentView === 'board-detail'">{{ currentBoard?.title }}</template>
            </h2>
          </div>
        </div>
        
        <div v-if="currentView === 'project-detail'" class="relative z-10 no-drag">
          <Dialog v-model:open="isBoardDialogOpen">
            <DialogTrigger as-child>
              <Button class="gap-2 bg-white text-black hover:bg-white/90 font-bold rounded-full px-6" @click="openNewBoard">
                <Plus class="w-4 h-4" />
                NEUES BOARD
              </Button>
            </DialogTrigger>
            <DialogContent class="bg-black/90 backdrop-blur-2xl border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>{{ editingBoardId ? 'BOARD BEARBEITEN' : 'BOARD ERSTELLEN' }}</DialogTitle>
              </DialogHeader>
              <div class="space-y-4 py-4">
                <Input v-model="newBoardTitle" placeholder="Name..." class="bg-white/5 border-white/10 h-12" />
              </div>
              <DialogFooter>
                <Button class="bg-white text-black hover:bg-white/90 w-full" @click="handleAddBoard">{{ editingBoardId ? 'SPEICHERN' : 'ERSTELLEN' }}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <!-- View Container -->
      <div class="flex-1 relative overflow-hidden" :class="currentView !== 'board-detail' && 'overflow-auto p-8'">
        <!-- Projects View -->
        <div v-if="currentView === 'projects'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card 
            v-for="project in store.projects" 
            :key="project.id"
            class="hover:shadow-[0_20px_50px_rgba(255,255,255,0.05)] transition-all cursor-pointer bg-white/[0.03] border-white/5 backdrop-blur-md hover:bg-white/[0.06] hover:scale-[1.02] group border-t-0"
            @click="navigateToProject(project.id)"
          >
            <CardHeader class="pb-4">
              <div class="flex justify-between items-start mb-2">
                <div class="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-lg">
                  {{ getFirstLetter(project.title) }}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child @click.stop>
                    <Button variant="ghost" size="icon" class="h-8 w-8 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical class="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="bg-black/95 backdrop-blur-xl border-white/10 text-white p-2">
                    <DropdownMenuItem @click="openEditProject(project)" class="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-md">
                      <Settings class="w-4 h-4 mr-2 text-white/40" />
                      Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem class="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer rounded-md" @click="store.deleteProject(project.id)">
                      <Trash2 class="w-4 h-4 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardTitle class="text-xl font-black tracking-tight uppercase italic text-white">{{ project.title }}</CardTitle>
              <CardDescription v-if="project.description" class="text-white/30 text-xs mt-2 line-clamp-2 leading-relaxed">
                {{ project.description }}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div class="text-[10px] font-black text-white/10 uppercase tracking-[0.2em] flex items-center gap-2">
                {{ store.getBoardsByProject(project.id).length }} Boards
              </div>
            </CardContent>
          </Card>
          
          <button 
            class="h-auto aspect-square border-2 border-dashed border-white/5 bg-transparent hover:bg-white/[0.02] hover:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all group no-drag"
            @click="isProjectDialogOpen = true"
          >
            <div class="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/20 group-hover:scale-110 transition-transform">
              <Plus class="w-6 h-6" />
            </div>
            <span class="text-white/20 text-xs font-black tracking-[0.2em] uppercase">Neu</span>
          </button>
        </div>

        <!-- Project Detail View (Boards List) -->
        <div v-else-if="currentView === 'project-detail'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card 
            v-for="board in projectBoards" 
            :key="board.id"
            class="hover:shadow-[0_20px_50px_rgba(255,255,255,0.05)] transition-all cursor-pointer aspect-video flex flex-col justify-center items-center relative group bg-white/[0.03] border-white/5 backdrop-blur-md hover:bg-white/[0.06] hover:scale-[1.02]"
            @click="navigateToBoard(board.id)"
          >
            <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger as-child @click.stop>
                  <Button variant="ghost" size="icon" class="h-8 w-8 hover:bg-white/10 text-white/40">
                    <MoreVertical class="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="bg-black/95 backdrop-blur-xl border-white/10 text-white p-2">
                  <DropdownMenuItem @click="openEditBoard(board)" class="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-md">
                    <Settings class="w-4 h-4 mr-2 text-white/40" />
                    Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem class="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer rounded-md" @click="store.deleteBoard(board.id)">
                    <Trash2 class="w-4 h-4 mr-2" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardTitle class="text-xl font-black italic uppercase tracking-tighter text-white/80">{{ board.title }}</CardTitle>
          </Card>
          
          <button 
            class="aspect-video border-2 border-dashed border-white/5 bg-transparent hover:bg-white/[0.02] hover:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all group no-drag"
            @click="isBoardDialogOpen = true"
          >
            <div class="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/20 group-hover:scale-110 transition-transform">
              <Plus class="w-5 h-5" />
            </div>
            <span class="text-white/20 text-xs font-black tracking-[0.2em] uppercase">Board</span>
          </button>
        </div>

        <!-- Board Detail View (Kanban) -->
        <BoardView v-else-if="currentView === 'board-detail' && selectedBoardId" :board-id="selectedBoardId" />
      </div>
    </main>
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
