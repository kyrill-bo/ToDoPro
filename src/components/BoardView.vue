<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTodoStore } from '@/stores/todo'
import draggable from 'vuedraggable'
import { 
  Plus, 
  MoreVertical, 
  Trash2, 
  MessageSquare, 
  Calendar,
  Type,
  AlignLeft,
  GripVertical,
  CheckSquare,
  Tag as TagIcon,
  Check,
  X,
  Clock,
  Palette,
  Terminal,
  Cpu,
  Activity,
  ChevronRight,
  Database,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { VisuallyHidden } from 'reka-ui'
import type { Card as CardType, Tag } from '@/types'

const props = defineProps<{
  boardId: string
}>()

const store = useTodoStore()
const board = computed(() => store.getBoardById(props.boardId))

// UI States
const expandedSection = ref<'checklist' | 'parameters' | 'activity'>('parameters')

// State for adding/editing
const newColumnTitle = ref('')
const isAddingColumn = ref(false)
const newCardTitle = ref<Record<string, string>>({})
const isAddingCard = ref<Record<string, boolean>>({})
const editingColumnId = ref<string | null>(null)
const editingColumnTitle = ref('')

const selectedCard = ref<CardType | null>(null)
const selectedCardColumnId = ref<string | null>(null)
const isCardDetailOpen = ref(false)
const commentText = ref('')
const newChecklistItem = ref('')
const newTagText = ref('')
const selectedTagColor = ref('#ffffff')

// --- AUTO-SAVE ---
watch(isCardDetailOpen, (newVal) => {
  if (!newVal && selectedCard.value && selectedCardColumnId.value) {
    store.updateCard(props.boardId, selectedCardColumnId.value, selectedCard.value.id, selectedCard.value)
  }
})

// --- PANNING ---
const viewportRef = ref<HTMLElement | null>(null)
const isPanning = ref(false)
const startX = ref(0)
const scrollLeftStart = ref(0)

const onMouseDown = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.closest('button') || target.closest('input') || target.closest('textarea') || target.closest('.card-item') || target.closest('.column-handle') || target.closest('.dropdown-trigger')) return
  if (viewportRef.value) {
    isPanning.value = true
    startX.value = e.pageX - viewportRef.value.offsetLeft
    scrollLeftStart.value = viewportRef.value.scrollLeft
    viewportRef.value.style.cursor = 'grabbing'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopPanning)
  }
}

const onMouseMove = (e: MouseEvent) => {
  if (!isPanning.value || !viewportRef.value) return
  e.preventDefault()
  const x = e.pageX - viewportRef.value.offsetLeft
  const walk = (x - startX.value) * 1.5 
  viewportRef.value.scrollLeft = scrollLeftStart.value - walk
}

const stopPanning = () => {
  isPanning.value = false
  if (viewportRef.value) viewportRef.value.style.cursor = 'grab'
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', stopPanning)
}

// Actions
const handleAddColumn = () => {
  if (!newColumnTitle.value) return
  store.addColumn(props.boardId, newColumnTitle.value)
  newColumnTitle.value = ''
  isAddingColumn.value = false
}

const handleAddCard = (columnId: string) => {
  const title = newCardTitle.value[columnId]
  if (!title) return
  store.addCard(props.boardId, columnId, title)
  newCardTitle.value[columnId] = ''
  isAddingCard.value[columnId] = false
}

const saveColumnTitle = (columnId: string) => {
  if (editingColumnTitle.value) store.updateColumn(props.boardId, columnId, editingColumnTitle.value)
  editingColumnId.value = null
}

const openCardDetail = (card: CardType, columnId: string) => {
  selectedCard.value = JSON.parse(JSON.stringify(card))
  selectedCardColumnId.value = columnId
  isCardDetailOpen.value = true
}

const handleAddComment = () => {
  if (commentText.value && selectedCard.value && selectedCardColumnId.value) {
    store.addComment(props.boardId, selectedCardColumnId.value, selectedCard.value.id, commentText.value)
    selectedCard.value.comments.push({ id: crypto.randomUUID(), text: commentText.value, createdAt: Date.now() })
    commentText.value = ''
  }
}

const addChecklistItem = () => {
  if (newChecklistItem.value && selectedCard.value) {
    selectedCard.value.checklists.push({ id: crypto.randomUUID(), text: newChecklistItem.value, completed: false })
    newChecklistItem.value = ''
  }
}

const removeChecklistItem = (id: string) => {
  if (selectedCard.value) selectedCard.value.checklists = selectedCard.value.checklists.filter(i => i.id !== id)
}

const addTag = () => {
  if (newTagText.value && selectedCard.value) {
    selectedCard.value.tags.push({ id: crypto.randomUUID(), text: newTagText.value, color: selectedTagColor.value })
    newTagText.value = ''
  }
}

const getChecklistProgress = (card: CardType) => {
  if (!card.checklists?.length) return null
  const completed = card.checklists.filter(i => i.completed).length
  return { completed, total: card.checklists.length }
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const colors = [
  { name: 'None', value: 'transparent' },
  { name: 'White', value: '#ffffff' },
  { name: 'Blue', value: '#0ea5e9' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Green', value: '#10b981' },
  { name: 'Red', value: '#ef4444' },
]

const tagColors = ['#ffffff', '#0ea5e9', '#a855f7', '#10b981', '#ef4444', '#f59e0b']

const vFocus = {
  mounted: (el: HTMLElement) => {
    const input = el.tagName === 'INPUT' ? el : el.querySelector('input')
    input?.focus()
  }
}

const toggleSection = (section: 'checklist' | 'parameters' | 'activity') => {
  expandedSection.value = expandedSection.value === section ? section : section
}
</script>

<template>
  <div v-if="board" class="h-full w-full relative overflow-hidden flex flex-col">
    <div ref="viewportRef" class="flex-1 overflow-x-auto overflow-y-hidden cursor-grab select-none" @mousedown="onMouseDown">
      <div class="flex items-start h-full p-8 min-w-full w-max gap-10">
        <draggable v-model="board.columns" group="columns" item-key="id" handle=".column-handle" class="flex gap-10 h-full items-start" ghost-class="opacity-50">
          <template #item="{ element: column }">
            <div class="w-80 flex-shrink-0 flex flex-col bg-white/[0.05] border-x border-white/20 h-full relative group/rail">
              <div class="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
                <div class="h-full bg-white transition-all duration-700 ease-out" :style="{ width: Math.min(100, (column.cards.length / 10) * 100) + '%' }"></div>
              </div>
              <div class="p-6 flex items-start justify-between column-handle cursor-grab active:cursor-grabbing">
                <div class="space-y-1 flex-1 min-w-0">
                  <div class="flex items-center gap-2"><Database class="w-3 h-3 text-white/20" /><span class="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Sector_{{ column.id.slice(0,2).toUpperCase() }}</span></div>
                  <Input v-if="editingColumnId === column.id" v-model="editingColumnTitle" v-focus class="h-8 bg-white/5 border-white/20 text-sm font-black italic uppercase" @blur="saveColumnTitle(column.id)" @keyup.enter="saveColumnTitle(column.id)" @mousedown.stop />
                  <h3 v-else class="text-xl font-black italic uppercase tracking-tighter truncate cursor-pointer hover:text-white transition-colors" @mousedown.stop @click="editingColumnId = column.id; editingColumnTitle = column.title">{{ column.title }}</h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child class="dropdown-trigger"><Button variant="ghost" size="icon" class="h-8 w-8 hover:bg-white/10 text-white/20 no-drag" @mousedown.stop><MoreVertical class="w-4 h-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="bg-black/95 backdrop-blur-xl border-white/10 text-white p-2">
                    <DropdownMenuItem class="hover:bg-white/10 focus:bg-white/10 cursor-pointer rounded-md no-drag font-bold text-[10px] uppercase tracking-widest" @click="editingColumnId = column.id; editingColumnTitle = column.title"><Type class="w-4 h-4 mr-2" /> Umbenennen</DropdownMenuItem>
                    <DropdownMenuItem class="text-red-500 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer rounded-md no-drag font-bold text-[10px] uppercase tracking-widest" @click="store.deleteColumn(boardId, column.id)"><Trash2 class="w-4 h-4 mr-2" /> Löschen</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <ScrollArea class="flex-1 px-4 py-2">
                <draggable v-model="column.cards" group="cards" item-key="id" class="space-y-6 min-h-[200px] pb-10" ghost-class="opacity-10">
                  <template #item="{ element: card }">
                    <div class="card-item group relative transition-all cursor-pointer overflow-hidden border-t border-white/20 bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/40 active:scale-[0.98] pointer-events-auto p-5 space-y-4 shadow-lg" @click="openCardDetail(card, column.id)">
                      <div v-if="getChecklistProgress(card)" class="absolute top-0 left-0 w-full h-[1px] bg-white/5 overflow-hidden">
                        <div class="h-full bg-white opacity-60" :style="{ width: (getChecklistProgress(card)!.completed / getChecklistProgress(card)!.total * 100) + '%' }"></div>
                      </div>
                      <div class="flex flex-wrap gap-1.5">
                        <div v-for="tag in card.tags" :key="tag.id" class="px-2 py-0.5 rounded-[2px] text-[7px] font-black uppercase tracking-tighter border" :style="{ borderColor: tag.color + '40', color: tag.color, backgroundColor: tag.color + '10' }">{{ tag.text }}</div>
                      </div>
                      <p class="text-sm font-black italic uppercase leading-tight text-white/70 group-hover:text-white transition-colors tracking-tight">{{ card.title }}</p>
                      <div class="flex items-center justify-between text-[9px] font-black text-white/20 uppercase tracking-widest pt-2">
                        <div class="flex items-center gap-3">
                          <div v-if="card.dueDate" class="flex items-center gap-1"><Calendar class="w-2.5 h-2.5" />{{ card.dueDate }}</div>
                          <div v-if="card.comments?.length" class="flex items-center gap-1"><MessageSquare class="w-2.5 h-2.5" />{{ card.comments.length }}</div>
                        </div>
                        <div v-if="getChecklistProgress(card)" class="text-white/40">{{ getChecklistProgress(card)?.completed }}/{{ getChecklistProgress(card)?.total }}</div>
                      </div>
                      <div class="absolute left-0 top-0 w-[2px] h-full" :style="{ backgroundColor: card.color !== 'transparent' ? card.color : 'transparent' }"></div>
                    </div>
                  </template>
                </draggable>
              </ScrollArea>
              <div class="p-4 border-t border-white/10 bg-black/20">
                <div v-if="isAddingCard[column.id]" class="space-y-3 p-2 bg-white/[0.02] rounded-xl border border-white/20 animate-in fade-in slide-in-from-bottom-2">
                  <Input v-model="newCardTitle[column.id]" v-focus placeholder="Initialize data..." class="bg-transparent border-none text-sm h-8 focus-visible:ring-0 font-mono" @keyup.enter="handleAddCard(column.id)" @mousedown.stop />
                  <div class="flex gap-2">
                    <Button size="sm" class="bg-white text-black font-black text-[10px] flex-1" @click="handleAddCard(column.id)">APPEND</Button>
                    <Button size="sm" variant="ghost" class="text-white/20 text-[10px]" @click="isAddingCard[column.id] = false">X</Button>
                  </div>
                </div>
                <button v-else class="w-full h-10 flex items-center justify-center gap-3 text-white/10 hover:text-white/40 hover:bg-white/[0.02] transition-all no-drag border border-dashed border-white/10 rounded-xl group/add" @click="isAddingCard[column.id] = true"><Plus class="w-4 h-4 group-hover/add:rotate-90 transition-transform" /><span class="text-[9px] font-black uppercase tracking-[0.3em]">Add_Entry</span></button>
              </div>
            </div>
          </template>
        </draggable>

        <div class="w-80 flex-shrink-0 h-full">
          <div v-if="isAddingColumn" class="bg-white/[0.03] border border-white/20 backdrop-blur-xl p-8 rounded-2xl space-y-6 animate-in zoom-in-95" @mousedown.stop>
            <div class="space-y-2"><span class="text-[8px] font-black text-white/20 uppercase tracking-widest">New_Sector_Link</span><Input v-model="newColumnTitle" v-focus placeholder="Enter Sector Name..." class="bg-white/5 border-white/20 h-12 text-xl font-black italic uppercase" @keyup.enter="handleAddColumn" /></div>
            <div class="flex gap-3"><Button class="bg-white text-black hover:bg-white/90 font-black flex-1 h-12 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]" @click="handleAddColumn">INITIALIZE</Button><Button variant="ghost" class="text-white/20 text-[10px] font-bold" @click="isAddingColumn = false">VOID</Button></div>
          </div>
          <button v-else class="w-full h-full border-x border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all no-drag flex flex-col items-center justify-center gap-6 group/ghost" @click="isAddingColumn = true"><div class="relative w-16 h-16 flex items-center justify-center"><div class="absolute inset-0 rounded-full border border-dashed border-white/10 group-hover/ghost:rotate-90 transition-transform duration-1000"></div><Plus class="w-6 h-6 text-white/5 group-hover/ghost:text-white/40 transition-colors" /></div><div class="flex flex-col items-center gap-1"><span class="text-[9px] font-black uppercase tracking-[0.4em] text-white/5 group-hover/ghost:text-white/20 transition-all">Ready_to_Link</span><span class="text-[11px] font-black uppercase italic tracking-tighter text-white/5 group-hover/ghost:text-white/10 transition-all">Append_New_Rail</span></div></button>
        </div>
      </div>
    </div>

    <!-- CLEAN COMMAND CONSOLE CARD DETAIL -->
    <Dialog v-model:open="isCardDetailOpen">
      <DialogContent hide-close class="max-w-5xl h-[80vh] bg-[#080808] border border-white/20 text-white p-0 overflow-hidden z-[1000] flex flex-col rounded-3xl shadow-[0_0_100px_rgba(0,0,0,1)]">
        <VisuallyHidden>
          <DialogTitle>{{ selectedCard?.title }}</DialogTitle>
          <DialogDescription>Central Command Console</DialogDescription>
        </VisuallyHidden>

        <div v-if="selectedCard" class="flex flex-col h-full">
          <!-- Top Global Bar -->
          <div class="h-16 border-b border-white/10 bg-white/[0.02] flex items-center px-8 justify-between">
            <div class="flex items-center gap-4">
              <div class="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-black text-[10px]">CC</div>
              <div class="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Command_Console // v1.0</div>
            </div>
            <button class="p-2 rounded-full hover:bg-white/5 text-white/20 hover:text-white transition-all no-drag" @click="isCardDetailOpen = false"><X class="w-5 h-5" /></button>
          </div>

          <div class="flex-1 flex overflow-hidden">
            <!-- LEFT: CORE CONSOLE (Description & Title) -->
            <div class="flex-1 flex flex-col border-r border-white/10">
              <div class="p-10 space-y-10">
                <div class="space-y-2">
                  <span class="text-[10px] font-black text-white/20 uppercase tracking-widest">Entry_Identifier</span>
                  <Input v-model="selectedCard.title" v-focus class="text-4xl font-black italic uppercase bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-white tracking-tighter w-full" />
                </div>

                <div class="space-y-4">
                  <div class="flex items-center gap-2 text-[10px] font-black text-white/20 tracking-[0.4em]"><Terminal class="w-3 h-3" /> // DATA_CONTENT</div>
                  <textarea v-model="selectedCard.description" placeholder="Input data..." class="w-full min-h-[300px] bg-white/[0.02] border border-white/5 p-6 rounded-2xl text-lg text-white/80 focus:border-white/20 outline-none transition-all resize-none font-mono"></textarea>
                </div>
              </div>
            </div>

            <!-- RIGHT: SERVICE MODULES (Collapsible) -->
            <div class="w-[400px] flex flex-col bg-white/[0.01]">
              <!-- Module: Parameters (Tags, Color, Date) -->
              <div class="border-b border-white/10 transition-all" :class="expandedSection === 'parameters' ? 'flex-1' : 'h-14'">
                <button @click="toggleSection('parameters')" class="w-full h-14 px-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div class="flex items-center gap-3">
                    <Cpu class="w-4 h-4 text-white/40" />
                    <span class="text-[10px] font-black uppercase tracking-[0.2em]">Parameters</span>
                  </div>
                  <div v-if="expandedSection !== 'parameters'" class="text-[9px] font-bold text-white/20 uppercase italic">
                    {{ selectedCard.tags.length }} Tags // {{ selectedCard.color !== 'transparent' ? 'Colored' : 'Default' }}
                  </div>
                  <component :is="expandedSection === 'parameters' ? ChevronUp : ChevronDown" class="w-4 h-4 text-white/20" />
                </button>
                <div v-if="expandedSection === 'parameters'" class="p-8 space-y-8 animate-in fade-in duration-300">
                  <div class="space-y-4">
                    <div class="text-[9px] font-black text-white/20 uppercase tracking-widest">Identifiers</div>
                    <div class="flex flex-wrap gap-2">
                      <div v-for="tag in selectedCard.tags" :key="tag.id" class="px-2 py-1 rounded border border-white/10 text-[9px] font-black uppercase" :style="{ color: tag.color }">{{ tag.text }}</div>
                      <button @click="newTagText = ''; addTag()" class="h-6 px-3 rounded border border-dashed border-white/10 text-white/20 text-[9px] hover:text-white">+</button>
                    </div>
                  </div>
                  <div class="space-y-4">
                    <div class="text-[9px] font-black text-white/20 uppercase tracking-widest">Spectrum</div>
                    <div class="flex gap-2">
                      <button v-for="color in colors" :key="color.value" @click="selectedCard.color = color.value" class="w-6 h-6 rounded-md border border-white/10" :style="{ backgroundColor: color.value === 'transparent' ? '#111' : color.value }" :class="selectedCard.color === color.value ? 'ring-1 ring-white ring-offset-2 ring-offset-black' : ''"></button>
                    </div>
                  </div>
                  <div class="space-y-4">
                    <div class="text-[9px] font-black text-white/20 uppercase tracking-widest">Timeline</div>
                    <Input type="date" v-model="selectedCard.dueDate" class="h-10 bg-white/5 border-white/10 text-white font-mono text-[10px]" />
                  </div>
                </div>
              </div>

              <!-- Module: Checklist -->
              <div class="border-b border-white/10 transition-all" :class="expandedSection === 'checklist' ? 'flex-1' : 'h-14'">
                <button @click="toggleSection('checklist')" class="w-full h-14 px-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div class="flex items-center gap-3">
                    <CheckSquare class="w-4 h-4 text-white/40" />
                    <span class="text-[10px] font-black uppercase tracking-[0.2em]">Checklist</span>
                  </div>
                  <div v-if="expandedSection !== 'checklist' && getChecklistProgress(selectedCard)" class="text-[9px] font-bold text-white/20 uppercase italic">
                    {{ getChecklistProgress(selectedCard)?.completed }}/{{ getChecklistProgress(selectedCard)?.total }} Sync
                  </div>
                  <component :is="expandedSection === 'checklist' ? ChevronUp : ChevronDown" class="w-4 h-4 text-white/20" />
                </button>
                <ScrollArea v-if="expandedSection === 'checklist'" class="h-[calc(100%-3.5rem)] p-8">
                  <div class="space-y-4">
                    <div v-for="item in selectedCard.checklists" :key="item.id" class="flex items-center gap-4 group/item">
                      <button @click="item.completed = !item.completed" class="w-5 h-5 rounded border border-white/10 flex items-center justify-center transition-all" :class="item.completed ? 'bg-white text-black' : 'bg-white/5'"><Check v-if="item.completed" class="w-3 h-3" /></button>
                      <input v-model="item.text" class="flex-1 bg-transparent border-none text-sm outline-none" :class="item.completed ? 'text-white/20 line-through' : 'text-white/80'" />
                    </div>
                    <Input v-model="newChecklistItem" placeholder="Append sub-process..." class="bg-white/5 border-white/10 h-10 text-xs" @keyup.enter="addChecklistItem" />
                  </div>
                </ScrollArea>
              </div>

              <!-- Module: Activity -->
              <div class="transition-all" :class="expandedSection === 'activity' ? 'flex-1' : 'h-14'">
                <button @click="toggleSection('activity')" class="w-full h-14 px-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div class="flex items-center gap-3">
                    <Activity class="w-4 h-4 text-white/40" />
                    <span class="text-[10px] font-black uppercase tracking-[0.2em]">Neural Feed</span>
                  </div>
                  <div v-if="expandedSection !== 'activity'" class="text-[9px] font-bold text-white/20 uppercase italic">
                    {{ selectedCard.comments.length }} Entries
                  </div>
                  <component :is="expandedSection === 'activity' ? ChevronUp : ChevronDown" class="w-4 h-4 text-white/20" />
                </button>
                <div v-if="expandedSection === 'activity'" class="h-[calc(100%-3.5rem)] flex flex-col">
                  <ScrollArea class="flex-1 p-6">
                    <div class="space-y-6">
                      <div v-for="comment in [...selectedCard.comments].reverse()" :key="comment.id" class="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                        <div class="flex items-center justify-between text-[8px] font-mono text-white/20"><span>UID: {{ comment.id.slice(0,4) }}</span><span>{{ formatDate(comment.createdAt) }}</span></div>
                        <p class="text-xs text-white/60 font-mono">{{ comment.text }}</p>
                      </div>
                    </div>
                  </ScrollArea>
                  <div class="p-6 border-t border-white/10 bg-white/[0.01]">
                    <Input v-model="commentText" placeholder="Inject log..." class="bg-white/5 border-white/10 h-10 text-xs font-mono" @keyup.enter="handleAddComment" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Control Bar -->
          <div class="h-16 border-t border-white/10 bg-white/[0.02] flex items-center px-8 justify-between">
            <Button variant="ghost" class="text-red-500 hover:bg-red-500/10 font-black text-[9px] tracking-widest" @click="store.deleteCard(boardId, selectedCardColumnId!, selectedCard.id); isCardDetailOpen = false">
              TERMINATE_DATA_BLOCK
            </Button>
            <Button class="bg-white text-black hover:bg-white/90 font-black px-10 rounded-full h-10 text-[10px]" @click="isCardDetailOpen = false">
              SAVE_AND_EXIT
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
:deep([data-radix-scroll-area-viewport]) {
  display: block !important;
}

.board-viewport {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.board-viewport::-webkit-scrollbar {
  display: none;
}

textarea {
  resize: none;
}
</style>
